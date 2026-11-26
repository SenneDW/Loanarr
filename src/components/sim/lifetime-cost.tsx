import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEur, formatPercent } from "@/lib/format";
import type { AffordabilityResult } from "@/lib/sim/affordability";
import type { RepaymentType } from "@/lib/sim/types";

/** What the home and the loan cost in the end, over the full term. */
export function LifetimeCostCard({
  result,
  ratePercent,
  repaymentType,
}: {
  result: AffordabilityResult;
  ratePercent: number;
  repaymentType: RepaymentType;
}) {
  const { plan, lifetime } = result;
  if (plan.loan <= 0) return null;

  const oneOff = plan.totalExpenses - plan.price;
  const total = lifetime.totalHomeCost;
  const parts = [
    { label: "Aankoopprijs", value: plan.price, color: "var(--chart-1)" },
    { label: "Eenmalige kosten", value: oneOff, color: "var(--chart-3)" },
    {
      label: `Interest (${lifetime.years} jaar)`,
      value: lifetime.totalInterest,
      color: "var(--chart-4)",
    },
  ];

  let x = 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wat kost het je uiteindelijk?</CardTitle>
        <CardDescription>
          Over de volledige looptijd van {lifetime.years} jaar, aan{" "}
          {formatPercent(ratePercent / 100, 2)} vaste rente.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2 sm:grid-cols-3">
          <Tile
            label="Totaal terugbetaald aan de bank"
            value={formatEur(lifetime.totalRepaid)}
            hint={`${formatEur(plan.loan)} lening + ${formatEur(lifetime.totalInterest)} interest`}
          />
          <Tile
            label="Interest + alle kosten"
            value={formatEur(lifetime.totalCostOfBuying)}
            hint="wat je betaalt bovenop de prijs"
          />
          <Tile
            label="Woning kost je in totaal"
            value={formatEur(total)}
            hint={`${formatPercent(total / plan.price - 1, 0)} meer dan de aankoopprijs`}
            strong
          />
        </div>

        <figure className="grid gap-2">
          <svg
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            className="h-4 w-full overflow-hidden rounded-full"
            role="img"
            aria-label="Verdeling van de totale kostprijs"
          >
            {parts.map((p, i) => {
              const w = (p.value / total) * 100;
              const rect = (
                <rect
                  key={p.label}
                  x={x}
                  width={w}
                  height="8"
                  fill={p.color}
                  className="anim-grow-x"
                  style={{ "--delay": `${i * 0.2}s` } as React.CSSProperties}
                />
              );
              x += w;
              return rect;
            })}
          </svg>
          <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {parts.map((p) => (
              <span key={p.label} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: p.color }}
                />
                {p.label}:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatEur(p.value)}
                </span>
              </span>
            ))}
          </figcaption>
        </figure>

        {repaymentType === "linear" && (
          <p className="text-xs text-muted-foreground">
            Je maandlast daalt van {formatEur(result.monthlyPayment)} naar{" "}
            {formatEur(lifetime.lastPayment)}.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Zonder verzekeringen (schuldsaldo, brand), onderhoud en eventuele
          fiscale voordelen. Vervroegd terugbetalen verlaagt de interest.
        </p>
      </CardContent>
    </Card>
  );
}

function Tile({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "grid gap-0.5 rounded-lg bg-primary px-3 py-2.5 text-primary-foreground"
          : "grid gap-0.5 rounded-lg bg-muted/60 px-3 py-2.5"
      }
    >
      <span
        className={
          strong
            ? "text-xs text-primary-foreground/80"
            : "text-xs text-muted-foreground"
        }
      >
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      <span
        className={
          strong
            ? "text-xs text-primary-foreground/80"
            : "text-xs text-muted-foreground"
        }
      >
        {hint}
      </span>
    </div>
  );
}
