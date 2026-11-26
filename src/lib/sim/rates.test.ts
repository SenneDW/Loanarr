import { describe, expect, it } from "vitest";
import {
  BANK_TARIFFS,
  bankRatesFor,
  bracketFor,
  typicalFixedRate,
} from "./rates";

describe("bracketFor", () => {
  const rates = { 10: 4.7, 20: 4.9, 25: 5.0 };
  it("uses the smallest published duration ≥ years", () => {
    expect(bracketFor(10, rates)).toBe(4.7);
    expect(bracketFor(12, rates)).toBe(4.9);
    expect(bracketFor(22, rates)).toBe(5.0);
  });
  it("returns undefined beyond the longest duration", () => {
    expect(bracketFor(30, rates)).toBeUndefined();
  });
});

describe("bank tariffs", () => {
  it("'with products' is never above the list rate", () => {
    for (const t of BANK_TARIFFS) {
      for (const [d, list] of Object.entries(t.list)) {
        const wp = t.withProducts[Number(d) as keyof typeof t.withProducts];
        expect(wp).toBeLessThanOrEqual(list);
      }
    }
  });

  it("leaves out banks without an offer for the duration", () => {
    // Argenta publishes no 30-year fixed rate.
    expect(bankRatesFor(30).map((r) => r.bank)).not.toContain("Argenta");
    expect(bankRatesFor(25)).toHaveLength(BANK_TARIFFS.length);
  });
});

describe("typicalFixedRate", () => {
  it("averages the banks' rates with products", () => {
    const r = typicalFixedRate(20);
    const rates = bankRatesFor(20).map((b) => b.withProducts);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    expect(r.ratePercent).toBeCloseTo(avg, 2);
    expect(r.min).toBe(Math.min(...rates));
    expect(r.max).toBe(Math.max(...rates));
    expect(r.listAverage).toBeGreaterThan(r.ratePercent);
  });

  it("falls back to the longest bracket beyond 30 years", () => {
    expect(typicalFixedRate(35).ratePercent).toBe(
      typicalFixedRate(30).ratePercent,
    );
  });

  it("is in a realistic range for late 2026", () => {
    for (const y of [10, 15, 20, 25, 30]) {
      const r = typicalFixedRate(y).ratePercent;
      expect(r).toBeGreaterThan(4);
      expect(r).toBeLessThan(6.5);
    }
  });
});
