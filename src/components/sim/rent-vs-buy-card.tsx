"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Term } from "@/components/term";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatEur, formatEurRounded, formatPercent } from "@/lib/format";
import type { AffordabilityResult } from "@/lib/sim/affordability";
import {
  compareRentVsBuy,
  DEFAULT_ASSUMPTIONS,
  type RentVsBuyAssumptions,
} from "@/lib/sim/rent-vs-buy";
import type { RepaymentType } from "@/lib/sim/types";
import { cn } from "@/lib/utils";
import { hasSituation, useSituationStore } from "@/stores/situation-store";

const chartConfig = {
  buyWealth: { label: "Kopen", color: "var(--chart-1)" },
  rentWealth: { label: "Huren + beleggen", color: "var(--chart-4)" },
} satisfies ChartConfig;

const horizons = [10, 15, 25] as const;

/** Compares buying this home with continuing to rent, over a chosen horizon. */
export function RentVsBuyCard({
  result,
  ratePercent,
  years,
  repaymentType,
  onEditSituation,
}: {
  result: AffordabilityResult;
  ratePercent: number;
  years: number;
  repaymentType: RepaymentType;
  onEditSituation: () => void;
}) {
  const situation = useSituationStore((s) => s.situation);
  const rent = situation.rent;
  const [horizon, setHorizon] = useState<(typeof horizons)[number]>(15);
  const [assumptions, setAssumptions] =
    useState<RentVsBuyAssumptions>(DEFAULT_ASSUMPTIONS);
  const { plan } = result;

  const comparison = useMemo(
    () =>
      rent > 0 && plan.price > 0
        ? compareRentVsBuy({
            price: plan.price,
            loan: plan.loan,
            upfront: plan.ownFunds,
            annualRatePercent: ratePercent,
            years,
            repaymentType,
            rent,
            horizon,
            assumptions,
          })
        : undefined,
    [rent, plan, ratePercent, years, repaymentType, horizon, assumptions],
  );

  if (!comparison) {
    // No situation at all: the SituationPrompt covers it.
    if (!hasSituation(situation)) return null;
    return (
      <Card size="sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Huur je nu? Vul je huur in om kopen en huren te vergelijken.
          </span>
          <button
            type="button"
            onClick={onEditSituation}
            className="font-medium text-primary hover:underline"
          >
            Huur invullen →
          </button>
        </CardContent>
      </Card>
    );
  }

  const { final, breakEvenYear, points } = comparison;
  const buyWins = final.buyWealth >= final.rentWealth;
  const gap = Math.abs(final.buyWealth - final.rentWealth);
  const first = points[0];

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle>Kopen of huren?</CardTitle>
            <CardDescription>
              Je vermogen na {horizon} jaar: deze woning kopen, of blijven huren
              aan {formatEurRounded(rent)}/maand en je eigen inbreng beleggen.
            </CardDescription>
          </div>
          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
            {horizons.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  horizon === h
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {h} jaar
              </button>
            ))}
          </div>
        </div>
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            buyWins
              ? "bg-primary text-primary-foreground"
              : "bg-chart-4/20 text-foreground",
          )}
        >
          <strong>
            {buyWins ? "Kopen" : "Huren"} levert na {horizon} jaar{" "}
            {formatEurRounded(gap)} meer op.
          </strong>{" "}
          {breakEvenYear
            ? `Het omslagpunt ligt na ${breakEvenYear} jaar.`
            : `Binnen ${horizon} jaar haalt kopen huren niet in.`}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Kopen, eerste jaar
            </span>
            <div className="font-semibold tabular-nums">
              {formatEur(first.buyMonthlyCost)}/maand
            </div>
            <span className="text-xs text-muted-foreground">
              lening + onderhoud + <Term id="onroerendeVoorheffing" /> +
              verzekering
            </span>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Huren, eerste jaar
            </span>
            <div className="font-semibold tabular-nums">
              {formatEur(first.rentMonthly)}/maand
            </div>
            <span className="text-xs text-muted-foreground">
              stijgt met {formatPercent(assumptions.rentGrowth)} per jaar
            </span>
          </div>
        </div>

        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-64 w-full"
        >
          <LineChart data={points} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickFormatter={(y: number) => `${y}j`}
            />
            <YAxis
              width={72}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatEurRounded(v)}
            />
            {breakEvenYear && (
              <ReferenceLine
                x={breakEvenYear}
                stroke="var(--primary)"
                strokeDasharray="4 4"
                label={{
                  value: "omslagpunt",
                  position: "insideTop",
                  fill: "var(--primary)",
                  fontSize: 11,
                }}
              />
            )}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    `Na ${payload?.[0]?.payload?.year ?? ""} jaar`
                  }
                  formatter={(value, name, item) => (
                    <div className="flex w-full items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ background: item.color }}
                      />
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label}
                      </span>
                      <span className="ml-auto font-mono font-medium tabular-nums">
                        {formatEurRounded(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="buyWealth"
              type="monotone"
              stroke="var(--color-buyWealth)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              dataKey="rentWealth"
              type="monotone"
              stroke="var(--color-rentWealth)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>

        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Aannames aanpassen
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Assumption
              label="Waardestijging woning"
              value={assumptions.homeGrowth}
              onChange={(homeGrowth) =>
                setAssumptions((a) => ({ ...a, homeGrowth }))
              }
            />
            <Assumption
              label="Huurstijging"
              value={assumptions.rentGrowth}
              onChange={(rentGrowth) =>
                setAssumptions((a) => ({ ...a, rentGrowth }))
              }
            />
            <Assumption
              label="Rendement beleggen"
              value={assumptions.investReturn}
              onChange={(investReturn) =>
                setAssumptions((a) => ({ ...a, investReturn }))
              }
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Verder: onderhoud {formatPercent(assumptions.maintenanceRate)} van
            de woningwaarde per jaar,{" "}
            {formatEurRounded(assumptions.propertyTax)}{" "}
            <Term id="onroerendeVoorheffing" /> en{" "}
            {formatEurRounded(assumptions.insurance)} verzekeringen per jaar.
            Verkoopkosten en belasting op beleggingen zijn niet meegerekend.
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

function Assumption({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="range"
          min={-2}
          max={8}
          step={0.5}
          value={value * 100}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="flex-1 accent-[var(--primary)]"
        />
        <span className="w-12 text-right font-medium tabular-nums">
          {formatPercent(value)}
        </span>
      </span>
    </label>
  );
}
