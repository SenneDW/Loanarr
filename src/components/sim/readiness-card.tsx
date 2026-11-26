"use client";

import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AffordabilityResult } from "@/lib/sim/affordability";
import {
  type CheckStatus,
  readinessChecks,
  situationSchema,
} from "@/lib/sim/situation";
import { cn } from "@/lib/utils";
import { hasSituation, useSituationStore } from "@/stores/situation-store";

const statusStyle: Record<
  CheckStatus,
  { Icon: typeof CircleCheck; className: string; label: string }
> = {
  good: { Icon: CircleCheck, className: "text-primary", label: "In orde" },
  warn: { Icon: CircleAlert, className: "text-chart-4", label: "Let op" },
  bad: { Icon: CircleX, className: "text-destructive", label: "Probleem" },
};

/** Traffic-light checklist: is this purchase realistic for the user's situation? */
export function ReadinessCard({ result }: { result: AffordabilityResult }) {
  const situation = useSituationStore((s) => s.situation);
  const parsed = situationSchema.safeParse(situation);

  // Without a situation, the result step shows a single SituationPrompt instead.
  if (!parsed.success || !hasSituation(parsed.data)) return null;

  const checks = readinessChecks(parsed.data, result);
  const bad = checks.filter((c) => c.status === "bad").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const verdict =
    bad > 0
      ? "Nog niet: werk eerst aan de rode punten."
      : warn > 0
        ? "Haalbaar, met enkele aandachtspunten."
        : "Ziet er goed uit: je bent er klaar voor.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ben je er klaar voor?</CardTitle>
        <CardDescription>{verdict}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checks.map((c, i) => {
            const style = statusStyle[c.status];
            return (
              <li
                key={c.id}
                className="anim-fade-up flex gap-3 rounded-lg bg-muted/50 p-3"
                style={{ "--delay": `${i * 0.08}s` } as React.CSSProperties}
              >
                <style.Icon
                  className={cn("mt-0.5 size-5 shrink-0", style.className)}
                  aria-label={style.label}
                />
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium">{c.title}</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {c.detail}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/** One invitation, shown in the result when the situation step was skipped. */
export function SituationPrompt({ onEdit }: { onEdit: () => void }) {
  const situation = useSituationStore((s) => s.situation);
  if (hasSituation(situation)) return null;
  return (
    <Card size="sm" className="bg-secondary/60 ring-primary/15">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>
          <strong>Past dit bij jou?</strong>{" "}
          <span className="text-muted-foreground">
            Vul je situatie in voor een check van je budget en een vergelijking
            tussen kopen en huren.
          </span>
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="font-medium text-primary hover:underline"
        >
          Vul je situatie in →
        </button>
      </CardContent>
    </Card>
  );
}
