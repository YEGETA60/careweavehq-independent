import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon } from "lucide-react";
import { setCachedCompany } from "@/hooks/useCompany";

interface Props {
  companyId: string;
  currentLogoUrl?: string | null;
  disabled?: boolean;
  onUploaded?: (url: string) => void;
}

export function CompanyLogoUploader({ companyId, currentLogoUrl, disabled, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Logo must be under 4 MB", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${companyId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("company-logos")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await (supabase as any).from("companies").update({ logo_url: url }).eq("id", companyId);
      if (updErr) throw updErr;
      // Refresh cached company info
      const { data: c } = await (supabase as any)
        .from("companies")
        .select("id,legal_name,display_name,email,phone,website,address_line1,address_line2,city,state,postal_code,country,logo_url,timezone")
        .eq("id", companyId).maybeSingle();
      if (c) setCachedCompany(c);
      toast({ title: "Logo updated" });
      onUploaded?.(url);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Company Logo</Label>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
          {currentLogoUrl ? (
            <img src={currentLogoUrl} alt="Company logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <input
            id="company-logo-input"
            type="file"
            accept="image/*"
            disabled={disabled || busy}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
          />
          <Button type="button" variant="outline" size="sm" disabled={disabled || busy}
            onClick={() => document.getElementById("company-logo-input")?.click()}>
            <Upload className="h-4 w-4 mr-2" />{busy ? "Uploading…" : currentLogoUrl ? "Replace logo" : "Upload logo"}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or SVG · used on invoices and printed documents</p>
        </div>
      </div>
    </div>
  );
}