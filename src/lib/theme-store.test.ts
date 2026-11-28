import { describe, expect, it } from "vitest";
import {
  cookieDomain,
  DEFAULT_PREFS,
  parseTheme,
  serializeTheme,
  themeInitScript,
} from "./theme-store";

describe("theme cookie", () => {
  it("round-trips", () => {
    const prefs = {
      palette: "oceaan",
      mode: "dark",
      tone: "soft",
      hue: 210,
    } as const;
    expect(parseTheme(serializeTheme(prefs))).toEqual(prefs);
    expect(parseTheme(encodeURIComponent(serializeTheme(prefs)))).toEqual(
      prefs,
    );
  });

  it("falls back per field on unknown values", () => {
    expect(parseTheme("bestaat-niet.paars.x.999")).toEqual(DEFAULT_PREFS);
    expect(parseTheme("eigen.light")).toEqual({
      ...DEFAULT_PREFS,
      palette: "eigen",
      mode: "light",
    });
    expect(parseTheme("")).toBeNull();
    expect(parseTheme("%E0%A4%A")).toBeNull();
  });

  it("is shared on the parent domain only", () => {
    expect(cookieDomain("formateur.sennedewever.be")).toBe(
      "; Domain=sennedewever.be",
    );
    expect(cookieDomain("hypotheur.sennedewever.be")).toBe(
      "; Domain=sennedewever.be",
    );
    expect(cookieDomain("sennedewever.be")).toBe("; Domain=sennedewever.be");
    expect(cookieDomain("localhost")).toBe("");
    expect(cookieDomain("notsennedewever.be")).toBe("");
  });

  it("init script is valid JavaScript", () => {
    expect(() => new Function(themeInitScript)).not.toThrow();
    expect(themeInitScript).toContain(String.raw`(?:^|;\s*)sdw-theme=`);
  });
});
