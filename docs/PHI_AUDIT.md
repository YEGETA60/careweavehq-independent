# PHI Audit Log

All access to and changes of Protected Health Information (PHI) are recorded
in the append-only `public.phi_audit_logs` table.

## Guarantees

- **Append-only**: `BEFORE UPDATE/DELETE` triggers raise an exception. Rows
  cannot be modified or removed by application code, service-role keys, or
  any role except the database superuser running an explicit migration.
- **Backend-only writes**: RLS exposes no INSERT/UPDATE/DELETE policy. The
  only way to write is the `SECURITY DEFINER` RPC `log_phi_event` or the
  `audit_phi_changes()` trigger.
- **Admin-only reads**: `SELECT` is gated by `has_role(auth.uid(),'admin')`.
- **Retention**: 10 years (see `data_retention_policies` entries seeded for
  each company).

## What's captured

| Column | Notes |
|---|---|
| `actor_user_id`, `actor_roles[]` | Snapshot at event time |
| `company_id` | Multi-tenant scoping |
| `action` | `read`, `list`, `create`, `update`, `delete`, `export`, `print`, `clock_in/out`, `sign`, … |
| `entity`, `entity_id` | Target row |
| `field_changed`, `before_value`, `after_value` | Granular diff on updates |
| `ip`, `user_agent`, `request_id` | Pulled from request headers |
| `source` | `web` / `mobile` / `edge_function` / `trigger` / `cron` |
| `reason` | HIPAA "purpose of use" — `treatment`, `payment`, `operations`, … |

## How to write an entry

**Frontend / React** — always go through `src/lib/phiAudit.ts`:

```ts
import { auditPhi } from "@/lib/phiAudit";

await auditPhi({
  action: "read",
  entity: "client",
  entityId: client.id,
  reason: "treatment",
});
```

**Edge functions** — use the shared helper:

```ts
import { auditPhiEdge } from "../_shared/phi-audit.ts";
await auditPhiEdge({ req }, { action: "export", entity: "claim", entityId });
```

**Writes (create/update/delete)** are captured automatically by the
`audit_phi_changes()` trigger attached to every PHI table — you do **not**
need to call `auditPhi()` for ordinary CRUD. Call it for reads, exports,
prints, and domain actions (clock in/out, signing, impersonation) the
trigger can't see.

## Tables covered by the auto-write trigger

`clients`, `caregivers`, `visits`, `intakes`, `credentials`, `invoices`,
`claims`, `claim_lines`, `authorizations`, `timesheets`,
`timesheet_signatures`, `messages`, `message_attachments`,
`employment_records`.

Add new PHI tables to the `phi_tables` array in the migration and re-run.

## Legacy tables

`audit_log`, `phi_access_log`, and `entity_audit_log` are deprecated.
Existing rows were backfilled into `phi_audit_logs`. The `logAudit()`
helper in `src/lib/audit.ts` now shims through to `auditPhi()`.