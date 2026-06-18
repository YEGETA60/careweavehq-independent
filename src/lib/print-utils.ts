import { auditPhi } from "@/lib/phiAudit";

interface PrintAuditOpts { entity?: string; entityId?: string }

const asAuditOpts = (v: unknown): PrintAuditOpts | undefined => {
  if (v && typeof v === "object" && "entity" in (v as Record<string, unknown>)) {
    return v as PrintAuditOpts;
  }
  return undefined;
};

export const printElement = (elementId: string, audit?: unknown) => {
  const opts = asAuditOpts(audit);
  if (opts?.entity) auditPhi({ action: "print", entity: opts.entity, entityId: opts.entityId });
  const printContent = document.getElementById(elementId);
  if (!printContent) return;

  const printWindow = window.open('', '', 'width=800,height=600');
  if (!printWindow) return;

  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  // Build the shell with only trusted CSS, then clone the source DOM
  // safely via importNode. This avoids serializing innerHTML, which
  // would let any dangerouslySetInnerHTML content execute as script.
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Print</title><style>${styles}
    @media print {
      body { margin: 0; padding: 20px; }
      button, .no-print { display: none !important; }
      .print-content { page-break-inside: avoid; }
    }</style></head><body></body></html>`);
  printWindow.document.close();

  const clone = printContent.cloneNode(true) as Node;
  // Strip any <script> elements defensively.
  const tmp = printWindow.document.importNode(clone, true) as Element;
  tmp.querySelectorAll?.("script").forEach((n) => n.remove());
  printWindow.document.body.appendChild(tmp);

  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

export const printPage = (audit?: unknown) => {
  const opts = asAuditOpts(audit);
  if (opts?.entity) auditPhi({ action: "print", entity: opts.entity, entityId: opts.entityId });
  window.print();
};
