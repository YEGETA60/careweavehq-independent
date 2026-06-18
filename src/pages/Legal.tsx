import { useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import {
  ALL_LEGAL,
  LegalDocKey,
  LEGAL_ENTITY,
  LAST_UPDATED,
  FOOTER_DISCLAIMER,
} from "@/lib/legal-content";
import { AppFooter } from "@/components/AppFooter";

const ORDER: LegalDocKey[] = ["terms", "privacy", "hipaa", "aup", "disclaimers"];

export default function Legal() {
  const { doc } = useParams<{ doc?: string }>();
  const navigate = useNavigate();
  const active: LegalDocKey = useMemo(() => {
    if (doc && (ORDER as string[]).includes(doc)) return doc as LegalDocKey;
    return "terms";
  }, [doc]);
  const current = ALL_LEGAL[active];

  useEffect(() => {
    document.title = `${current.label} — ${LEGAL_ENTITY.shortName}`;
    const meta = document.querySelector('meta[name="description"]');
    const desc = `${current.label} for ${LEGAL_ENTITY.product}. Last updated ${LAST_UPDATED}.`;
    if (meta) meta.setAttribute("content", desc);
  }, [current.label]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-lg font-bold leading-tight">{LEGAL_ENTITY.shortName} Legal Center</h1>
              <p className="text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-4">
        <Tabs value={active} onValueChange={(v) => navigate(`/legal/${v}`)} className="print:hidden">
          <TabsList className="flex flex-wrap h-auto">
            {ORDER.map((k) => (
              <TabsTrigger key={k} value={k}>
                {ALL_LEGAL[k].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>{current.label}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {LEGAL_ENTITY.name} · Effective {LAST_UPDATED}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-xs italic text-muted-foreground border-l-2 border-amber-500/50 pl-3">
              {FOOTER_DISCLAIMER}
            </p>
            {current.sections.map((s) => (
              <section key={s.id} id={s.id} className="break-inside-avoid">
                <h2 className="font-semibold text-base mb-1">{s.title}</h2>
                <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {s.body}
                </div>
              </section>
            ))}
            <p className="text-xs text-muted-foreground pt-4 border-t">
              Other documents:{" "}
              {ORDER.filter((k) => k !== active).map((k, i, arr) => (
                <span key={k}>
                  <Link to={`/legal/${k}`} className="underline hover:text-foreground">
                    {ALL_LEGAL[k].label}
                  </Link>
                  {i < arr.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </CardContent>
        </Card>
      </main>

      <AppFooter minimal />
    </div>
  );
}