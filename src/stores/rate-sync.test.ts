import { describe, expect, it } from "vitest";
import { typicalFixedRate } from "@/lib/sim/rates";
import { applyRatePatch, rateFor } from "./rate-sync";

const input = { annualRatePercent: 3.59, years: 25 };

describe("rateFor", () => {
  it("market mode ignores the duration", () => {
    expect(rateFor("market", 10, 3.59)).toBe(3.59);
    expect(rateFor("market", 30, 3.59)).toBe(3.59);
  });
  it("banks mode uses the duration's bank average", () => {
    expect(rateFor("banks", 20, 3.59)).toBe(typicalFixedRate(20).ratePercent);
  });
});

describe("applyRatePatch", () => {
  it("typing a rate switches to custom", () => {
    const r = applyRatePatch(input, "market", 3.59, { annualRatePercent: 4 });
    expect(r.mode).toBe("custom");
    expect(r.input.annualRatePercent).toBe(4);
  });

  it("in banks mode a new duration picks that bank rate", () => {
    const r = applyRatePatch(input, "banks", 3.59, { years: 20 });
    expect(r.input.annualRatePercent).toBe(typicalFixedRate(20).ratePercent);
  });

  it("in custom mode the rate stays when the duration changes", () => {
    const r = applyRatePatch(
      { ...input, annualRatePercent: 4.4 },
      "custom",
      3.59,
      { years: 20 },
    );
    expect(r.input.annualRatePercent).toBe(4.4);
  });
});
