import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuideProgress } from "./useGuideProgress";
import { getTour, type TourStep } from "./tours";

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(target: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function GuideTour() {
  const { state, setActiveTour, setStepIndex, markStepComplete } = useGuideProgress();
  const activeId = state.activeTourId;
  const tour = activeId ? getTour(activeId) : undefined;
  const tourState = activeId ? state.tours[activeId] : undefined;
  const stepIdx = Math.min(tourState?.currentStep ?? 0, (tour?.steps.length ?? 1) - 1);
  const step: TourStep | undefined = tour?.steps[stepIdx];

  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const tickRef = useRef<number | null>(null);

  // Navigate to the right module whenever the step changes.
  useEffect(() => {
    if (!step) return;
    window.dispatchEvent(new CustomEvent("cw:navigate", { detail: step.module }));
  }, [step?.module, step?.id]);

  // Poll for the target element and its position.
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const el = findTarget(step.target);
      if (el) {
        setMissing(false);
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRect(getRect(el));
      } else {
        setMissing(true);
        setRect(null);
      }
      tickRef.current = window.setTimeout(tick, 250);
    };
    tick();
    return () => {
      cancelled = true;
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
  }, [step?.target, step?.id]);

  // Auto-complete when the user clicks the spotlighted target.
  useEffect(() => {
    if (!step?.awaitClick || !tour) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const match = t.closest(`[data-tour="${step.target}"]`);
      if (match) {
        markStepComplete(tour.id, step.id, tour.steps.length);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [step?.id, step?.target, step?.awaitClick, tour?.id, tour?.steps.length, markStepComplete]);

  const onNext = () => {
    if (!tour || !step) return;
    if (step.awaitClick) return; // handled by click listener
    markStepComplete(tour.id, step.id, tour.steps.length);
  };
  const onSkip = () => {
    if (!tour || !step) return;
    setStepIndex(tour.id, Math.min(stepIdx + 1, tour.steps.length - 1));
  };
  const onExit = () => setActiveTour(null);

  const padding = 8;
  const spotlight = useMemo(() => {
    if (!rect) return null;
    return {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
  }, [rect]);

  if (!tour || !step) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dim layer with cutout via 4 panels around the spotlight */}
      {spotlight && (
        <>
          <div className="absolute bg-background/70 backdrop-blur-[1px] pointer-events-auto" style={{ top: 0, left: 0, right: 0, height: Math.max(spotlight.top, 0) }} />
          <div className="absolute bg-background/70 backdrop-blur-[1px] pointer-events-auto" style={{ top: spotlight.top + spotlight.height, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-background/70 backdrop-blur-[1px] pointer-events-auto" style={{ top: spotlight.top, left: 0, width: Math.max(spotlight.left, 0), height: spotlight.height }} />
          <div className="absolute bg-background/70 backdrop-blur-[1px] pointer-events-auto" style={{ top: spotlight.top, left: spotlight.left + spotlight.width, right: 0, height: spotlight.height }} />
          {/* Ring around target */}
          <div
            className="absolute rounded-md ring-2 ring-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25)] animate-pulse pointer-events-none"
            style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height }}
          />
        </>
      )}
      {!spotlight && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] pointer-events-auto" />
      )}

      {/* Tooltip */}
      <div className="absolute pointer-events-auto max-w-sm w-[22rem] rounded-lg border border-border bg-card text-card-foreground shadow-xl p-4 space-y-3"
        style={tooltipPosition(spotlight)}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">
              {tour.title} · Step {stepIdx + 1} of {tour.steps.length}
            </div>
            <h4 className="font-semibold text-sm mt-0.5">{step.title}</h4>
          </div>
          <button onClick={onExit} aria-label="Exit guide" className="p-1 rounded hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{renderInline(step.body)}</p>
        {missing && (
          <p className="text-xs text-amber-600">Looking for the target on this page…</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          {step.awaitClick ? (
            <span className="text-xs text-muted-foreground">Click the highlighted button to continue</span>
          ) : (
            <Button size="sm" onClick={onNext}>
              {stepIdx + 1 === tour.steps.length ? <>Finish <Check className="h-3.5 w-3.5 ml-1" /></> : <>Next <ChevronRight className="h-3.5 w-3.5 ml-1" /></>}
            </Button>
          )}
        </div>
      </div>

      {/* Floating checklist */}
      <div className="absolute bottom-4 right-4 pointer-events-auto w-72 rounded-lg border border-border bg-card shadow-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold">{tour.title}</div>
          <button onClick={onExit} className="text-[11px] text-muted-foreground hover:text-foreground">Exit</button>
        </div>
        <ul className="space-y-1.5">
          {tour.steps.map((s, i) => {
            const done = tourState?.completedSteps.includes(s.id);
            const current = i === stepIdx;
            return (
              <li key={s.id} className={`flex items-center gap-2 text-xs ${current ? "text-foreground" : done ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${done ? "bg-primary border-primary text-primary-foreground" : current ? "border-primary" : "border-muted-foreground/40"}`}>
                  {done && <Check className="h-2.5 w-2.5" />}
                </span>
                <span className="truncate">{s.title}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  );
}

function tooltipPosition(spot: Rect | null): React.CSSProperties {
  if (!spot) return { top: "20%", left: "50%", transform: "translateX(-50%)" };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipW = 352;
  const tooltipH = 180;
  // Prefer below the spotlight; otherwise above
  let top = spot.top + spot.height + 12;
  if (top + tooltipH > vh - 12) top = Math.max(spot.top - tooltipH - 12, 12);
  let left = spot.left + spot.width / 2 - tooltipW / 2;
  left = Math.max(12, Math.min(left, vw - tooltipW - 12));
  return { top, left };
}

// Tiny markdown-ish renderer for **bold** only — keeps copy snappy without adding a dep.
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="text-foreground">{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}