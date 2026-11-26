import { describe, expect, it } from "vitest";
import {
  type AffordabilityInput,
  financialPlan,
  maxLoanForPayment,
  maxPurchasePrice,
} from "./affordability";
import { simulateLoan } from "./loan";

const base: AffordabilityInput = {
  monthlyPayment: 1_200,
  ownFunds: 50_000,
  annualRatePercent: 3,
  years: 25,
  repaymentType: "annuity",
  region: "flanders",
  deedYear: 2026,
  maxLtv: 0.9,
  inscriptionShare: 1,
  fileCosts: 350,
  valuationCosts: 0,
  purchaseExpenses: 900,
  creditExpenses: 280,
};

describe("maxLoanForPayment", () => {
  it("is the inverse of the annuity payment", () => {
    const loan = maxLoanForPayment(1_200, 3, 25, "annuity");
    const schedule = simulateLoan({
      principal: loan,
      annualRatePercent: 3,
      years: 25,
      repaymentType: "annuity",
    });
    expect(schedule.firstPayment).toBeCloseTo(1_200, 1);
  });

  it("linear: the first (highest) payment fits the budget", () => {
    const loan = maxLoanForPayment(1_200, 3, 25, "linear");
    const schedule = simulateLoan({
      principal: loan,
      annualRatePercent: 3,
      years: 25,
      repaymentType: "linear",
    });
    expect(schedule.firstPayment).toBeLessThanOrEqual(1_200.01);
    expect(schedule.firstPayment).toBeGreaterThan(1_199);
  });
});

describe("financialPlan", () => {
  it("balances: expenses = loan + own funds", () => {
    const plan = financialPlan(300_000, base);
    expect(plan.loan + plan.ownFunds).toBeCloseTo(plan.totalExpenses, 2);
    expect(plan.totalExpenses).toBeCloseTo(
      300_000 +
        plan.purchase.total +
        plan.credit.total +
        plan.fileCosts +
        plan.valuationCosts,
      2,
    );
  });

  it("needs no loan when own funds cover everything", () => {
    const plan = financialPlan(50_000, { ...base, ownFunds: 100_000 });
    expect(plan.loan).toBe(0);
    expect(plan.credit.total).toBe(0);
  });
});

describe("maxPurchasePrice", () => {
  it("respects the monthly budget and the LTV limit", () => {
    const r = maxPurchasePrice(base);
    expect(r.plan.loan).toBeLessThanOrEqual(r.maxLoanForPayment);
    expect(r.plan.loan).toBeLessThanOrEqual(0.9 * r.maxPrice + 0.01);
    expect(r.monthlyPayment).toBeLessThanOrEqual(1_200.01);
  });

  it("one euro more is no longer feasible", () => {
    const r = maxPurchasePrice(base);
    const above = financialPlan(r.maxPrice + 1, base);
    expect(
      above.loan > r.maxLoanForPayment || above.loan > 0.9 * (r.maxPrice + 1),
    ).toBe(true);
  });

  it("is limited by the budget with plenty of own funds", () => {
    const r = maxPurchasePrice({ ...base, ownFunds: 150_000 });
    expect(r.limitedBy).toBe("payment");
  });

  it("is limited by the LTV with few own funds", () => {
    const r = maxPurchasePrice({
      ...base,
      ownFunds: 20_000,
      monthlyPayment: 3_000,
    });
    expect(r.limitedBy).toBe("ltv");
  });

  it("more own funds or a cheaper region raise the price", () => {
    const a = maxPurchasePrice(base).maxPrice;
    expect(
      maxPurchasePrice({ ...base, ownFunds: 60_000 }).maxPrice,
    ).toBeGreaterThan(a);
    expect(maxPurchasePrice({ ...base, deedYear: 2027 }).maxPrice).toBeLessThan(
      a,
    );
  });

  it("a mortgage mandate lowers costs and raises the price", () => {
    const full = maxPurchasePrice(base).maxPrice;
    const mandate = maxPurchasePrice({ ...base, inscriptionShare: 0 }).maxPrice;
    expect(mandate).toBeGreaterThan(full);
  });

  it("computes the debt ratio when income is given", () => {
    const r = maxPurchasePrice({ ...base, netIncome: 3_600 });
    expect(r.debtRatio).toBeCloseTo(r.monthlyPayment / 3_600, 6);
  });
});

describe("lifetime cost", () => {
  it("adds up payments, interest and one-off costs", () => {
    const r = maxPurchasePrice(base);
    const l = r.lifetime;
    expect(l.totalRepaid).toBeCloseTo(r.plan.loan + l.totalInterest, 1);
    expect(l.totalHomeCost).toBeCloseTo(
      r.plan.totalExpenses + l.totalInterest,
      1,
    );
    expect(l.totalCostOfBuying).toBeCloseTo(
      r.plan.totalExpenses - r.plan.price + l.totalInterest,
      1,
    );
    // 25 years of ~1.200 EUR per month.
    expect(l.totalRepaid).toBeGreaterThan(1_190 * 300);
    expect(l.totalRepaid).toBeLessThanOrEqual(1_200.01 * 300);
  });
});
