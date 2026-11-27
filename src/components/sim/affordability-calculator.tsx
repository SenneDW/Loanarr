"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useFlanders2027Enacted } from "@/components/market-context";
import { Term } from "@/components/term";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEurRounded } from "@/lib/format";
import {
  type AffordabilityInput,
  affordabilityInputSchema,
  maxPurchasePrice,
} from "@/lib/sim/affordability";
import { situationSchema, summarizeSituation } from "@/lib/sim/situation";
import {
  type DeedYear,
  type Region,
  registrationRule,
} from "@/lib/sim/tariffs";
import type { RepaymentType } from "@/lib/sim/types";
import { cn } from "@/lib/utils";
import { fieldErrors } from "@/lib/validation";
import {
  DEFAULT_MONTHLY_PAYMENT,
  DEFAULT_OWN_FUNDS,
  useAffordabilityStore,
} from "@/stores/affordability-store";
import { useLoanStore } from "@/stores/loan-store";
import { hasSituation, useSituationStore } from "@/stores/situation-store";
import {
  AffordabilitySummary,
  AffordabilitySummaryBar,
} from "./affordability-summary";
import { BankComparison } from "./bank-comparison";
import { FinancialPlanCard } from "./financial-plan";
import {
  DeedYearInfo,
  DurationInfo,
  FileCostsInfo,
  IncomeInfo,
  InscriptionInfo,
  LtvInfo,
  MonthlyPaymentInfo,
  OwnFundsInfo,
  RateInfo,
  RegionInfo,
  RepaymentInfo,
  ValuationInfo,
} from "./info-cards";
import { InfoHint } from "./info-hint";
import { LifetimeCostCard } from "./lifetime-cost";
import { NumberField } from "./number-field";
import { RateHint } from "./rate-hint";
import { ReadinessCard, SituationPrompt } from "./readiness-card";
import { RentVsBuyCard } from "./rent-vs-buy-card";
import { Segmented } from "./segmented";
import { SituationStep } from "./situation-step";

const regionOptions: ReadonlyArray<{ value: Region; label: string }> = [
  { value: "flanders", label: "Vlaanderen" },
  { value: "wallonia", label: "Wallonië" },
  { value: "brussels", label: "Brussel" },
];

const deedYearOptions: ReadonlyArray<{ value: DeedYear; label: string }> = [
  { value: 2026, label: "In 2026" },
  { value: 2027, label: "Vanaf 2027" },
];

const repaymentOptions: ReadonlyArray<{ value: RepaymentType; label: string }> =
  [
    { value: "annuity", label: "Vaste mensualiteiten" },
    { value: "linear", label: "Vaste kapitaalaflossing" },
  ];

const steps = [
  {
    title: "Situatie",
    heading: "Jouw situatie",
    description:
      "Vertel ons iets over je inkomen en spaargeld, dan stellen we een budget voor dat bij je past.",
  },
  {
    title: "Budget",
    heading: "Jouw budget",
    description: "Wat wil je per maand aflossen en hoeveel breng je zelf in?",
  },
  {
    title: "Woning",
    heading: "Je woning",
    description: "Je eerste en enige woning, waar je zelf gaat wonen.",
  },
  {
    title: "Details",
    heading: "Details van je lening",
    description:
      "Standaardwaarden die je bank of notaris kan bevestigen. Je mag ze gerust zo laten staan.",
  },
  {
    title: "Resultaat",
    heading: "Resultaat",
    description: "",
  },
] as const;

const RESULT_STEP = steps.length - 1;

/** Fraction → whole percent for input fields, and back. */
const toPercent = (fraction: number) => Math.round(fraction * 100);
const fromPercent = (percent: number) => percent / 100;

type Errors = Partial<Record<keyof AffordabilityInput, string>>;

export function AffordabilityCalculator() {
  const input = useAffordabilityStore((s) => s.input);
  const [step, setStep] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const { result, errors } = useMemo(() => {
    const parsed = affordabilityInputSchema.safeParse(input);
    if (!parsed.success) {
      return { result: null, errors: fieldErrors(parsed.error) as Errors };
    }
    return { result: maxPurchasePrice(parsed.data), errors: {} as Errors };
  }, [input]);

  const router = useRouter();
  const rateMode = useAffordabilityStore((s) => s.rateMode);

  // Until the user enters anything, the result is based on our starting values:
  // say so, so nobody reads it as their own amount.
  const situation = useSituationStore((s) => s.situation);
  const isExample =
    !hasSituation(situation) &&
    input.monthlyPayment === DEFAULT_MONTHLY_PAYMENT &&
    input.ownFunds === DEFAULT_OWN_FUNDS;

  /** Opens the repayment table with this result's loan, rate and duration. */
  const openRepaymentTable = () => {
    if (!result) return;
    const loan = useLoanStore.getState();
    if (rateMode === "custom") {
      loan.setInput({ annualRatePercent: input.annualRatePercent });
    } else {
      loan.setRateMode(rateMode);
    }
    loan.setInput({
      principal: Math.round(result.plan.loan),
      years: input.years,
      repaymentType: input.repaymentType,
    });
    router.push("/aflossing");
  };

  const goTo = (next: number) => {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={topRef} className="grid scroll-mt-4 gap-6">
      <AffordabilitySummaryBar result={result} isExample={isExample} />
      <Stepper step={step} onSelect={goTo} />

      <div
        className={cn(
          "grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]",
          // Steps: the summary grows to the height of the step card.
          // Result: long content on the left, so the summary keeps its own height.
          step === RESULT_STEP ? "items-start" : "items-stretch",
        )}
      >
        <div className="grid min-w-0 gap-6">
          {step === RESULT_STEP ? (
            result ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                  <div className="grid">
                    <span className="text-sm font-semibold">Je resultaat</span>
                    <span className="text-xs text-muted-foreground">
                      Pas je gegevens aan en het resultaat volgt meteen.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => goTo(0)}>
                      ← Gegevens aanpassen
                    </Button>
                    <Button onClick={openRepaymentTable}>
                      Bekijk aflossingstabel →
                    </Button>
                  </div>
                </div>
                <SituationPrompt onEdit={() => goTo(0)} />
                <ReadinessCard result={result} />
                <LifetimeCostCard
                  result={result}
                  ratePercent={input.annualRatePercent}
                  repaymentType={input.repaymentType}
                />
                <RentVsBuyCard
                  result={result}
                  ratePercent={input.annualRatePercent}
                  years={input.years}
                  repaymentType={input.repaymentType}
                />
                <FinancialPlanCard
                  plan={result.plan}
                  rule={registrationRule(input.region, input.deedYear)}
                />
                <BankComparison input={input} />
              </>
            ) : (
              <Card>
                <CardContent className="text-muted-foreground">
                  Controleer de ingevulde gegevens in de vorige stappen.
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="h-full gap-0 py-0 [--card-spacing:--spacing(6)]">
              <CardHeader className="gap-1 pt-5 pb-4">
                <span className="text-xs font-medium text-primary">
                  Stap {step + 1} van {RESULT_STEP}
                </span>
                <CardTitle className="text-lg">{steps[step].heading}</CardTitle>
                <CardDescription>{steps[step].description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-5">
                {step === 0 && <SituationStep onApplied={() => goTo(1)} />}
                {step === 1 && <BudgetStep errors={errors} />}
                {step === 2 && <HomeStep />}
                {step === 3 && <DetailsStep errors={errors} />}
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-4 border-t bg-muted/40 py-4">
                {step > 0 ? (
                  <Button variant="ghost" onClick={() => goTo(step - 1)}>
                    ← Vorige
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Deze stap is optioneel. Alles kan je later nog aanpassen.
                  </span>
                )}
                <Button size="lg" onClick={() => goTo(step + 1)}>
                  {step === RESULT_STEP - 1 ? "Bekijk resultaat" : "Volgende"} →
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        <aside className="hidden lg:flex lg:flex-col">
          <AffordabilitySummary
            result={result}
            input={input}
            rateMode={rateMode}
            isExample={isExample}
            onShowPlan={
              step === RESULT_STEP ? undefined : () => goTo(RESULT_STEP)
            }
          />
        </aside>
      </div>

      {step === RESULT_STEP && result && (
        <div className="lg:hidden">
          <AffordabilitySummary
            result={result}
            input={input}
            rateMode={rateMode}
            isExample={isExample}
          />
        </div>
      )}
    </div>
  );
}

function Stepper({
  step,
  onSelect,
}: {
  step: number;
  onSelect: (step: number) => void;
}) {
  return (
    <ol className="grid grid-cols-5 gap-2">
      {steps.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left text-sm transition-colors sm:px-3",
                active && "border-primary bg-primary/5 text-primary",
                done && "border-primary/30 text-foreground",
                !active && !done && "text-muted-foreground hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  active || done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className="hidden truncate font-medium sm:inline">
                {s.title}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Explains where the monthly payment and own funds in step 2 come from, as long
 * as they still match what step 1 proposed. Once the user changes them here,
 * the explanation disappears.
 */
function useStep1Origin(monthlyPayment: number, ownFunds: number) {
  const situation = useSituationStore((s) => s.situation);

  return useMemo(() => {
    const parsed = situationSchema.safeParse(situation);
    if (!parsed.success || !hasSituation(parsed.data)) return {};
    const s = parsed.data;
    const sum = summarizeSituation(s);
    const eur = formatEurRounded;

    let payment: React.ReactNode;
    if (sum.totalIncome > 0 && monthlyPayment === sum.comfortablePayment) {
      payment = (
        <>
          Uit stap 1: ± 30 % van je netto inkomen van {eur(sum.totalIncome)}
          {s.otherCredits > 0 &&
            `, min ${eur(s.otherCredits)} voor andere kredieten`}
          .
        </>
      );
    } else if (sum.totalIncome > 0 && monthlyPayment === sum.maxPayment) {
      payment = (
        <>
          Uit stap 1: het maximum dat een bank meestal nog aanvaardt bij een
          inkomen van {eur(sum.totalIncome)}.
        </>
      );
    }

    let funds: React.ReactNode;
    if (ownFunds === sum.suggestedOwnFunds) {
      const sources = [
        s.savings > 0 && "spaargeld",
        s.useInvestments && s.investments > 0 && "beleggingen",
        s.gift > 0 && "schenking",
      ].filter(Boolean) as string[];
      const what =
        sources.length > 1
          ? `${sources.slice(0, -1).join(", ")} en ${sources.at(-1)}`
          : sources[0];
      funds = (
        <>
          Uit stap 1: {eur(sum.totalAssets)}
          {what && ` ${what}`}
          {sum.buffer > 0 &&
            `, min ${eur(sum.buffer)} buffer${sum.bufferIsEstimate ? " (schatting)" : ""}`}
          , afgerond naar beneden.
        </>
      );
    }

    return { payment, ownFunds: funds };
  }, [situation, monthlyPayment, ownFunds]);
}

function BudgetStep({ errors }: { errors: Errors }) {
  const input = useAffordabilityStore((s) => s.input);
  const setInput = useAffordabilityStore((s) => s.setInput);
  const rateMode = useAffordabilityStore((s) => s.rateMode);
  const setRateMode = useAffordabilityStore((s) => s.setRateMode);
  const fromStep1 = useStep1Origin(input.monthlyPayment, input.ownFunds);

  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      <NumberField
        label="Gewenste maandlast"
        info={
          <InfoHint title="Gewenste maandlast">
            <MonthlyPaymentInfo />
          </InfoHint>
        }
        unit="€"
        value={input.monthlyPayment}
        onChange={(monthlyPayment) => setInput({ monthlyPayment })}
        min={300}
        max={4_000}
        step={25}
        hint={fromStep1.payment}
        error={errors.monthlyPayment}
      />
      <NumberField
        label="Eigen middelen"
        info={
          <InfoHint title="Eigen middelen">
            <OwnFundsInfo />
          </InfoHint>
        }
        unit="€"
        value={input.ownFunds}
        onChange={(ownFunds) => setInput({ ownFunds })}
        min={0}
        max={300_000}
        step={1_000}
        hint={
          fromStep1.ownFunds ?? (
            <>
              Spaargeld, schenkingen … Hiermee betaal je eerst de kosten en wat
              de bank niet leent (zie <Term id="quotiteit" />
              ).
            </>
          )
        }
        error={errors.ownFunds}
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
        min={10}
        max={30}
        step={1}
        error={errors.years}
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
      <div className="md:col-span-2">
        <RateHint
          years={input.years}
          mode={rateMode}
          onModeChange={setRateMode}
        />
      </div>
    </div>
  );
}

function HomeStep() {
  const input = useAffordabilityStore((s) => s.input);
  const setInput = useAffordabilityStore((s) => s.setInput);
  const enacted2027 = useFlanders2027Enacted();

  return (
    <div className="grid gap-6">
      <Segmented
        label="Gewest"
        info={
          <InfoHint title="Registratierechten per gewest" wide>
            <RegionInfo />
          </InfoHint>
        }
        value={input.region}
        options={regionOptions}
        onChange={(region) => setInput({ region })}
      />
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <Segmented
          label="Ondertekening notariële akte"
          info={
            <InfoHint title="Wanneer teken je de akte?">
              <DeedYearInfo />
            </InfoHint>
          }
          value={input.deedYear}
          options={deedYearOptions}
          onChange={(deedYear) => setInput({ deedYear })}
          hint={
            input.region === "flanders" ? (
              <>
                In Vlaanderen 2 % <Term id="registratierechten" /> voor je{" "}
                <Term id="enigeEigenWoning" /> in 2026. Vanaf 2027{" "}
                {enacted2027 ? "geldt 3 %" : "is 3 % aangekondigd"}. Telt: datum
                van de <Term id="notarieleAkte" />, niet van het{" "}
                <Term id="compromis" />.
              </>
            ) : input.region === "wallonia" ? (
              <>
                In Wallonië 3 % <Term id="registratierechten" /> voor je{" "}
                <Term id="enigeEigenWoning" />. De datum van de akte verandert
                hier niets.
              </>
            ) : (
              <>
                In Brussel geen <Term id="registratierechten" /> op de eerste
                €&nbsp;200.000 (prijs tot €&nbsp;600.000). De datum van de akte
                verandert hier niets.
              </>
            )
          }
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
          options={repaymentOptions}
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
      </div>
    </div>
  );
}

function DetailsStep({ errors }: { errors: Errors }) {
  const input = useAffordabilityStore((s) => s.input);
  const setInput = useAffordabilityStore((s) => s.setInput);

  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      <NumberField
        label="Maximale quotiteit"
        info={
          <InfoHint title="Quotiteit">
            <LtvInfo />
          </InfoHint>
        }
        unit="%"
        value={toPercent(input.maxLtv)}
        onChange={(v) => setInput({ maxLtv: fromPercent(v) })}
        min={70}
        max={100}
        step={5}
        hint={
          <>
            Hoeveel van de aankoopprijs de bank maximaal leent (
            <Term id="quotiteit" />
            ). Voor starters meestal 90 %.
          </>
        }
        error={errors.maxLtv}
      />
      <NumberField
        label="Hypothecaire inschrijving"
        info={
          <InfoHint title="Inschrijving of mandaat?">
            <InscriptionInfo />
          </InfoHint>
        }
        unit="%"
        value={toPercent(input.inscriptionShare)}
        onChange={(v) => setInput({ inscriptionShare: fromPercent(v) })}
        min={0}
        max={100}
        step={10}
        hint={
          <>
            De rest is een <Term id="hypothecairMandaat" />: goedkoper, maar
            niet elke bank aanvaardt het.
          </>
        }
        error={errors.inscriptionShare}
      />
      <NumberField
        label="Netto gezinsinkomen per maand"
        info={
          <InfoHint title="Netto gezinsinkomen">
            <IncomeInfo />
          </InfoHint>
        }
        unit="€"
        value={input.netIncome ?? Number.NaN}
        onChange={(v) =>
          setInput({ netIncome: Number.isFinite(v) ? v : undefined })
        }
        min={0}
        max={10_000}
        step={50}
        showSlider={false}
        hint={
          <>
            Optioneel. Om je <Term id="schuldratio" /> te berekenen.
          </>
        }
      />
      <div className="grid gap-6">
        <NumberField
          label="Dossierkosten bank"
          info={
            <InfoHint title="Dossierkosten">
              <FileCostsInfo />
            </InfoHint>
          }
          unit="€"
          value={input.fileCosts}
          onChange={(fileCosts) => setInput({ fileCosts })}
          min={0}
          max={1_000}
          step={10}
          showSlider={false}
          error={errors.fileCosts}
        />
        <NumberField
          label="Schattingskosten"
          info={
            <InfoHint title="Schattingskosten">
              <ValuationInfo />
            </InfoHint>
          }
          unit="€"
          value={input.valuationCosts}
          onChange={(valuationCosts) => setInput({ valuationCosts })}
          min={0}
          max={1_000}
          step={10}
          showSlider={false}
          error={errors.valuationCosts}
        />
      </div>
    </div>
  );
}
