import { describe, expect, it } from "vitest";
import {
  creditCosts,
  notaryFee,
  purchaseCosts,
  registrationDuty,
} from "./costs";
import { SCALE_G, SCALE_GBIS, SCALE_J, SCALE_JBIS } from "./tariffs";

describe("notaryFee", () => {
  // Reference values published for 2026 for a 300 000 EUR purchase.
  it("scale J: 300 000 EUR → 2 578,24 EUR excl. VAT", () => {
    expect(notaryFee(300_000, SCALE_J)).toBe(2578.24);
  });

  it("scale Jbis (sole own home): 300 000 EUR → 2 321,74 EUR excl. VAT", () => {
    expect(notaryFee(300_000, SCALE_JBIS)).toBe(2321.74);
  });

  it("scale Gbis has no fixed part and is cheaper than G", () => {
    // 7 500×1,368% + 10 000×1,094% + 12 500×0,73% + 15 495×0,547%
    // + 18 595×0,365% + 122 910×0,182% = 679,58
    expect(notaryFee(187_000, SCALE_GBIS)).toBe(679.58);
    expect(notaryFee(187_000, SCALE_GBIS)).toBeLessThan(
      notaryFee(187_000, SCALE_G),
    );
  });

  it("rounds the base to whole euros and returns 0 for 0", () => {
    expect(notaryFee(300_000.4, SCALE_JBIS)).toBe(2321.74);
    expect(notaryFee(0, SCALE_JBIS)).toBe(0);
  });

  it("increases with the amount", () => {
    let previous = 0;
    for (let amount = 1_000; amount <= 1_000_000; amount += 7_919) {
      const fee = notaryFee(amount, SCALE_JBIS);
      expect(fee).toBeGreaterThanOrEqual(previous);
      previous = fee;
    }
  });
});

describe("registrationDuty", () => {
  it("Flanders: 2 % in 2026, 3 % (announced) from 2027", () => {
    expect(registrationDuty(300_000, "flanders", 2026)).toBe(6000);
    expect(registrationDuty(300_000, "flanders", 2027)).toBe(9000);
  });

  it("Wallonia: 3 %", () => {
    expect(registrationDuty(250_000, "wallonia", 2026)).toBe(7500);
  });

  it("Brussels: 12,5 % after a 200 000 EUR exemption, up to 600 000 EUR", () => {
    expect(registrationDuty(350_000, "brussels", 2026)).toBe(18_750);
    expect(registrationDuty(150_000, "brussels", 2026)).toBe(0);
    expect(registrationDuty(650_000, "brussels", 2026)).toBe(81_250);
  });
});

describe("purchaseCosts", () => {
  it("adds duty, notary fee, admin fee, VAT and expenses", () => {
    const c = purchaseCosts(300_000, "flanders", 2026, 900);
    expect(c.notaryFee).toBe(2321.74);
    expect(c.vat).toBe(Math.round((2321.74 + 855) * 0.21 * 100) / 100);
    expect(c.total).toBeCloseTo(6000 + 2321.74 + 855 + c.vat + 900, 2);
  });
});

describe("creditCosts", () => {
  it("reproduces a real 187 000 EUR credit deed with full inscription", () => {
    // Real invoice from a Belgian mortgage broker simulation: 4 812,60 EUR.
    const c = creditCosts(187_000, 1, 280);
    expect(c.total).toBeGreaterThan(4_780);
    expect(c.total).toBeLessThan(4_850);
  });

  it("a mortgage mandate avoids the proportional duties", () => {
    const full = creditCosts(200_000, 1, 280);
    const mandate = creditCosts(200_000, 0, 280);
    expect(mandate.mortgageDuties).toBe(0);
    expect(full.total - mandate.total).toBeCloseTo(200_000 * 1.1 * 0.013, 2);
  });

  it("is zero without a loan", () => {
    expect(creditCosts(0, 1, 280).total).toBe(0);
  });
});
