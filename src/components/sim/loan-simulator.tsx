"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEur, formatEurRounded, formatPercent } from "@/lib/format";
import { simulateLoan } from "@/lib/sim/loan";
import {
  type LoanInput,
  loanInputSchema,
  type RepaymentType,
} from "@/lib/sim/types";
import { useLoanStore } from "@/stores/loan-store";
import { DurationInfo, RateInfo, RepaymentInfo } from "./info-cards";
import { InfoHint } from "./info-hint";
import { NumberField } from "./number-field";
import { RateHint } from "./rate-hint";
import { Segmented } from "./segmented";

const chartConfig = {
  capital: { label: "Kapitaal", color: "var(--chart-1)" },
  interest: { label: "Interest", color: "var(--chart-4)" },
} satisfies ChartConfig;

const repaymentLabels: Record<RepaymentType, string> = {
  annuity: "Vaste mensualiteiten",
  linear: "Vaste kapitaalaflossing",
};

export function LoanSimulator() {
  const input = useLoanStore((s) => s.input);
  const setInput = useLoanStore((s) => s.setInput);
  const rateMode = useLoanStore((s) => s.rateMode);
  const setRateMode = useLoanStore((s) => s.setRateMode);

  const { result, errors } = useMemo(() => {
    const parsed = loanInputSchema.safeParse(input);
    if (!parsed.success) {
      const errors: Partial<Record<keyof LoanInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof LoanInput;
        errors[key] ??= issue.message;
      }
      return { result: null, errors };
    }
    return {
      result: simulateLoan(parsed.data),
      errors: {} as Partial<Record<keyof LoanInput, string>>,
    };
  }, [input]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Jouw lening</CardTitle>
          <CardDescription>
            Pas de gegevens aan om te simuleren.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <NumberField
            label="Leenbedrag"
            unit="€"
            value={input.principal}
            onChange={(principal) => setInput({ principal })}
            min={10_000}
            max={1_000_000}
            step={5_000}
            error={errors.principal}
          />
          <NumberField
            label="Jaarlijkse rentevoet"
            info={
              <InfoHint title="Rentevoeten bij Belgische banken" wide>
                <RateInfo years={input.years} />
              </InfoHint>
            }
            unit="%"
            decimals={2}
            value={input.annualRatePercent}
            onChange={(annualRatePercent) => setInput({ annualRatePercent })}
            min={0}
            max={8}
            step={0.05}
            error={errors.annualRatePercent}
          />
          <NumberField
            label="Looptijd"
            info={
              <InfoHint title="Looptijd">
                <DurationInfo ratePercent={input.annualRatePercent} />
              </InfoHint>
            }
            unit="jaar"
            value={input.years}
            onChange={(years) => setInput({ years })}
            min={5}
            max={30}
            step={1}
            error={errors.years}
          />
          <RateHint
            years={input.years}
            mode={rateMode}
            onModeChange={setRateMode}
          />
          <Segmented
            label="Aflossingswijze"
            info={
              <InfoHint
                title="Vaste mensualiteiten of vaste kapitaalaflossing?"
                wide
              >
                <RepaymentInfo
                  ratePercent={input.annualRatePercent}
                  years={input.years}
                />
              </InfoHint>
            }
            value={input.repaymentType}
            options={[
              { value: "annuity", label: repaymentLabels.annuity },
              { value: "linear", label: repaymentLabels.linear },
            ]}
            onChange={(repaymentType) => setInput({ repaymentType })}
            hint={
              input.repaymentType === "annuity" ? (
                <>
                  <Term id="vasteMensualiteiten" cap />: elke maand hetzelfde
                  bedrag.
                </>
              ) : (
                <>
                  <Term id="vasteKapitaalaflossing" cap />: dalende maandlast,
                  minder <Term id="interest" /> in totaal.
                </>
              )
            }
          />
        </CardContent>
      </Card>

      {result ? (
        <div className="grid min-w-0 gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label={
                input.repaymentType === "annuity"
                  ? "Je maandlast voor deze lening"
                  : "Je eerste maandlast"
              }
              value={formatEur(result.firstPayment)}
              hint={
                input.repaymentType === "linear"
                  ? `Laatste maandlast: ${formatEur(result.lastPayment)}`
                  : `${formatPercent(input.annualRatePercent / 100, 2)} vast, ${input.years} jaar`
              }
            />
            <Stat
              label="Totale interest"
              value={formatEur(result.totalInterest)}
            />
            <Stat
              label="Totaal terug te betalen"
              value={formatEur(result.totalPaid)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kapitaal en interest per jaar</CardTitle>
              <CardDescription>
                {repaymentLabels[input.repaymentType]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-72 w-full"
              >
                <BarChart data={result.years}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} />
                  <YAxis
                    width={72}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatEurRounded(v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) =>
                          `Jaar ${payload?.[0]?.payload?.year ?? ""}`
                        }
                        formatter={(value, name, item) => (
                          <div className="flex w-full items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{ background: item.color }}
                            />
                            <span className="text-muted-foreground">
                              {chartConfig[name as keyof typeof chartConfig]
                                ?.label ?? name}
                            </span>
                            <span className="ml-auto font-mono font-medium tabular-nums">
                              {formatEur(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="capital"
                    stackId="a"
                    fill="var(--color-capital)"
                  />
                  <Bar
                    dataKey="interest"
                    stackId="a"
                    fill="var(--color-interest)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aflossingstabel per jaar</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jaar</TableHead>
                    <TableHead className="text-right">Afbetaald</TableHead>
                    <TableHead className="text-right">Kapitaal</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">
                      Openstaand saldo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  {result.years.map((y) => (
                    <TableRow key={y.year}>
                      <TableCell>{y.year}</TableCell>
                      <TableCell className="text-right">
                        {formatEur(y.payment)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatEur(y.capital)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatEur(y.interest)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatEur(y.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="h-fit">
          <CardContent className="text-muted-foreground">
            Controleer de ingevulde gegevens om een simulatie te zien.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );
}
