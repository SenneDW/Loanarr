import { describe, expect, it } from "vitest";
import {
  checkBrussels,
  checkFlanders,
  checkNotary,
  checkWallonia,
  flanders2027,
} from "./tariff-checks";

// Short excerpts of the official sources (Nov 2026).

const FLANDERS =
  "Wijziging tarief enige woning naar 3% vanaf 1 januari 2027 In de Septemberverklaring heeft de Vlaamse Regering de intentie geuit om het verlaagd tarief in het verkooprecht voor de aankoop van de enige eigen woning vanaf 1 januari 2027 aan te passen naar 3%. In standpunt 26021 wordt de werkwijze toegelicht, onder voorbehoud dat door de decreetgever geen afwijkende regeling uitgewerkt wordt. … Bedrag Vanaf 1 januari 2025 betaalt u op de aankoop van een enige eigen woning nog maar 2% registratiebelasting.";

const WALLONIA =
  "Réduction des droits d’enregistrement à 3 % Faire bénéficier d’un taux réduit de 3 % pour l’achat d’une habitation propre et unique, d’un";

const BRUSSELS =
  "Les droits d’enregistrement dus sur les ventes sont normalement de 12,5 % pour les biens immobiliers situés en Région de Bruxelles-Capitale. … Ainsi, sur les premiers 200 000 € , l’acheteur … ne peut pas être supérieur à 600 000 € .";

// The rows of the decree's table that hold scales G, Gbis, J and Jbis.
const NOTARY = [
  "(na indexering op 1 januari 2026)",
  "administratieve kosten en de niet-individualiseerbare uitgaven vastgesteld op 855 EUR, zonder",
  "7.500 0,7500 1,3680 2,5000 2,5000 4,7500 4,5000",
  "10.000 0,6500 1,0940 2,5000 2,5000",
  "12.500 0,5000 0,7300 1,7500 2,0000",
  "15.495 0,4000 0,5470 1,7100 1,5000",
  "18.595 0,4000 0,3650 1,1400 0,5000",
  "186.005 0,2280 0,1820 0,5700 0,4850 1,3500 1,1750",
  "249.905 0,0460 0,0360 0,2000 0,3000 0,2500 0,5000",
].join(" ");

const NOV_2026 = new Date("2026-11-27T12:00:00Z");

describe("Flanders", () => {
  it("confirms 2 % and sees 2027 as announced", () => {
    expect(checkFlanders(FLANDERS)).toEqual({ ok: true });
    expect(flanders2027(FLANDERS)).toBe("announced");
  });

  it("flags a page that no longer states 2 %", () => {
    const changed = FLANDERS.replace("nog maar 2%", "nog maar 2,5%");
    expect(checkFlanders(changed).ok).toBe(false);
  });

  it("counts 3 % as enacted only once the page says so plainly", () => {
    const enacted =
      "Vanaf 1 januari 2027 betaalt u op de aankoop van een enige eigen woning 3% registratiebelasting. Vanaf 1 januari 2025 betaalt u op de aankoop van een enige eigen woning nog maar 2% registratiebelasting.";
    expect(flanders2027(enacted)).toBe("enacted");
    // Neither the intention nor a plain statement: do not guess.
    expect(flanders2027("Vanaf 1 januari 2025 nog maar 2%.")).toBe("unclear");
  });
});

describe("Wallonia and Brussels", () => {
  it("confirm the rates we use", () => {
    expect(checkWallonia(WALLONIA)).toEqual({ ok: true });
    expect(checkBrussels(BRUSSELS)).toEqual({ ok: true });
  });

  it("name what is missing", () => {
    const r = checkBrussels(
      BRUSSELS.replace("premiers 200 000 €", "premiers 250 000 €"),
    );
    expect(r).toEqual({
      ok: false,
      reason: "niet meer gevonden: de vrijstelling op € 200.000",
    });
    expect(checkWallonia("taux réduit de 4 % pour l’achat").ok).toBe(false);
  });
});

describe("notary decree", () => {
  it("finds every slice we use and this year's indexation", () => {
    expect(checkNotary(NOTARY, NOV_2026)).toEqual({ ok: true });
  });

  it("asks for the new indexation in a new year", () => {
    const r = checkNotary(NOTARY, new Date("2027-01-03T12:00:00Z"));
    expect(r.ok).toBe(false);
  });

  it("flags a changed slice", () => {
    const r = checkNotary(NOTARY.replace("15.495", "15.900"), NOV_2026);
    expect(r).toEqual({
      ok: false,
      reason: "schijven niet meer gevonden: 15.495",
    });
  });
});
