import { describe, expect, it } from "vitest";
import { type AffordabilityInput, maxPurchasePrice } from "./affordability";
import { compareRentVsBuy } from "./rent-vs-buy";
import {
  LIVING_MINIMUM,
  readinessChecks,
  type Situation,
  summarizeSituation,
} from "./situation";

const couple: Situation = {
  household: "couple",
  children: 0,
  income1: 2_400,
  income2: 2_200,
  savings: 45_000,
  investments: 20_000,
  useInvestments: true,
  gift: 10_000,
  rent: 950,
  otherCredits: 0,
};

const base: AffordabilityInput = {
  monthlyPayment: 1_200,
  ownFunds: 50_000,
  annualRatePercent: 3.59,
  years: 25,
  repaymentType: "annuity",
  region: "flanders",
  deedYear: 2027,
  maxLtv: 0.9,
  inscriptionShare: 1,
  fileCosts: 350,
  valuationCosts: 0,
  purchaseExpenses: 900,
  creditExpenses: 280,
};

describe("summarizeSituation", () => {
  it("adds up income and assets and keeps a buffer", () => {
    const s = summarizeSituation(couple);
    expect(s.totalIncome).toBe(4_600);
    expect(s.livingMinimum).toBe(LIVING_MINIMUM.couple);
    // 6 months of living money (1.700) plus the comfortable payment (1.380).
    expect(s.monthlyCosts).toBe(3_080);
    expect(s.buffer).toBe(18_500); // 18.480, rounded to 100
    expect(s.bufferIsEstimate).toBe(true);
    expect(s.totalAssets).toBe(75_000);
    expect(s.suggestedOwnFunds).toBe(56_500); // 75.000 − 18.500
  });

  it("uses the buffer the user typed instead of the estimate", () => {
    const s = summarizeSituation({ ...couple, buffer: 5_000 });
    expect(s.buffer).toBe(5_000);
    expect(s.bufferIsEstimate).toBe(false);
    expect(s.suggestedOwnFunds).toBe(70_000);
    expect(summarizeSituation({ ...couple, buffer: 0 }).buffer).toBe(0);
  });

  it("counts other loans in the monthly costs behind the estimate", () => {
    const s = summarizeSituation({ ...couple, otherCredits: 300 });
    // Comfortable payment drops by 300, the loan itself adds 300 back.
    expect(s.monthlyCosts).toBe(1_700 + 1_080 + 300);
  });

  it("caps payments by ⅓ of income and by living money", () => {
    const s = summarizeSituation(couple);
    expect(s.maxPayment).toBe(1_530); // 4.600 / 3, floored to 10
    expect(s.comfortablePayment).toBe(1_380); // 30 %
    const tight = summarizeSituation({
      ...couple,
      household: "single",
      income1: 1_900,
    });
    // ⅓ would be 633, but only 800 is left above the living minimum: ⅓ wins.
    expect(tight.maxPayment).toBe(630);
  });

  it("other loans reduce what is left for the mortgage", () => {
    const s = summarizeSituation({ ...couple, otherCredits: 300 });
    expect(s.maxPayment).toBe(1_230);
  });

  it("ignores the partner's income when living alone, and investments on request", () => {
    const s = summarizeSituation({
      ...couple,
      household: "single",
      useInvestments: false,
    });
    expect(s.totalIncome).toBe(2_400);
    expect(s.totalAssets).toBe(55_000);
  });
});

describe("readinessChecks", () => {
  it("is green for a comfortable plan", () => {
    const s = summarizeSituation(couple);
    const result = maxPurchasePrice({
      ...base,
      monthlyPayment: s.comfortablePayment,
      ownFunds: s.suggestedOwnFunds,
    });
    const checks = readinessChecks(couple, result);
    expect(checks.map((c) => c.status)).not.toContain("bad");
    expect(checks.find((c) => c.id === "debtRatio")?.status).toBe("good");
  });

  it("flags a too-high payment and an empty buffer", () => {
    const result = maxPurchasePrice({
      ...base,
      monthlyPayment: 2_200,
      ownFunds: 75_000,
    });
    const checks = readinessChecks(couple, result);
    expect(checks.find((c) => c.id === "debtRatio")?.status).toBe("bad");
    expect(checks.find((c) => c.id === "buffer")?.status).not.toBe("good");
  });
});

describe("compareRentVsBuy", () => {
  const plan = maxPurchasePrice(base).plan;
  const input = {
    price: plan.price,
    loan: plan.loan,
    upfront: plan.ownFunds,
    annualRatePercent: 3.59,
    years: 25,
    repaymentType: "annuity" as const,
    rent: 950,
    horizon: 25,
  };

  it("returns one point per year", () => {
    const r = compareRentVsBuy(input);
    expect(r.points).toHaveLength(25);
    expect(r.final.year).toBe(25);
  });

  it("buying wins over 25 years with typical assumptions", () => {
    const r = compareRentVsBuy(input);
    expect(r.final.buyWealth).toBeGreaterThan(r.final.rentWealth);
    expect(r.breakEvenYear).toBeDefined();
  });

  it("renting is better in the first year (upfront costs are lost)", () => {
    const r = compareRentVsBuy(input);
    expect(r.points[0].rentWealth).toBeGreaterThan(r.points[0].buyWealth);
  });

  it("very cheap rent and no home growth favour renting", () => {
    const r = compareRentVsBuy({
      ...input,
      rent: 400,
      horizon: 10,
      assumptions: {
        homeGrowth: 0,
        rentGrowth: 0.02,
        investReturn: 0.05,
        maintenanceRate: 0.01,
        propertyTax: 1_000,
        insurance: 700,
      },
    });
    expect(r.final.rentWealth).toBeGreaterThan(r.final.buyWealth);
  });
});
