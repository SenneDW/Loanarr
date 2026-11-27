import { describe, expect, it } from "vitest";
import {
  isPlausible,
  parseArgenta,
  parseBelfius,
  parseBnp,
  parseCrelan,
  parseElantis,
  toDurations,
} from "./bank-tariffs";

// Short excerpts of the text the PDF reader returns for each bank's sheet (Nov 2026).

const ARGENTA =
  "Geldig vanaf: 19/11/2026 Documentnummer: DW26291 N … daarna 5-jaarlijks aanpasbaar < 25 jaar 5,12% 0,4170% VASTE RENTEVOETEN < 10 jaar 4,79% 0,3907% < 13 jaar 4,84% 0,3947% < 15 jaar 4,90% 0,3994% < 18 jaar 4,91% 0,4002% < 20 jaar 4,97% 0,4050% < 22 jaar 4,99% 0,4066% < 25 jaar 5,01% 0,4082% 19/11/2026 Max. 100 % 1. TARIEVEN & KORTINGEN";

const BELFIUS =
  "Tarief hypothecaire kredieten Nr. 4067 op 27/11/2026 … 1.1. WOONKREDIETEN MET EEN VASTE RENTEVOET … Vaste rentevoet 1-10 jaar 1 maand 120 maand 0,39253 % 4,813 % Vaste rentevoet 11-15 jaar 121 maand 180 maand 0,39843 % 4,887 % Vaste rentevoet 16-18 jaar 181 maand 216 maand 0,40106 % 4,920 % Vaste rentevoet 19-20 jaar 217 maand 240 maand 0,40241 % 4,937 % Vaste rentevoet 21-25 jaar 241 maand 300 maand 0,40456 % 4,964 % Vaste rentevoet 26-30 jaar 301 maand 360 maand 0,41331 % 5,074 % REPRESENTATIEF VOORBEELD";

const CRELAN =
  "23/11/2026 et faisant partie du prospectus N° 27 … Taux fixes ≤ 10 ans 5,66% 0,4599% 5,03% 0,4099% ≤ 12 ans 5,67% 0,4606% 5,04% 0,4107% ≤ 15 ans 5,66% 0,4599% 5,03% 0,4099% ≤ 18 ans 5,67% 0,4606% 5,04% 0,4107% ≤ 20 ans 5,71% 0,4638% 5,08% 0,4139% ≤ 25 ans 5,77% 0,4686% 5,14% 0,4186% Durable 30 ans (voir page 2) ≤ 30 ans 5,96% 0,4836% 5,33% 0,4336% * voir point 5: Les réductions conditionnelles";

const BNP =
  "F00015N – 01/11/2026 1.1.1.2. Formules met VASTE RENTEVOET Duur < 10 jaar 0,467% 5,75% € 109,04 Berekend op 10 jaar Duur > 10 en < 13 jaar 0,475% 5,85% € 90,90 Berekend op 13 jaar Duur > 13 en < 15 jaar 0,479% 5,90% € 83,03 Berekend op 15 jaar Duur > 15 en < 18 jaar 0,479% 5,90% € 74,41 Berekend op 18 jaar Duur > 18 en < 20 jaar 0,479% 5,90% € 70,20 Berekend op 20 jaar Duur > 20 en < 25 jaar 0,487% 6,00% € 63,48 Berekend op 25 jaar Duur > 25 en < 30 jaar 0,561% 6,95% € 64,74 Berekend op 30 jaar Representatief voorbeeld";

const ELANTIS =
  "Rentevoetrooster n°583 Geldigheidsdatum : vanaf 10/11/2026- … 1.Rentevoetrooster vast Looptijd jaarlijkse rentevoet maandelijkse rentevoet 10 jaar 4,71% 0,384% 15 jaar 4,86% 0,396% 17 jaar 4,91% 0,400% 20 jaar 4,94% 0,403% 22 jaar 4,96% 0,404% 25 jaar 5,01% 0,408% 30 jaar 5,15% 0,419% 2. Rentevoetrooster variabel 10/5/5 looptijd jaarlijkse rentevoet";

describe("bank tariff sheets", () => {
  it("reads Argenta's base rates and date", () => {
    expect(parseArgenta(ARGENTA)).toEqual({
      list: { 10: 4.79, 15: 4.9, 20: 4.97, 25: 5.01 },
      validFrom: "2026-11-19",
    });
  });

  it("reads Belfius' voordeeltarief (with insurance)", () => {
    expect(parseBelfius(BELFIUS)).toEqual({
      withProducts: { 10: 4.813, 15: 4.887, 20: 4.937, 25: 4.964, 30: 5.074 },
      validFrom: "2026-11-27",
    });
  });

  it("reads both of Crelan's columns", () => {
    const r = parseCrelan(CRELAN);
    expect(r.list).toEqual({
      10: 5.66,
      15: 5.66,
      20: 5.71,
      25: 5.77,
      30: 5.96,
    });
    expect(r.withProducts?.[25]).toBe(5.14);
    expect(r.validFrom).toBe("2026-11-23");
  });

  it("reads BNP's yearly rate, not the monthly one", () => {
    expect(parseBnp(BNP)).toEqual({
      list: { 10: 5.75, 15: 5.9, 20: 5.9, 25: 6, 30: 6.95 },
      validFrom: "2026-11-01",
    });
  });

  it("reads Elantis' fixed table only", () => {
    expect(parseElantis(ELANTIS)).toEqual({
      list: { 10: 4.71, 15: 4.86, 20: 4.94, 25: 5.01, 30: 5.15 },
      validFrom: "2026-11-10",
    });
  });

  it("returns nothing usable when the layout changes", () => {
    const r = parseArgenta("Tarievenkaart, nieuwe opmaak zonder tabel");
    expect(r.list).toEqual({});
    expect(isPlausible(r.list, { 10: 4.79, 20: 4.97, 25: 5.01 })).toBe(false);
  });
});

describe("toDurations", () => {
  it("gives each duration the smallest bracket that covers it", () => {
    expect(
      toDurations([
        [13, 4.8],
        [22, 5],
        [10, 4.7],
      ]),
    ).toEqual({ 10: 4.7, 15: 5, 20: 5 });
  });
});

describe("isPlausible", () => {
  const known = { 10: 4.8, 20: 5, 25: 5.1 };
  it("accepts a normal update", () => {
    expect(isPlausible({ 10: 4.7, 20: 4.9, 25: 5 }, known)).toBe(true);
  });
  it("rejects missing key durations, unrealistic rates and wild jumps", () => {
    expect(isPlausible({ 10: 4.7, 25: 5 }, known)).toBe(false);
    expect(isPlausible({ 10: 0.39, 20: 0.4, 25: 0.41 }, known)).toBe(false);
    expect(isPlausible({ 10: 7.5, 20: 7.6, 25: 7.7 }, known)).toBe(false);
  });
});
