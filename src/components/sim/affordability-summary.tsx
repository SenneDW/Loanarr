import { Term } from "@/components/term";
import { Card, CardContent } from "@/components/ui/card";
import { formatEur, formatEurRounded, formatPercent } from "@/lib/format";
import type {
  AffordabilityInput,
  AffordabilityResult,
} from "@/lib/sim/affordability";
import type { RateMode } from "@/stores/rate-sync";

const RATE_SOURCE: Record<RateMode, string> = {
  market: "marktrente",
  forecast: "verwacht",
  banks: "tarieflijst",
  custom: "eigen",
};

/** Live summary shown next to the steps (desktop) so results are always in view. */
export function AffordabilitySummary({
  result,
  input,
  rateMode,
  isExample = false,
  onShowPlan,
}: {
  result: AffordabilityResult | null;
  input: AffordabilityInput;
  /** Where the rate comes from, shown next to it. */
  rateMode: RateMode;
  /** True while the result still uses our starting values, not the user's. */
  isExample?: boolean;
  onShowPlan?: () => void;
}) {
  if (!result) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          Controleer de ingevulde gegevens om je maximale aankoopbedrag te zien.
        </CardContent>
      </Card>
    );
  }

  const { plan } = result;
  const costs = plan.totalExpenses - plan.price;

  return (
    <Card className="h-full gap-0 py-0">
      <div className="grid gap-1 bg-primary px-5 py-5 text-primary-foreground">
        <span className="text-sm text-primary-foreground/80">
          Maximaal aankoopbedrag
        </span>
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {formatEur(result.maxPrice)}
        </span>
        <span className="text-sm text-primary-foreground/80">
          {isExample
            ? `Voorbeeld met ${formatEurRounded(input.monthlyPayment)}/maand en ${formatEurRounded(input.ownFunds)} eigen middelen. Vul stap 1 in voor jouw bedrag.`
            : result.limitedBy === "payment"
              ? "Beperkt door je gewenste maandlast."
              : `Beperkt door de maximale quotiteit van ${formatPercent(input.maxLtv)}. Met meer eigen middelen kan je duurder kopen.`}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-sm tabular-nums">
        <SummaryItem label="Lening" value={formatEur(plan.loan)} />
        <SummaryItem
          label={
            input.repaymentType === "annuity" ? "Maandlast" : "Eerste maandlast"
          }
          value={formatEur(result.monthlyPayment)}
        />
        <SummaryItem
          label={<Term id="quotiteit" cap />}
          value={formatPercent(plan.ltv)}
        />
        <SummaryItem label="Kosten" value={formatEur(costs)} />
        <SummaryItem
          label={`Rentevoet (${RATE_SOURCE[rateMode]})`}
          value={formatPercent(input.annualRatePercent / 100, 2)}
        />
        <SummaryItem label="Looptijd" value={`${input.years} jaar`} />
      </dl>
      {plan.loan > 0 && (
        <div className="grid gap-1.5 border-t px-5 py-4 text-sm tabular-nums">
          <span className="text-xs font-medium text-muted-foreground">
            Na {result.lifetime.years} jaar
          </span>
          <div className="flex justify-between gap-3">
            <span>Totaal terugbetaald</span>
            <strong>{formatEur(result.lifetime.totalRepaid)}</strong>
          </div>
          <div className="flex justify-between gap-3 text-muted-foreground">
            <span>
              waarvan <Term id="interest">interest</Term>
            </span>
            <span className="text-chart-4 font-medium">
              {formatEur(result.lifetime.totalInterest)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Woning kost je in totaal</span>
            <strong>{formatEur(result.lifetime.totalHomeCost)}</strong>
          </div>
        </div>
      )}
      {result.debtRatio !== undefined && (
        <p
          className={`mx-5 mb-4 rounded-md px-3 py-2 text-xs ${
            result.debtRatio > 1 / 3
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          <Term id="schuldratio" cap />{" "}
          <strong>{formatPercent(result.debtRatio)}</strong> van je netto
          inkomen.{" "}
          {result.debtRatio > 1 / 3
            ? "Meer dan een derde: banken aanvaarden dat niet altijd."
            : "Banken aanvaarden meestal tot ongeveer een derde."}
        </p>
      )}
      {onShowPlan && (
        <button
          type="button"
          onClick={onShowPlan}
          className="mt-auto border-t px-5 py-3 text-left text-sm font-medium text-primary hover:bg-accent"
        >
          Bekijk het volledige financieel plan →
        </button>
      )}
    </Card>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: React.ReactNode;
  value: string;
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

/** Compact bar that sticks to the top on small screens. */
export function AffordabilitySummaryBar({
  result,
  isExample = false,
}: {
  result: AffordabilityResult | null;
  isExample?: boolean;
}) {
  if (!result) return null;
  return (
    <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-4 border-b bg-primary px-4 py-2.5 text-primary-foreground sm:-mx-6 sm:px-6 lg:hidden">
      <div className="grid">
        <span className="text-xs text-primary-foreground/80">
          {isExample ? "Voorbeeld · vul stap 1 in" : "Maximaal aankoopbedrag"}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {formatEur(result.maxPrice)}
        </span>
      </div>
      <div className="grid text-right">
        <span className="text-xs text-primary-foreground/80">Maandlast</span>
        <span className="font-semibold tabular-nums">
          {formatEur(result.monthlyPayment)}
        </span>
      </div>
    </div>
  );
}
