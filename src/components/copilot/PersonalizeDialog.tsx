import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  ROLE_LABELS,
  GOAL_LABELS,
  type GuideProfile,
  type GuideRole,
  type GuideGoal,
} from "./personalization";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: GuideProfile | null;
  onSave: (p: GuideProfile) => void;
};

export function PersonalizeDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [role, setRole] = useState<GuideRole>(initial?.role ?? "admin");
  const [goals, setGoals] = useState<GuideGoal[]>(initial?.goals ?? ["onboard_clients"]);
  const [experience, setExperience] = useState<GuideProfile["experience"]>(initial?.experience ?? "new");

  const toggleGoal = (g: GuideGoal) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const submit = () => {
    onSave({ role, goals: goals.length ? goals : ["explore"], experience, savedAt: Date.now() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Personalize your walkthrough
          </DialogTitle>
          <DialogDescription>
            Tell Co-Pilot who you are and what matters most — we'll order the guided tours for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Your role</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ROLE_LABELS) as GuideRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    role === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">
              What do you want to do first? <span className="text-muted-foreground/70">(pick any)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(GOAL_LABELS) as GuideGoal[]).map((g) => {
                const on = goals.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGoal(g)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                    }`}
                  >
                    {GOAL_LABELS[g]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Where are you starting?</div>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["new", "Brand new agency"],
                ["switching", "Switching from another system"],
                ["expanding", "Adding a new line of service"],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setExperience(v)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    experience === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Save & recommend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}