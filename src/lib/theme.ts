/**
 * Color palettes. `hue`, `sat` and `accentHue` mirror the CSS blocks in globals.css
 * (`:root[data-palette="…"]`) and are used here to draw the swatches.
 */
export const palettes = [
  { id: "smaragd", label: "Smaragd", hue: 166, sat: 1, accentHue: 75 },
  { id: "turkoois", label: "Turkoois", hue: 195, sat: 1, accentHue: 40 },
  { id: "oceaan", label: "Oceaan", hue: 245, sat: 1, accentHue: 70 },
  { id: "indigo", label: "Indigo", hue: 275, sat: 1, accentHue: 75 },
  { id: "lavendel", label: "Lavendel", hue: 295, sat: 0.6, accentHue: 150 },
  { id: "aubergine", label: "Aubergine", hue: 315, sat: 1, accentHue: 85 },
  { id: "roos", label: "Roos", hue: 355, sat: 1, accentHue: 200 },
  { id: "koraal", label: "Koraal", hue: 25, sat: 1, accentHue: 220 },
  { id: "terracotta", label: "Terracotta", hue: 38, sat: 1, accentHue: 200 },
  { id: "mosterd", label: "Mosterd", hue: 90, sat: 1, accentHue: 265 },
  { id: "olijf", label: "Olijf", hue: 125, sat: 1, accentHue: 35 },
  { id: "grafiet", label: "Grafiet", hue: 250, sat: 0.15, accentHue: 75 },
] as const;

export const CUSTOM_PALETTE = "eigen" as const;
export type PaletteId = (typeof palettes)[number]["id"] | typeof CUSTOM_PALETTE;
export type ColorMode = "light" | "dark" | "system";

export const PALETTE_KEY = "loanarr:palette";
export const MODE_KEY = "loanarr:mode";
export const CUSTOM_HUE_KEY = "loanarr:custom-hue";
export const DEFAULT_PALETTE: PaletteId = "smaragd";
export const DEFAULT_CUSTOM_HUE = 200;

/** Contrast hue for interest and costs: roughly opposite the brand hue. */
export const contrastHue = (hue: number) => Math.round((hue + 150) % 360);

/** Swatch color for a hue, matching --primary in light mode. */
export const swatch = (hue: number, sat = 1, lightness = 0.48) =>
  `oklch(${lightness} ${0.105 * sat + 0.01} ${hue})`;

/** Applies a palette, color mode and (for "eigen") a custom hue to <html>. */
export function applyTheme(
  palette: PaletteId,
  mode: ColorMode,
  customHue = DEFAULT_CUSTOM_HUE,
) {
  const root = document.documentElement;
  if (palette === DEFAULT_PALETTE) delete root.dataset.palette;
  else root.dataset.palette = palette;

  if (palette === CUSTOM_PALETTE) {
    root.style.setProperty("--h", String(customHue));
    root.style.setProperty("--ah", String(contrastHue(customHue)));
  } else {
    root.style.removeProperty("--h");
    root.style.removeProperty("--ah");
  }

  const dark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

/**
 * Runs before first paint (inlined in <head>) so the saved theme shows without a flash.
 * Keep it dependency-free: it is serialized as a string.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;var p=localStorage.getItem("${PALETTE_KEY}");var m=localStorage.getItem("${MODE_KEY}")||"system";if(p&&p!=="${DEFAULT_PALETTE}")d.dataset.palette=p;if(p==="${CUSTOM_PALETTE}"){var h=Number(localStorage.getItem("${CUSTOM_HUE_KEY}"))||${DEFAULT_CUSTOM_HUE};d.style.setProperty("--h",String(h));d.style.setProperty("--ah",String(Math.round((h+150)%360)));}var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)d.classList.add("dark");}catch(e){}})();`;
