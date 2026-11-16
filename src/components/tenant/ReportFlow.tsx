import { Camera, Droplets, Lock, Loader2, MoreHorizontal, Plug, Wrench, X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { AnimatedCheck } from "@/components/shared/AnimatedCheck";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/tenant/PayFlow";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const categories: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "Plumbing", label: "Plumbing", icon: Wrench },
  { id: "Electrical", label: "Electrical", icon: Plug },
  { id: "Water", label: "Water", icon: Droplets },
  { id: "Security", label: "Security", icon: Lock },
  { id: "Other", label: "Other", icon: MoreHorizontal },
];

const urgencies = ["Low", "Normal", "Urgent"] as const;
export type ReportInput = {
  category: string;
  urgency: (typeof urgencies)[number];
  description: string;
  photo: string | null;
  queued: boolean;
};

const MAX_PHOTO_MB = 5;

export function ReportFlow({ onSubmitted, onClose }: { onSubmitted: (r: ReportInput) => void; onClose: () => void }) {
  const [category, setCategory] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<(typeof urgencies)[number]>("Normal");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ category?: string | undefined; description?: string | undefined; photo?: string | undefined }>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [queued, setQueued] = useState(false);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!category) next.category = "Choose what the problem is about.";
    if (description.trim().length < 10) next.description = "Describe the problem in at least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setState("sending");
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    window.setTimeout(() => {
      setQueued(offline);
      setState("sent");
      onSubmitted({ category: category!, urgency, description: description.trim(), photo, queued: offline });
    }, 1100);
  }

  if (state === "sent") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center pt-4 text-center">
        <AnimatedCheck />
        <h3 className="mt-5 text-xl font-bold">{queued ? "Saved on your phone" : "Request sent"}</h3>
        <p className="mt-1 max-w-xs text-muted-foreground">
          {queued
            ? "You are offline. We will send it to your landlord as soon as you reconnect."
            : "Your landlord has been notified. You can follow progress under Repairs."}
        </p>
        <Button size="lg" className="mt-8 w-full" onClick={onClose}>
          Done
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-muted-foreground">What is the problem about?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2" aria-describedby="category-error">
          {categories.map((c, i) => {
            const Icon = c.icon;
            const selected = category === c.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setCategory(c.id);
                  setErrors((er) => ({ ...er, category: undefined }));
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i, duration: 0.3, ease: ease.outExpo }}
                className={cn(
                  "press flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border-2 text-sm font-semibold",
                  selected ? "border-primary bg-primary-soft text-primary-deep" : "border-border bg-card",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {c.label}
              </motion.button>
            );
          })}
        </div>
        <FieldError id="category-error" message={errors.category} />
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-muted-foreground">How urgent is it?</legend>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
          {urgencies.map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={urgency === u}
              onClick={() => setUrgency(u)}
              className="relative h-11 rounded-full text-sm font-semibold"
            >
              {urgency === u && (
                <motion.span
                  layoutId="urgency"
                  className={cn("absolute inset-0 rounded-full shadow-soft", u === "Urgent" ? "bg-destructive-soft" : "bg-card")}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className={cn("relative", u === "Urgent" && urgency === u && "text-destructive-ink")}>{u}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="desc">Describe the problem</Label>
        <Textarea
          id="desc"
          className="mt-2"
          maxLength={500}
          placeholder="For example: water drips from the pipe under the kitchen sink."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby="desc-error"
        />
        <div className="mt-1 flex justify-between">
          <FieldError id="desc-error" message={errors.description} />
          <span className="figure ml-auto pt-2 text-xs text-muted-foreground">{description.length}/500</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">
          Photo <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <AnimatePresence mode="wait" initial={false}>
          {photo ? (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative mt-2 overflow-hidden rounded-lg">
              <img src={photo} alt="Photo of the problem" className="h-40 w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-card shadow-soft"
                aria-label="Remove photo"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ) : (
            <motion.label key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Camera className="size-5" aria-hidden />
              Add a photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > MAX_PHOTO_MB * 1024 * 1024) {
                    setErrors((er) => ({ ...er, photo: `Photos must be under ${MAX_PHOTO_MB} MB.` }));
                    return;
                  }
                  setErrors((er) => ({ ...er, photo: undefined }));
                  setPhoto(URL.createObjectURL(f));
                }}
              />
            </motion.label>
          )}
        </AnimatePresence>
        <FieldError id="photo-error" message={errors.photo} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? (
          <>
            <Loader2 className="animate-spin" /> Sending request
          </>
        ) : (
          "Send to landlord"
        )}
      </Button>
    </form>
  );
}
