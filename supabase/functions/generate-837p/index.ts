// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildSubmission } from "../_shared/edi/builder.ts";
import { validateSubmission } from "../_shared/edi/validator.ts";
import type { ClaimInput, SubmissionInput } from "../_shared/edi/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json() as {
      claim_ids: string[];
      receiver_id?: string;
      receiver_name?: string;
      mode?: "validate" | "generate";
      commit?: boolean;
      regenerate_from?: string; // submission id being regenerated
      force_test_mode?: boolean; // override company setting (used by auto-resend)
    };
    let claimIds = Array.isArray(body.claim_ids) ? body.claim_ids : [];

    // If regenerating from a previous submission, pull its claim ids
    if (body.regenerate_from && (!claimIds.length)) {
      const { data: prevLinks } = await sb.from("claim_submission_claims")
        .select("claim_id").eq("submission_id", body.regenerate_from);
      claimIds = (prevLinks ?? []).map((r: any) => r.claim_id);
    }
    if (!claimIds.length) return json({ error: "claim_ids required" }, 400);
    const mode = body.mode ?? "generate";

    // Resolve company
    const { data: prof } = await sb.from("profiles").select("default_company_id").maybeSingle();
    const company_id = prof?.default_company_id;
    if (!company_id) return json({ error: "No default company" }, 400);

    const { data: company } = await sb.from("companies").select("*").eq("id", company_id).maybeSingle();
    if (!company) return json({ error: "Company not found" }, 404);

    // Pull claims + related data
    const { data: claims, error: cErr } = await sb
      .from("claims")
      .select("*")
      .in("id", claimIds)
      .eq("company_id", company_id);
    if (cErr) throw cErr;
    if (!claims?.length) return json({ error: "No claims found" }, 404);

    const clientIds = [...new Set(claims.map((c: any) => c.client_id))];
    const payerIds = [...new Set(claims.map((c: any) => c.payer_id).filter(Boolean))];
    const cgIds = [...new Set(claims.map((c: any) => c.rendering_caregiver_id).filter(Boolean))];

    const [{ data: clients }, { data: payers }, { data: lines }, { data: diags }, { data: caregivers }, { data: auths }] =
      await Promise.all([
        sb.from("clients").select("*").in("id", clientIds),
        payerIds.length ? sb.from("payers").select("*").in("id", payerIds) : Promise.resolve({ data: [] as any[] }),
        sb.from("claim_lines").select("*").in("claim_id", claimIds),
        sb.from("claim_diagnoses").select("*").in("claim_id", claimIds),
        cgIds.length ? sb.from("caregivers").select("*").in("id", cgIds) : Promise.resolve({ data: [] as any[] }),
        sb.from("authorizations").select("*").in("id", claims.map((c: any) => c.authorization_id).filter(Boolean)),
      ]);

    const byClient = new Map((clients ?? []).map((c: any) => [c.id, c]));
    const byPayer = new Map((payers ?? []).map((p: any) => [p.id, p]));
    const byCg = new Map((caregivers ?? []).map((c: any) => [c.id, c]));
    const linesByClaim = new Map<string, any[]>();
    (lines ?? []).forEach((l: any) => {
      if (!linesByClaim.has(l.claim_id)) linesByClaim.set(l.claim_id, []);
      linesByClaim.get(l.claim_id)!.push(l);
    });
    const diagByClaim = new Map<string, any[]>();
    (diags ?? []).forEach((d: any) => {
      if (!diagByClaim.has(d.claim_id)) diagByClaim.set(d.claim_id, []);
      diagByClaim.get(d.claim_id)!.push(d);
    });
    const authById = new Map((auths ?? []).map((a: any) => [a.id, a]));

    // Build SubmissionInput
    const submission: SubmissionInput = {
      billing_provider: {
        legal_name: company.legal_name,
        npi: company.npi || "",
        tax_id: (company.tax_id || "").replace(/\D/g, ""),
        tax_id_type: company.tax_id_type || "EI",
        taxonomy_code: company.taxonomy_code || undefined,
        address_line1: company.pay_to_address_line1 || company.address_line1 || "",
        address_line2: company.pay_to_address_line2 || company.address_line2 || "",
        city: company.pay_to_city || company.city || "",
        state: company.pay_to_state || company.state || "",
        postal_code: company.pay_to_postal_code || company.postal_code || "",
        contact_name: company.contact_name || undefined,
        phone: company.phone || undefined,
        edi_submitter_id: company.edi_submitter_id || "SUBMITTER01",
      },
      receiver_id: body.receiver_id || "RECEIVER01",
      receiver_name: body.receiver_name || "CLEARINGHOUSE",
      test_mode: body.force_test_mode === true || body.regenerate_from ? true : company.edi_test_mode !== false,
      claims: claims.map((c: any): ClaimInput => {
        const cl = byClient.get(c.client_id) || {} as any;
        const py = byPayer.get(c.payer_id) || {} as any;
        const auth = c.authorization_id ? authById.get(c.authorization_id) : null;
        const cg = c.rendering_caregiver_id ? byCg.get(c.rendering_caregiver_id) : null;
        const claimLines = (linesByClaim.get(c.id) || []).sort((a, b) => (a.service_date || "").localeCompare(b.service_date || ""));
        const claimDx = (diagByClaim.get(c.id) || []).sort((a, b) => a.rank - b.rank);
        const sub_first = cl.subscriber_first_name || cl.first_name || (cl.name || "").split(" ").slice(0, -1).join(" ") || cl.name || "";
        const sub_last = cl.subscriber_last_name || cl.last_name || (cl.name || "").split(" ").slice(-1)[0] || "";
        return {
          claim_id: c.claim_number || c.id.slice(0, 12),
          total_charge: Number(c.total_charge || 0),
          pos_code: c.pos_code || "12",
          frequency_code: c.frequency_code || "1",
          provider_signature_indicator: c.provider_signature_indicator || "Y",
          assignment_indicator: c.assignment_indicator || "A",
          release_of_info_code: c.release_of_info_code || "Y",
          benefits_assignment_indicator: c.benefits_assignment_indicator || "Y",
          service_start: c.service_start,
          service_end: c.service_end,
          surprise_billing_nte: c.surprise_billing_nte || undefined,
          prior_auth: auth?.auth_number || undefined,
          referral: auth?.referral_number || undefined,
          prior_payer_paid: Number(c.prior_payer_paid || 0),
          payer: {
            name: py.name || "",
            payer_id_electronic: py.payer_id_electronic || py.payer_id_external || "",
            claim_filing_indicator: py.claim_filing_indicator || "CI",
          },
          subscriber: {
            first_name: cl.subscriber_first_name || sub_first,
            last_name: cl.subscriber_last_name || sub_last,
            member_id: cl.subscriber_member_id || cl.member_id || "",
            dob: cl.subscriber_dob || cl.dob || undefined,
            gender: (cl.subscriber_gender || cl.gender || "U").toString().toUpperCase().slice(0, 1),
            address_line1: cl.address_line1 || cl.address || "",
            city: cl.city || "",
            state: cl.state || "",
            postal_code: cl.postal_code || "",
            relationship_to_patient: cl.subscriber_relationship || "18",
          },
          patient: cl.subscriber_relationship && cl.subscriber_relationship !== "18" ? {
            first_name: cl.first_name || sub_first,
            last_name: cl.last_name || sub_last,
            dob: cl.dob || "",
            gender: (cl.gender || "U").toString().toUpperCase().slice(0, 1),
            address_line1: cl.address_line1 || cl.address || "",
            city: cl.city || "",
            state: cl.state || "",
            postal_code: cl.postal_code || "",
          } : undefined,
          rendering_provider: cg ? {
            first_name: (cg.name || "").split(" ").slice(0, -1).join(" ") || cg.name || "",
            last_name: (cg.name || "").split(" ").slice(-1)[0] || "",
            npi: cg.npi || "",
            taxonomy_code: cg.taxonomy_code || undefined,
          } : undefined,
          diagnoses: claimDx.map((d: any) => ({ rank: d.rank, icd10_code: d.icd10_code, poa: d.poa_indicator || undefined })),
          service_lines: claimLines.map((l: any) => ({
            service_date: l.service_date,
            service_code: l.service_code,
            modifiers: [l.modifier, l.modifier_2, l.modifier_3, l.modifier_4].filter(Boolean) as string[],
            pos_code: l.pos_code || "12",
            unit_type: l.unit_type || "UN",
            units: Number(l.units || 0),
            charge: Number(l.charge || 0),
            diagnosis_pointers: l.diagnosis_pointers || "1",
            line_note: l.line_note || undefined,
          })),
        };
      }),
    };

    const report = validateSubmission(submission);
    if (mode === "validate") {
      return json({ ok: report.ok, validation: report });
    }
    if (!report.ok && body.commit !== false) {
      return json({ ok: false, validation: report, error: "Validation failed; fix issues or set commit=false to preview" }, 422);
    }

    const built = buildSubmission(submission);
    const fileName = `837P_${ymd()}_${built.isa_control_number}.txt`;
    const objectPath = `${company_id}/${fileName}`;

    // Compute the expected acknowledgment shape from the validation result.
    // In TEST mode, this is the source of truth we'll diff against the 999 / 277CA returned by the clearinghouse.
    const expected_ack = {
      version: 1,
      generated_at: new Date().toISOString(),
      "999": {
        expected_status: report.ok ? "accepted" : "rejected",
        ak9: report.ok ? "A" : "R",
        expected_error_codes: report.issues?.filter((i: any) => i.level >= 3).map((i: any) => i.code).filter(Boolean) ?? [],
      },
      "277CA": {
        expected_status: report.ok ? "accepted" : "rejected",
        expected_claim_acceptance: claims.map((c: any) => ({
          claim_number: c.claim_number,
          expected: report.ok ? "A1" : "A7",
        })),
      },
      "835": {
        expected_total_billed: claims.reduce((s: number, c: any) => s + Number(c.total_charge || 0), 0),
      },
    };

    // Resolve regeneration count
    let regeneration_count = 0;
    if (body.regenerate_from) {
      const { data: parent } = await sb.from("claim_submissions").select("regeneration_count").eq("id", body.regenerate_from).maybeSingle();
      regeneration_count = (parent?.regeneration_count ?? 0) + 1;
    }

    // Upload to private storage
    const upload = await sb.storage.from("claim-files").upload(objectPath, new Blob([built.edi], { type: "text/plain" }), {
      upsert: true, contentType: "text/plain",
    });
    if (upload.error) console.warn("storage upload error:", upload.error.message);

    // Audit row
    const { data: subRow } = await sb.from("claim_submissions").insert({
      company_id,
      file_name: fileName,
      storage_path: upload.error ? null : objectPath,
      isa_control_number: built.isa_control_number,
      gs_control_number: built.gs_control_number,
      st_control_number: built.st_control_number,
      claim_count: claims.length,
      total_charge: claims.reduce((s: number, c: any) => s + Number(c.total_charge || 0), 0),
      test_mode: submission.test_mode,
      status: "generated",
      validation_report: report as any,
      generated_by: userRes.user.id,
      parent_submission_id: body.regenerate_from ?? null,
      regeneration_count,
      expected_ack,
      parity_status: submission.test_mode ? "pending" : null,
    }).select("id").single();

    if (subRow?.id) {
      await sb.from("claim_submission_claims").insert(
        claims.map((c: any) => ({ submission_id: subRow.id, claim_id: c.id, company_id })),
      );
      await sb.from("claims").update({ status: "submitted", submission_date: new Date().toISOString().slice(0, 10) }).in("id", claims.map((c: any) => c.id));
    }

    // Signed URL for download
    let signedUrl: string | null = null;
    if (!upload.error) {
      const sgn = await sb.storage.from("claim-files").createSignedUrl(objectPath, 60 * 60);
      signedUrl = sgn.data?.signedUrl ?? null;
    }

    return json({
      ok: true,
      submission_id: subRow?.id,
      file_name: fileName,
      isa_control_number: built.isa_control_number,
      validation: report,
      edi: built.edi,
      signed_url: signedUrl,
      test_mode: submission.test_mode,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function ymd(d: Date = new Date()) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}