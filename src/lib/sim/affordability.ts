import Decimal from "decimal.js";
import { z } from "zod";
import {
  type CreditCosts,
  creditCosts,
  type PurchaseCosts,
  purchaseCosts,
} from "./costs";
import { equivalentMonthlyRate, simulateLoan } from "./loan";
import { deedYears, regions } from "./tariffs";
import { repaymentTypes } from "./types";

// Validation messages are user-facing, so they are in Dutch.
export const affordabilityInputSchema = z.object({
  /** Desired (maximum) monthly payment in EUR. */
  monthlyPayment: z
    .number({ error: "Vul een maandlast in." })
    .positive({ error: "De maandlast moet groter zijn dan € 0." })
    .max(50_000, { error: "De maandlast is te hoog." }),
  /** Own funds (eigen middelen) in EUR. */
  ownFunds: z
    .number({ error: "Vul je eigen middelen in." })
    .min(0, { error: "Eigen middelen kunnen niet negatief zijn." })
    .max(10_000_000, { error: "Het bedrag is te hoog." }),
  annualRatePercent: z
    .number({ error: "Vul een rentevoet in." })
    .min(0, { error: "De rentevoet kan niet negatief zijn." })
    .max(30, { error: "De rentevoet mag maximaal 30 % zijn." }),
  years: z
    .number({ error: "Vul een looptijd in." })
    .int({ error: "De looptijd moet een geheel aantal jaren zijn." })
    .min(1, { error: "De looptijd moet minstens 1 jaar zijn." })
    .max(40, { error: "De looptijd mag maximaal 40 jaar zijn." }),
  repaymentType: z.enum(repaymentTypes),
  region: z.enum(regions),
  deedYear: z.union(deedYears.map((y) => z.literal(y))),
  /** Maximum loan-to-value as a fraction of the price, e.g. 0.9. */
  maxLtv: z.number().min(0.5).max(1.25),
  /** Fraction of the loan secured by inscription (rest: mandate). */
  inscriptionShare: z.number().min(0).max(1),
  fileCosts: z
    .number({ error: "Vul de dossierkosten in." })
    .min(0, { error: "Kosten kunnen niet negatief zijn." }),
  valuationCosts: z
    .number({ error: "Vul de schattingskosten in." })
    .min(0, { error: "Kosten kunnen niet negatief zijn." }),
  purchaseExpenses: z.number().min(0),
  creditExpenses: z.number().min(0),
  /** Optional net household income per month, for the debt ratio. */
  netIncome: z.number().min(0).optional(),
});

export type AffordabilityInput = z.infer<typeof affordabilityInputSchema>;

/** Largest loan whose (first) monthly payment fits the budget. */
export function maxLoanForPayment(
  monthlyPayment: number,
  annualRatePercent: number,
  years: number,
  repaymentType: "annuity" | "linear",
): number {
  const n = years * 12;
  const i = equivalentMonthlyRate(annualRatePercent);
  const m = new Decimal(monthlyPayment);
  let loan: Decimal;
  if (i.isZero()) {
    loan = m.times(n);
  } else if (repaymentType === "annuity") {
    loan = m.times(new Decimal(1).minus(i.plus(1).pow(-n))).div(i);
  } else {
    // Linear: first payment = L/n + L*i, the highest payment of the loan.
    loan = m.div(new Decimal(1).div(n).plus(i));
  }
  return loan.toDecimalPlaces(2, Decimal.ROUND_DOWN).toNumber();
}

export interface FinancialPlan {
  price: number;
  purchase: PurchaseCosts;
  credit: CreditCosts;
  fileCosts: number;
  valuationCosts: number;
  /** Price plus all costs. */
  totalExpenses: number;
  loan: number;
  ownFunds: number;
  /** loan / price */
  ltv: number;
}

/**
 * Financial plan for a given price: expenses = loan + own funds.
 * The credit costs depend on the loan, which depends on the costs, so the loan is
 * found by fixed-point iteration (it converges in a few steps since costs are ~2 %).
 */
export function financialPlan(
  price: number,
  input: AffordabilityInput,
): FinancialPlan {
  const purchase = purchaseCosts(
    price,
    input.region,
    input.deedYear,
    input.purchaseExpenses,
  );
  const fixedCosts = purchase.total + input.fileCosts + input.valuationCosts;

  let loan = 0;
  let credit = creditCosts(0, input.inscriptionShare, input.creditExpenses);
  for (let k = 0; k < 50; k++) {
    const needed = price + fixedCosts + credit.total - input.ownFunds;
    const next = Math.max(Math.ceil(needed * 100) / 100, 0);
    credit = creditCosts(next, input.inscriptionShare, input.creditExpenses);
    if (Math.abs(next - loan) < 0.005) {
      loan = next;
      break;
    }
    loan = next;
  }

  const totalExpenses = round2(price + fixedCosts + credit.total);
  // Own funds actually used, so that loan + own funds = expenses to the cent.
  const ownFunds = round2(totalExpenses - loan);
  return {
    price,
    purchase,
    credit,
    fileCosts: input.fileCosts,
    valuationCosts: input.valuationCosts,
    totalExpenses,
    loan,
    ownFunds,
    ltv: price > 0 ? loan / price : 0,
  };
}

export type LimitingFactor = "payment" | "ltv";

export interface AffordabilityResult {
  maxLoanForPayment: number;
  maxPrice: number;
  plan: FinancialPlan;
  /** What stops the price from going higher. */
  limitedBy: LimitingFactor;
  /** Monthly payment for the plan's loan (first payment for linear loans). */
  monthlyPayment: number;
  /** Monthly payment / net income, when income is given. */
  debtRatio?: number;
  /** What the loan costs over its full term. */
  lifetime: LoanLifetime;
}

export interface LoanLifetime {
  years: number;
  /** All monthly payments added up (capital + interest). */
  totalRepaid: number;
  totalInterest: number;
  /** Last monthly payment (differs from the first for linear loans). */
  lastPayment: number;
  /** Interest plus all one-off purchase and loan costs. */
  totalCostOfBuying: number;
  /** Price + one-off costs + interest: what the home costs you in the end. */
  totalHomeCost: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Highest purchase price (whole euros) for which both hold:
 * - the loan fits the monthly budget, and
 * - the loan does not exceed maxLtv × price.
 * Both constraints are monotone in the price, so a binary search finds the limit.
 */
export function maxPurchasePrice(
  rawInput: AffordabilityInput,
): AffordabilityResult {
  const input = affordabilityInputSchema.parse(rawInput);
  const loanCap = maxLoanForPayment(
    input.monthlyPayment,
    input.annualRatePercent,
    input.years,
    input.repaymentType,
  );

  const feasible = (price: number) => {
    const plan = financialPlan(price, input);
    return plan.loan <= loanCap && plan.loan <= input.maxLtv * price;
  };

  let lo = 0;
  let hi = Math.ceil(loanCap + input.ownFunds) + 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (feasible(mid)) lo = mid;
    else hi = mid;
  }

  const plan = financialPlan(lo, input);
  const above = financialPlan(lo + 1, input);
  const limitedBy: LimitingFactor = above.loan > loanCap ? "payment" : "ltv";

  const i = equivalentMonthlyRate(input.annualRatePercent);
  const n = input.years * 12;
  let monthly: Decimal;
  if (plan.loan === 0) monthly = new Decimal(0);
  else if (i.isZero()) monthly = new Decimal(plan.loan).div(n);
  else if (input.repaymentType === "annuity")
    monthly = new Decimal(plan.loan)
      .times(i)
      .div(new Decimal(1).minus(i.plus(1).pow(-n)));
  else
    monthly = new Decimal(plan.loan)
      .div(n)
      .plus(new Decimal(plan.loan).times(i));
  const monthlyPayment = monthly.toDecimalPlaces(2).toNumber();

  const schedule =
    plan.loan > 0
      ? simulateLoan({
          principal: plan.loan,
          annualRatePercent: input.annualRatePercent,
          years: input.years,
          repaymentType: input.repaymentType,
        })
      : undefined;
  const totalInterest = schedule?.totalInterest ?? 0;
  const oneOffCosts = round2(plan.totalExpenses - plan.price);
  const lifetime: LoanLifetime = {
    years: input.years,
    totalRepaid: schedule?.totalPaid ?? 0,
    totalInterest,
    lastPayment: schedule?.lastPayment ?? 0,
    totalCostOfBuying: round2(totalInterest + oneOffCosts),
    totalHomeCost: round2(plan.price + oneOffCosts + totalInterest),
  };

  return {
    lifetime,
    maxLoanForPayment: loanCap,
    maxPrice: lo,
    plan,
    limitedBy,
    monthlyPayment,
    debtRatio:
      input.netIncome && input.netIncome > 0
        ? monthlyPayment / input.netIncome
        : undefined,
  };
}
