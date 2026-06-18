import { useCallback, useEffect, useState } from "react";

const KEY = "cw:onboarding:v1";

export type TourState = {
  startedAt?: number;
  completedSteps: string[];
  completedAt?: number;
  currentStep?: number;
};

export type OnboardingState = {
  dismissedNudge?: boolean;
  activeTourId?: string | null;
  tours: Record<string, TourState>;
};

const empty: OnboardingState = { tours: {} };

function read(): OnboardingState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return { tours: {}, ...parsed };
  } catch {
    return empty;
  }
}

function write(s: OnboardingState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("cw:onboarding-changed"));
  } catch {
    /* ignore */
  }
}

export function useGuideProgress() {
  const [state, setState] = useState<OnboardingState>(() => read());

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener("storage", sync);
    window.addEventListener("cw:onboarding-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cw:onboarding-changed", sync);
    };
  }, []);

  const update = useCallback((next: OnboardingState) => {
    write(next);
    setState(next);
  }, []);

  const startTour = useCallback((tourId: string) => {
    const cur = read();
    const prev = cur.tours[tourId];
    update({
      ...cur,
      activeTourId: tourId,
      tours: {
        ...cur.tours,
        [tourId]: {
          startedAt: prev?.startedAt ?? Date.now(),
          completedSteps: prev?.completedSteps ?? [],
          currentStep: prev?.currentStep ?? 0,
        },
      },
    });
  }, [update]);

  const setActiveTour = useCallback((tourId: string | null) => {
    const cur = read();
    update({ ...cur, activeTourId: tourId });
  }, [update]);

  const setStepIndex = useCallback((tourId: string, idx: number) => {
    const cur = read();
    const t = cur.tours[tourId] ?? { completedSteps: [] };
    update({
      ...cur,
      tours: { ...cur.tours, [tourId]: { ...t, currentStep: idx } },
    });
  }, [update]);

  const markStepComplete = useCallback((tourId: string, stepId: string, totalSteps: number) => {
    const cur = read();
    const t = cur.tours[tourId] ?? { completedSteps: [] };
    if (t.completedSteps.includes(stepId)) return;
    const completedSteps = [...t.completedSteps, stepId];
    const nextIdx = (t.currentStep ?? 0) + 1;
    const completed = completedSteps.length >= totalSteps;
    update({
      ...cur,
      tours: {
        ...cur.tours,
        [tourId]: {
          ...t,
          completedSteps,
          currentStep: nextIdx,
          completedAt: completed ? Date.now() : t.completedAt,
        },
      },
      activeTourId: completed ? null : cur.activeTourId,
    });
  }, [update]);

  const resetTour = useCallback((tourId: string) => {
    const cur = read();
    const { [tourId]: _drop, ...rest } = cur.tours;
    update({ ...cur, tours: rest, activeTourId: cur.activeTourId === tourId ? null : cur.activeTourId });
  }, [update]);

  const dismissNudge = useCallback(() => {
    const cur = read();
    update({ ...cur, dismissedNudge: true });
  }, [update]);

  return {
    state,
    startTour,
    setActiveTour,
    setStepIndex,
    markStepComplete,
    resetTour,
    dismissNudge,
  };
}