"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "loanarr:how-it-works-dismissed";

const steps = [
  { label: "Maandlast", sub: "wat je kan dragen", tone: "primary" },
  { label: "Lening", sub: "bank + rente", tone: "primary" },
  { label: "+ Eigen middelen", sub: "spaargeld", tone: "amber" },
  { label: "− Kosten", sub: "notaris, rechten", tone: "amber" },
  { label: "= Aankoopprijs", sub: "je maximum", tone: "result" },
] as const;

/** Dismissible explainer of how the maximum price is calculated. */
export function HowItWorks() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Storage can be unavailable (private mode); hiding for this visit is fine.
    }
  };

  return (
    <section
      aria-label="Zo werkt het"
      className="relative grid gap-3 rounded-xl border border-primary/15 bg-secondary/60 px-4 py-3"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Uitleg sluiten"
        className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
      <h2 className="text-sm font-semibold">Zo werkt het</h2>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className="anim-fade-up flex items-center gap-1.5"
            style={{ "--delay": `${i * 0.12}s` } as React.CSSProperties}
          >
            <div
              className={cn(
                "grid rounded-lg border bg-card px-3 py-1.5 leading-tight",
                s.tone === "primary" && "border-primary/40",
                s.tone === "amber" && "border-chart-4",
                s.tone === "result" &&
                  "border-primary bg-primary text-primary-foreground",
              )}
            >
              <span className="text-sm font-semibold whitespace-nowrap">
                {s.label}
              </span>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  s.tone === "result"
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {s.sub}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight
                className="size-4 shrink-0 text-primary/60"
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        De bank leent meestal max. 90 % van de prijs: dan bepalen je eigen
        middelen het maximum. Vul een paar korte stappen in; het resultaat past
        zich meteen aan. Klik op <span className="font-semibold">ⓘ</span> voor
        uitleg bij elk veld.
      </p>
    </section>
  );
}
