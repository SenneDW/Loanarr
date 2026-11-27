import { z } from "zod";
import type { AffordabilityResult } from "./affordability";

/**
 * Minimum monthly living money banks typically want left after loan payments.
 * Banks use their own internal figures; these are conservative estimates for Belgium
 * (late 2026), shown and editable in the UI.
 */
export const LIVING_MINIMUM = {
  single: 1_100,
  couple: 1_700,
  perChild: 350,
} as const;

/** Share of net income that stays comfortable (banks accept up to about one third). */
export const COMFORTABLE_RATIO = 0.3;
export const MAX_RATIO = 1 / 3;

export const households = ["single", "couple"] as const;
export type Household = (typeof households)[number];

const euro = (msg: string) =>
  z
    .number({ error: msg })
    .min(0, { error: "Bedragen kunnen niet negatief zijn." })
    .max(100_000_000, { error: "Het bedrag is te hoog." });

// Validation messages are user-facing, so they are in Dutch.
export const situationSchema = z.object({
  household: z.enum(households),
  children: z.number().int().min(0).max(10),
  /** Net monthly income per person. */
  income1: euro("Vul je netto inkomen in."),
  income2: euro("Vul het netto inkomen van je partner in."),
  savings: euro("Vul je spaargeld in."),
  investments: euro("Vul je beleggingen in."),
  useInvestments: z.boolean(),
  /** Gift or help from family, in EUR. */
  gift: euro("Vul de schenking in."),
  /** Current monthly rent or housing cost. */
  rent: euro("Vul je huidige huur in."),
  /** Monthly payments on other loans (car, personal loan). */
  otherCredits: euro("Vul je andere kredieten in."),
  /**
   * Savings to keep aside as an emergency buffer, in EUR.
   * Undefined: use our estimate ({@link ESTIMATE_BUFFER_MONTHS} months of costs).
   */
  buffer: euro("Vul je buffer in.").optional(),
});

export type Situation = z.infer<typeof situationSchema>;

/** Months of monthly costs we suggest keeping aside when the user sets no buffer. */
export const ESTIMATE_BUFFER_MONTHS = 6;

export interface SituationSummary {
  totalIncome: number;
  livingMinimum: number;
  /**
   * What a month costs once you own the home: living money, the comfortable
   * loan payment and other loans. The basis for our buffer estimate.
   */
  monthlyCosts: number;
  /** Savings kept aside as an emergency buffer. */
  buffer: number;
  /** True when {@link buffer} is our estimate, not an amount the user typed. */
  bufferIsEstimate: boolean;
  /** All money that could go into the purchase (savings + investments + gift). */
  totalAssets: number;
  /** What we suggest putting into the purchase: assets minus the buffer. */
  suggestedOwnFunds: number;
  /** About 30 % of income, minus other loans. */
  comfortablePayment: number;
  /** What a bank would likely still accept: ⅓ of income and enough living money left. */
  maxPayment: number;
}

const floorTo = (n: number, step: number) =>
  Math.max(0, Math.floor(n / step) * step);

export function livingMinimum(s: Pick<Situation, "household" | "children">) {
  return (
    (s.household === "couple" ? LIVING_MINIMUM.couple : LIVING_MINIMUM.single) +
    s.children * LIVING_MINIMUM.perChild
  );
}

/** A buffer of `months` months of costs, rounded to €100. */
export function estimateBuffer(monthlyCosts: number, months: number) {
  return Math.round((monthlyCosts * months) / 100) * 100;
}

export function summarizeSituation(raw: Situation): SituationSummary {
  const s = situationSchema.parse(raw);
  const totalIncome = s.income1 + (s.household === "couple" ? s.income2 : 0);
  const living = livingMinimum(s);
  const totalAssets =
    s.savings + (s.useInvestments ? s.investments : 0) + s.gift;

  const byRatio = totalIncome * MAX_RATIO - s.otherCredits;
  const byLiving = totalIncome - living - s.otherCredits;
  const maxPayment = floorTo(Math.min(byRatio, byLiving), 10);
  const comfortablePayment = Math.min(
    floorTo(totalIncome * COMFORTABLE_RATIO - s.otherCredits, 10),
    maxPayment,
  );

  // Once you own the home, the loan payment is part of what a month costs:
  // a buffer that ignores it runs out fast.
  const monthlyCosts = living + comfortablePayment + s.otherCredits;
  const bufferIsEstimate = s.buffer === undefined;
  const buffer =
    s.buffer ?? estimateBuffer(monthlyCosts, ESTIMATE_BUFFER_MONTHS);

  return {
    totalIncome,
    livingMinimum: living,
    monthlyCosts,
    buffer,
    bufferIsEstimate,
    totalAssets,
    suggestedOwnFunds: floorTo(totalAssets - buffer, 500),
    comfortablePayment,
    maxPayment,
  };
}

export type CheckStatus = "good" | "warn" | "bad";

export interface ReadinessCheck {
  id: "ownFunds" | "debtRatio" | "livingMoney" | "buffer" | "rentStep";
  status: CheckStatus;
  /** Dutch, user-facing. */
  title: string;
  detail: string;
}

const eur = (n: number) =>
  new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
const pct = (n: number) =>
  new Intl.NumberFormat("nl-BE", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(n);

/** Traffic-light checks for a situation and a calculated purchase. */
export function readinessChecks(
  situation: Situation,
  result: AffordabilityResult,
): ReadinessCheck[] {
  const s = summarizeSituation(situation);
  const payment = result.monthlyPayment;
  const { plan } = result;
  const checks: ReadinessCheck[] = [];

  // 1. Own funds: costs plus at least 10 % of the price.
  checks.push(
    plan.ltv <= 0.9 + 1e-9
      ? {
          id: "ownFunds",
          status: "good",
          title: "Eigen inbreng volstaat",
          detail: `Je lening is ${pct(plan.ltv)} van de prijs: binnen wat banken standaard toestaan.`,
        }
      : plan.ltv <= 1
        ? {
            id: "ownFunds",
            status: "warn",
            title: "Eigen inbreng is krap",
            detail: `Je leent ${pct(plan.ltv)} van de prijs. Boven 90 % lenen kan enkel uitzonderlijk en meestal met een hogere rente.`,
          }
        : {
            id: "ownFunds",
            status: "bad",
            title: "Te weinig eigen inbreng",
            detail:
              "Je eigen middelen dekken de kosten niet. Banken lenen geen notaris- en registratiekosten.",
          },
  );

  if (s.totalIncome > 0) {
    // 2. Debt ratio, including other loans.
    const ratio = (payment + situation.otherCredits) / s.totalIncome;
    checks.push({
      id: "debtRatio",
      status:
        ratio <= MAX_RATIO + 0.005 ? "good" : ratio <= 0.4 ? "warn" : "bad",
      title: `Schuldratio ${pct(ratio)}`,
      detail:
        ratio <= MAX_RATIO + 0.005
          ? "Je leningen samen blijven onder een derde van je netto inkomen."
          : "Meer dan een derde van je inkomen gaat naar leningen. Veel banken weigeren dat of vragen meer eigen inbreng.",
    });

    // 3. Living money left.
    const left = s.totalIncome - payment - situation.otherCredits;
    checks.push({
      id: "livingMoney",
      status:
        left >= s.livingMinimum
          ? "good"
          : left >= s.livingMinimum * 0.85
            ? "warn"
            : "bad",
      title: `${eur(left)} per maand om van te leven`,
      detail: `Banken willen doorgaans minstens ±${eur(s.livingMinimum)} leefgeld voor jouw gezin (schatting).`,
    });
  }

  // 4. Buffer left after the purchase.
  const usedOwnFunds = plan.ownFunds;
  const left = s.totalAssets - usedOwnFunds;
  checks.push({
    id: "buffer",
    status: left >= s.buffer ? "good" : left >= s.buffer * 0.5 ? "warn" : "bad",
    title: `Buffer na aankoop: ${eur(Math.max(0, left))}`,
    detail:
      s.buffer === 0
        ? "Je koos geen buffer. Hou toch wat opzij voor verhuis en onverwachte kosten."
        : s.bufferIsEstimate
          ? `Hou best ±${eur(s.buffer)} achter de hand: ${ESTIMATE_BUFFER_MONTHS} maanden aan leefgeld en maandlasten (schatting).`
          : `Je wil ${eur(s.buffer)} achter de hand houden.`,
  });

  // 5. Step up from the current rent.
  if (situation.rent > 0) {
    const step = payment / situation.rent;
    checks.push({
      id: "rentStep",
      status: step <= 1.25 ? "good" : step <= 1.6 ? "warn" : "bad",
      title:
        step <= 1
          ? `Maandlast lager dan je huur (${eur(situation.rent)})`
          : `Maandlast ${pct(step - 1)} hoger dan je huur`,
      detail:
        step <= 1.25
          ? "Een vertrouwd bedrag: je weet al dat je dit kan dragen."
          : "Een flinke stap. Probeer een paar maanden het verschil opzij te zetten: zo test je of het haalbaar is.",
    });
  }

  return checks;
}
