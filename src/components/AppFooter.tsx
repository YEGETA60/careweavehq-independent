import { Link } from "react-router-dom";
import { COPYRIGHT_LINE, FOOTER_DISCLAIMER, LEGAL_ENTITY } from "@/lib/legal-content";

/**
 * Global footer with required legal disclosures and links. Mount at the bottom
 * of authenticated and unauthenticated pages.
 */
export function AppFooter({ minimal = false }: { minimal?: boolean }) {
  return (
    <footer className="border-t bg-muted/30 mt-6 sm:mt-8 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 text-[11px] sm:text-xs text-muted-foreground space-y-2 sm:space-y-3">
        {!minimal && (
          <p className="leading-relaxed line-clamp-4 sm:line-clamp-none">{FOOTER_DISCLAIMER}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
          <Link to="/legal/terms" className="hover:underline">Terms</Link>
          <Link to="/legal/privacy" className="hover:underline">Privacy</Link>
          <Link to="/legal/hipaa" className="hover:underline">HIPAA / BAA</Link>
          <Link to="/legal/aup" className="hover:underline">Acceptable Use</Link>
          <Link to="/legal/disclaimers" className="hover:underline">Disclaimers</Link>
          <a href={`mailto:${LEGAL_ENTITY.securityEmail}`} className="hover:underline">
            Report a security issue
          </a>
        </div>
        <p>{COPYRIGHT_LINE()}</p>
      </div>
    </footer>
  );
}