import { useCompany, formatCompanyAddress } from "@/hooks/useCompany";
import { Building2 } from "lucide-react";

/**
 * Company-branded header. Renders the company logo + identifying info.
 * Designed to appear at the top of printable pages (invoices, reports, intake docs).
 * Hidden on screen by default unless `showOnScreen` is true.
 */
export function CompanyBrandingHeader({ showOnScreen = false, compact = false }: { showOnScreen?: boolean; compact?: boolean }) {
  const { company } = useCompany();
  if (!company) return null;
  const name = company.display_name || company.legal_name;
  const addr = formatCompanyAddress(company);
  return (
    <div className={`${showOnScreen ? "" : "hidden print:block"} mb-4 pb-3 border-b`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt={`${name} logo`} className={compact ? "h-10 w-auto object-contain" : "h-14 w-auto object-contain"} crossOrigin="anonymous" />
          ) : (
            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <div className="font-bold text-lg leading-tight">{name}</div>
            {company.tax_id && <div className="text-xs text-muted-foreground">EIN: {company.tax_id}</div>}
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground leading-tight">
          {addr && <div>{addr}</div>}
          <div className="space-x-2">
            {company.phone && <span>{company.phone}</span>}
            {company.email && <span>· {company.email}</span>}
            {company.website && <span>· {company.website}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}