import { simulateLoan } from "./loan";
import type { RepaymentType } from "./types";

/** Editable assumptions; defaults are typical for Belgium (late 2026). */
export interface RentVsBuyAssumptions {
  /** Yearly home value growth, e.g. 0.02. */
  homeGrowth: number;
  /** Yearly rent indexation, e.g. 0.02. */
  rentGrowth: number;
  /** Yearly net return when investing instead of buying, e.g. 0.04. */
  investReturn: number;
  /** Maintenance per year as a share of the home value, e.g. 0.01. */
  maintenanceRate: number;
  /** Property tax (onroerende voorheffing) per year in EUR. */
  propertyTax: number;
  /** Fire and debt-balance insurance per year in EUR (rough estimate). */
  insurance: number;
}

export const DEFAULT_ASSUMPTIONS: RentVsBuyAssumptions = {
  homeGrowth: 0.02,
  rentGrowth: 0.02,
  investReturn: 0.04,
  maintenanceRate: 0.01,
  propertyTax: 1_000,
  insurance: 700,
};

export interface RentVsBuyInput {
  price: number;
  loan: number;
  /** Everything paid upfront: own funds used (price + costs − loan). */
  upfront: number;
  annualRatePercent: number;
  years: number;
  repaymentType: RepaymentType;
  /** Current monthly rent. */
  rent: number;
  /** How many years to compare. */
  horizon: number;
  assumptions?: RentVsBuyAssumptions;
}

export interface YearPoint {
  year: number;
  /** Home value minus remaining loan, plus anything the buyer invested. */
  buyWealth: number;
  /** What the renter has after investing the upfront money and any savings. */
  rentWealth: number;
  buyMonthlyCost: number;
  rentMonthly: number;
}

export interface RentVsBuyResult {
  points: YearPoint[];
  /** First year in which buying leaves you better off, if within the horizon. */
  breakEvenYear?: number;
  final: YearPoint;
}

/**
 * Compares the wealth of buying vs. renting year by year.
 *
 * Buying: you pay the upfront money, the loan payments and owner costs (maintenance,
 * property tax, insurance); your wealth is the home value minus the remaining loan.
 * Renting: you invest the same upfront money; each year, whoever pays less invests the
 * difference. Selling costs and taxes on investment gains are ignored.
 */
export function compareRentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
  const a = input.assumptions ?? DEFAULT_ASSUMPTIONS;
  const schedule =
    input.loan > 0
      ? simulateLoan({
          principal: input.loan,
          annualRatePercent: input.annualRatePercent,
          years: input.years,
          repaymentType: input.repaymentType,
        })
      : undefined;

  let homeValue = input.price;
  let renterPortfolio = input.upfront;
  let buyerPortfolio = 0;
  let rentYearly = input.rent * 12;
  const points: YearPoint[] = [];
  let breakEvenYear: number | undefined;

  for (let year = 1; year <= input.horizon; year++) {
    const loanYear = schedule?.years[year - 1];
    const loanPaid = loanYear?.payment ?? 0;
    const balance = loanYear?.balance ?? 0;

    const ownerCosts =
      homeValue * a.maintenanceRate + a.propertyTax + a.insurance;
    const buyYearly = loanPaid + ownerCosts;

    // Whoever pays less this year invests the difference.
    const diff = buyYearly - rentYearly;
    renterPortfolio =
      renterPortfolio * (1 + a.investReturn) + Math.max(diff, 0);
    buyerPortfolio = buyerPortfolio * (1 + a.investReturn) + Math.max(-diff, 0);

    homeValue *= 1 + a.homeGrowth;
    const point: YearPoint = {
      year,
      buyWealth: Math.round(homeValue - balance + buyerPortfolio),
      rentWealth: Math.round(renterPortfolio),
      buyMonthlyCost: Math.round(buyYearly / 12),
      rentMonthly: Math.round(rentYearly / 12),
    };
    points.push(point);
    if (breakEvenYear === undefined && point.buyWealth >= point.rentWealth) {
      breakEvenYear = year;
    }
    rentYearly *= 1 + a.rentGrowth;
  }

  return { points, breakEvenYear, final: points[points.length - 1] };
}
