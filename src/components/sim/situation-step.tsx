"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";
import { Term } from "@/components/term";
import { Button } from "@/components/ui/button";
import { formatEurRounded, formatPercent } from "@/lib/format";
import {
  affordabilityInputSchema,
  maxPurchasePrice,
} from "@/lib/sim/affordability";
import {
  type Household,
  situationSchema,
  summarizeSituation,
} from "@/lib/sim/situation";
import { cn } from "@/lib/utils";
import { useAffordabilityStore } from "@/stores/affordability-store";
import { hasSituation, useSituationStore } from "@/stores/situation-store";
import { InfoHint } from "./info-hint";
import { NumberField } from "./number-field";
import { Segmented } from "./segmented";

const householdOptions: ReadonlyArray<{ value: Household; label: string }> = [
  { value: "single", label: "Alleen" },
  { value: "couple", label: "Met twee" },
];

/** Step 0: the user's financial situation, turned into a suggested budget. */
export function SituationStep({ onApplied }: { onApplied: () => void }) {
  const situation = useSituationStore((s) => s.situation);
  const set = useSituationStore((s) => s.setSituation);
  const couple = situation.household === "couple";
  const num = (v: number) => (Number.isFinite(v) ? v : 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <Segmented
          label="Huishouden"
          value={situation.household}
          options={householdOptions}
          onChange={(household) => set({ household })}
        />
        <NumberField
          label="Kinderen ten laste"
          unit=""
          value={situation.children}
          onChange={(v) => set({ children: Math.round(num(v)) })}
          min={0}
          max={6}
          step={1}
        />
        <NumberField
          label={couple ? "Jouw netto inkomen" : "Netto inkomen"}
          unit="€"
          value={situation.income1}
          onChange={(v) => set({ income1: num(v) })}
          min={0}
          max={6_000}
          step={50}
          hint="Per maand, wat er op je rekening komt (zonder vakantiegeld)."
        />
        {couple ? (
          <NumberField
            label="Netto inkomen partner"
            unit="€"
            value={situation.income2}
            onChange={(v) => set({ income2: num(v) })}
            min={0}
            max={6_000}
            step={50}
          />
        ) : (
          <div className="hidden md:block" />
        )}
        <NumberField
          label="Spaargeld"
          unit="€"
          value={situation.savings}
          onChange={(v) => set({ savings: num(v) })}
          min={0}
          max={200_000}
          step={1_000}
        />
        <div className="grid content-start gap-2">
          <NumberField
            label="Beleggingen"
            unit="€"
            value={situation.investments}
            onChange={(v) => set({ investments: num(v) })}
            min={0}
            max={200_000}
            step={1_000}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={situation.useInvestments}
              onChange={(e) => set({ useInvestments: e.target.checked })}
              className="size-4 accent-[var(--primary)]"
            />
            Gebruiken voor de aankoop
          </label>
        </div>
        <NumberField
          label="Schenking of hulp van familie"
          unit="€"
          value={situation.gift}
          onChange={(v) => set({ gift: num(v) })}
          min={0}
          max={200_000}
          step={1_000}
        />
        <NumberField
          label="Huidige huur per maand"
          unit="€"
          value={situation.rent}
          onChange={(v) => set({ rent: num(v) })}
          min={0}
          max={3_000}
          step={25}
          hint="Om kopen en huren te vergelijken. Woon je bij je ouders, laat dan 0 staan."
        />
        <NumberField
          label="Andere kredieten per maand"
          unit="€"
          value={situation.otherCredits}
          onChange={(v) => set({ otherCredits: num(v) })}
          min={0}
          max={2_000}
          step={25}
          showSlider={false}
          hint="Autolening, persoonlijke lening … Die tellen mee voor de bank."
        />
        <NumberField
          label="Buffer die je wil houden"
          info={
            <InfoHint title="Buffer">
              <p>
                Een <Term id="buffer" /> is spaargeld dat je níet in de woning
                steekt. Nieuwe eigenaars krijgen vaak onverwachte kosten
                (verhuis, herstellingen). 3 tot 6 maanden <Term id="leefgeld" />{" "}
                is een goede vuistregel.
              </p>
            </InfoHint>
          }
          unit="mnd"
          value={situation.bufferMonths}
          onChange={(v) => set({ bufferMonths: Math.round(num(v)) })}
          min={0}
          max={12}
          step={1}
        />
      </div>

      <Proposal onApplied={onApplied} />

      <p className="text-xs text-muted-foreground">
        Je gegevens blijven in je browser en worden nergens naartoe gestuurd.
        Fiscaal voordeel (de vroegere <Term id="woonbonus" />) bestaat niet meer
        voor nieuwe leningen en rekenen we dus niet mee.
      </p>
    </div>
  );
}

function Proposal({ onApplied }: { onApplied: () => void }) {
  const situation = useSituationStore((s) => s.situation);
  const input = useAffordabilityStore((s) => s.input);
  const setInput = useAffordabilityStore((s) => s.setInput);

  const data = useMemo(() => {
    const parsed = situationSchema.safeParse(situation);
    if (!parsed.success || !hasSituation(parsed.data)) return null;
    const summary = summarizeSituation(parsed.data);
    const scenario = (monthlyPayment: number) => {
      const candidate = {
        ...input,
        monthlyPayment,
        ownFunds: summary.suggestedOwnFunds,
        netIncome: summary.totalIncome || undefined,
      };
      const ok = affordabilityInputSchema.safeParse(candidate);
      return ok.success && monthlyPayment > 0
        ? { monthlyPayment, maxPrice: maxPurchasePrice(ok.data).maxPrice }
        : { monthlyPayment, maxPrice: undefined };
    };
    return {
      summary,
      comfortable: scenario(summary.comfortablePayment),
      maximal: scenario(summary.maxPayment),
    };
  }, [situation, input]);

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Vul je inkomen en spaargeld in: dan stellen we een maandlast en eigen
        inbreng voor die bij jou past.
      </div>
    );
  }

  const { summary } = data;
  const apply = (monthlyPayment: number) => {
    setInput({
      monthlyPayment,
      ownFunds: summary.suggestedOwnFunds,
      netIncome: summary.totalIncome || undefined,
    });
    onApplied();
  };
  const current =
    input.monthlyPayment === data.comfortable.monthlyPayment
      ? "comfortable"
      : input.monthlyPayment === data.maximal.monthlyPayment
        ? "maximal"
        : undefined;

  return (
    <div className="grid gap-3 rounded-xl bg-primary/5 p-4 ring-1 ring-primary/15">
      <div className="grid gap-1 text-sm">
        <span className="font-semibold">Voorstel voor jou</span>
        <span className="text-xs text-muted-foreground">
          Inkomen {formatEurRounded(summary.totalIncome)}/maand · eigen inbreng{" "}
          {formatEurRounded(summary.suggestedOwnFunds)} (
          {formatEurRounded(summary.totalAssets)} min{" "}
          {formatEurRounded(summary.buffer)} buffer)
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ScenarioCard
          title="Comfortabel"
          subtitle={`±${formatPercent(0.3)} van je inkomen`}
          monthly={data.comfortable.monthlyPayment}
          maxPrice={data.comfortable.maxPrice}
          active={current === "comfortable"}
          onApply={() => apply(data.comfortable.monthlyPayment)}
          recommended
        />
        <ScenarioCard
          title="Maximaal"
          subtitle="wat een bank meestal nog aanvaardt"
          monthly={data.maximal.monthlyPayment}
          maxPrice={data.maximal.maxPrice}
          active={current === "maximal"}
          onApply={() => apply(data.maximal.monthlyPayment)}
        />
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  subtitle,
  monthly,
  maxPrice,
  active,
  onApply,
  recommended = false,
}: {
  title: string;
  subtitle: string;
  monthly: number;
  maxPrice?: number;
  active: boolean;
  onApply: () => void;
  recommended?: boolean;
}) {
  const disabled = monthly <= 0;
  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border bg-card p-3",
        active && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid">
          <span className="text-sm font-semibold">
            {title}
            {recommended && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                aangeraden
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm tabular-nums">
        <div className="grid">
          <span className="text-xs text-muted-foreground">Maandlast</span>
          <strong>{disabled ? "—" : formatEurRounded(monthly)}</strong>
        </div>
        <div className="grid">
          <span className="text-xs text-muted-foreground">Max. aankoop</span>
          <strong>
            {maxPrice === undefined ? "—" : formatEurRounded(maxPrice)}
          </strong>
        </div>
      </div>
      <Button
        size="sm"
        variant={active ? "secondary" : "default"}
        disabled={disabled}
        onClick={onApply}
      >
        {active ? (
          <>
            <Check className="size-4" aria-hidden /> Gekozen
          </>
        ) : (
          "Gebruik dit →"
        )}
      </Button>
      {disabled && (
        <span className="text-xs text-destructive">
          Met dit inkomen blijft er te weinig leefgeld over voor een lening.
        </span>
      )}
    </div>
  );
}
