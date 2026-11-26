import { describe, expect, it } from "vitest";
import { equivalentMonthlyRate, simulateLoan } from "./loan";

const base = {
  principal: 200_000,
  annualRatePercent: 3,
  years: 20,
} as const;

const sum = (values: number[]) =>
  Math.round(values.reduce((a, b) => a + b * 100, 0)) / 100;

describe("equivalentMonthlyRate", () => {
  it("uses (1 + yearly)^(1/12) − 1, not yearly / 12", () => {
    const rate = equivalentMonthlyRate(3).toNumber();
    expect(rate).toBeCloseTo(1.03 ** (1 / 12) - 1, 12);
    expect(rate).toBeLessThan(0.03 / 12);
  });

  it("compounds back to the yearly rate", () => {
    const rate = equivalentMonthlyRate(3.2);
    expect(rate.plus(1).pow(12).minus(1).toNumber()).toBeCloseTo(0.032, 12);
  });
});

describe("simulateLoan — annuity (vaste mensualiteiten)", () => {
  const result = simulateLoan({ ...base, repaymentType: "annuity" });

  it("matches the closed-form monthly payment", () => {
    const i = 1.03 ** (1 / 12) - 1;
    const expected = (200_000 * i) / (1 - (1 + i) ** -240);
    expect(result.firstPayment).toBeCloseTo(expected, 2);
  });

  it("has a constant payment except for a last-cent correction", () => {
    const payments = result.schedule.slice(0, -1).map((r) => r.payment);
    expect(new Set(payments).size).toBe(1);
    expect(Math.abs(result.lastPayment - result.firstPayment)).toBeLessThan(1);
  });

  it("repays exactly the principal and ends at a zero balance", () => {
    expect(result.schedule).toHaveLength(240);
    expect(sum(result.schedule.map((r) => r.capital))).toBe(200_000);
    expect(result.schedule.at(-1)?.balance).toBe(0);
  });

  it("totals add up", () => {
    expect(result.totalPaid).toBeCloseTo(
      sum(result.schedule.map((r) => r.payment)),
      2,
    );
    expect(result.years).toHaveLength(20);
  });
});

describe("simulateLoan — linear (vaste kapitaalaflossing)", () => {
  const result = simulateLoan({ ...base, repaymentType: "linear" });

  it("repays a fixed capital amount each month", () => {
    expect(result.schedule[0].capital).toBeCloseTo(200_000 / 240, 2);
    expect(result.schedule[100].capital).toBe(result.schedule[0].capital);
  });

  it("has decreasing payments", () => {
    expect(result.firstPayment).toBeGreaterThan(result.lastPayment);
  });

  it("costs less interest than an annuity loan", () => {
    const annuity = simulateLoan({ ...base, repaymentType: "annuity" });
    expect(result.totalInterest).toBeLessThan(annuity.totalInterest);
  });

  it("ends at a zero balance", () => {
    expect(sum(result.schedule.map((r) => r.capital))).toBe(200_000);
    expect(result.schedule.at(-1)?.balance).toBe(0);
  });
});

describe("simulateLoan — edge cases", () => {
  it("handles a 0 % rate", () => {
    const result = simulateLoan({
      principal: 12_000,
      annualRatePercent: 0,
      years: 1,
      repaymentType: "annuity",
    });
    expect(result.firstPayment).toBe(1000);
    expect(result.totalInterest).toBe(0);
  });

  it("rejects invalid input", () => {
    expect(() =>
      simulateLoan({ ...base, principal: -1, repaymentType: "annuity" }),
    ).toThrow();
  });
});
