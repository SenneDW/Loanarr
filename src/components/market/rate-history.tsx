"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
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
import { formatPercent, monthLabel } from "@/lib/format";
import { ECB_SOURCE_URL, type RatePoint } from "@/lib/market/ecb";
import {
  type Direction,
  lastYears,
  type Trend,
  trendOf,
} from "@/lib/market/trend";
import { cn } from "@/lib/utils";

const chartConfig = {
  fixedLong: { label: "Vast > 10 jaar", color: "var(--chart-1)" },
  variable: { label: "Variabel / ≤ 1 jaar vast", color: "var(--chart-4)" },
} satisfies ChartConfig;

const ranges = [5, 10, 20] as const;

const pct = (n: number, decimals = 2) => formatPercent(n / 100, decimals);
const pts = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pt`;

/** 20 years of Belgian mortgage rates (NBB/ECB), with the current trend. */
export function RateHistory({
  points,
  bankRate,
}: {
  points: RatePoint[];
  /** Today's average bank tariff (25 years, with insurance), shown as a reference line. */
  bankRate: number;
}) {
  const [years, setYears] = useState<(typeof ranges)[number]>(20);
  const data = useMemo(() => lastYears(points, years), [points, years]);
  // One tick per year (every other year for 20 years, twice a year for 5 years).
  const ticks = useMemo(
    () =>
      data
        .map((p) => p.month)
        .filter((m) => {
          const [y, mo] = m.split("-");
          if (years <= 5) return mo === "01" || mo === "07";
          return mo === "01" && (years < 20 || Number(y) % 2 === 0);
        }),
    [data, years],
  );
  const fixed = trendOf(points, "fixedLong");
  const variable = trendOf(points, "variable");

  const fixedValues = lastYears(points, 20)
    .map((p) => p.fixedLong)
    .filter((v): v is number => v !== undefined);
  const low = Math.min(...fixedValues);
  const high = Math.max(...fixedValues);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle>Hypotheekrente in België</CardTitle>
            <CardDescription>
              Gemiddelde rente op nieuwe woonkredieten, na onderhandeling. Bron:
              Nationale Bank via ECB, maandelijks.
            </CardDescription>
          </div>
          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setYears(r)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  years === r
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r} jaar
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {fixed && <TrendTile label="Vaste rente > 10 jaar" trend={fixed} />}
          {variable && <TrendTile label="Variabele rente" trend={variable} />}
          <div className="grid gap-0.5 rounded-lg bg-muted/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Vast, laatste 20 jaar
            </span>
            <span className="text-sm tabular-nums">
              Laagst <strong>{pct(low)}</strong> · hoogst{" "}
              <strong>{pct(high)}</strong>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-72 w-full"
        >
          <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              ticks={ticks}
              interval={0}
              tickFormatter={(m: string) =>
                years <= 5 ? monthLabel(m, true) : m.slice(0, 4)
              }
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              domain={[
                (min: number) => Math.max(0, Math.floor(min - 0.5)),
                (max: number) => Math.ceil(Math.max(max, bankRate) + 0.5),
              ]}
              allowDecimals={false}
              tickFormatter={(v: number) => pct(v, 1)}
            />
            <ReferenceLine
              y={bankRate}
              stroke="var(--primary)"
              strokeDasharray="4 4"
              label={{
                value: `Tarieflijsten banken nu: ${pct(bankRate)}`,
                position: "top",
                fill: "var(--primary)",
                fontSize: 11,
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    monthLabel(String(payload?.[0]?.payload?.month ?? ""))
                  }
                  formatter={(value, name, item) => (
                    <div className="flex w-full items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ background: item.color }}
                      />
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ??
                          name}
                      </span>
                      <span className="ml-auto font-mono font-medium tabular-nums">
                        {pct(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="fixedLong"
              type="monotone"
              stroke="var(--color-fixedLong)"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              dataKey="variable"
              type="monotone"
              stroke="var(--color-variable)"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ChartContainer>
        <p className="text-xs text-muted-foreground">
          Dit zijn rentes die kopers effectief kregen, na onderhandeling. De
          tarieflijsten van banken (stippellijn, 25 jaar vast met verzekeringen)
          liggen hoger. Nieuwe maandcijfers verschijnen hier automatisch zodra
          de ECB ze publiceert.{" "}
          <a
            href={ECB_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            Bekijk de bron
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

const directionStyle: Record<
  Direction,
  { label: string; className: string; Icon: typeof ArrowUpRight }
> = {
  up: {
    label: "Stijgend",
    className: "bg-chart-4/20 text-foreground",
    Icon: ArrowUpRight,
  },
  down: {
    label: "Dalend",
    className: "bg-primary/15 text-primary",
    Icon: ArrowDownRight,
  },
  flat: {
    label: "Stabiel",
    className: "bg-muted text-muted-foreground",
    Icon: ArrowRight,
  },
};

function TrendTile({ label, trend }: { label: string; trend: Trend }) {
  const style = directionStyle[trend.direction];
  return (
    <div className="grid gap-1 rounded-lg bg-muted/60 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
            style.className,
          )}
        >
          <style.Icon className="size-3.5" aria-hidden />
          {style.label}
        </span>
      </div>
      <div className="flex items-baseline gap-2 tabular-nums">
        <span className="text-lg font-semibold">{pct(trend.latest.value)}</span>
        <span className="text-xs text-muted-foreground">
          {monthLabel(trend.latest.month)}
        </span>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {trend.change3m !== undefined && `${pts(trend.change3m)} in 3 maanden`}
        {trend.change12m !== undefined &&
          ` · ${pts(trend.change12m)} op 1 jaar`}
      </span>
    </div>
  );
}
