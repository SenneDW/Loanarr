/**
 * Theme preferences shared by every site on sennedewever.be (Hypotheur, Formateur, …).
 *
 * They live in one cookie on the parent domain, so a theme picked on one site is used
 * on all the others. On localhost the cookie is host-only, and since cookies ignore the
 * port, apps on different localhost ports share it too.
 *
 * Keep this file identical in every project; the per-site part (LEGACY_PREFIXES) is in
 * theme.ts.
 */
import {
  type ColorMode,
  CUSTOM_PALETTE,
  DEFAULT_CUSTOM_HUE,
  DEFAULT_PALETTE,
  DEFAULT_TONE,
  LEGACY_PREFIXES,
  type PaletteId,
  palettes,
  type Tone,
} from "./theme";

export const THEME_COOKIE = "sdw-theme";
export const SHARED_DOMAIN = "sennedewever.be";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type ThemePrefs = {
  palette: PaletteId;
  mode: ColorMode;
  tone: Tone;
  /** Hue of the custom color ("Eigen kleur"). */
  hue: number;
};

export const DEFAULT_PREFS: ThemePrefs = {
  palette: DEFAULT_PALETTE,
  mode: "system",
  tone: DEFAULT_TONE,
  hue: DEFAULT_CUSTOM_HUE,
};

const PALETTE_IDS: readonly string[] = [
  ...palettes.map((p) => p.id),
  CUSTOM_PALETTE,
];
const MODES: readonly string[] = ["light", "dark", "system"];
const TONES: readonly string[] = ["deep", "default", "soft"];

/** "smaragd.dark.soft.200" → preferences. Unknown parts fall back to the defaults. */
export function parseTheme(
  value: string | null | undefined,
): ThemePrefs | null {
  if (!value) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const [palette, mode, tone, hue] = decoded.split(".");
  const h = Number(hue);
  return {
    palette: PALETTE_IDS.includes(palette)
      ? (palette as PaletteId)
      : DEFAULT_PREFS.palette,
    mode: MODES.includes(mode) ? (mode as ColorMode) : DEFAULT_PREFS.mode,
    tone: TONES.includes(tone) ? (tone as Tone) : DEFAULT_PREFS.tone,
    hue:
      Number.isFinite(h) && h >= 0 && h < 360
        ? Math.round(h)
        : DEFAULT_PREFS.hue,
  };
}

export const serializeTheme = (p: ThemePrefs) =>
  [p.palette, p.mode, p.tone, Math.round(p.hue)].join(".");

/** The Domain attribute: the parent domain on our sites, nothing elsewhere. */
export function cookieDomain(hostname: string): string {
  return hostname === SHARED_DOMAIN || hostname.endsWith(`.${SHARED_DOMAIN}`)
    ? `; Domain=${SHARED_DOMAIN}`
    : "";
}

function readCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`),
  );
  return match ? match[1] : null;
}

/** Older versions kept the theme per site in localStorage. */
function readLegacy(): ThemePrefs | null {
  try {
    for (const prefix of LEGACY_PREFIXES) {
      const palette = localStorage.getItem(`${prefix}palette`);
      const mode = localStorage.getItem(`${prefix}mode`);
      const tone = localStorage.getItem(`${prefix}tone`);
      const hue = localStorage.getItem(`${prefix}custom-hue`);
      if (palette || mode || tone || hue) {
        return parseTheme(
          [palette ?? "", mode ?? "", tone ?? "", hue ?? ""].join("."),
        );
      }
    }
  } catch {
    // Storage blocked (private mode): nothing to migrate.
  }
  return null;
}

/** The saved theme: the shared cookie, else this site's old settings, else the defaults. */
export function loadTheme(): ThemePrefs {
  return parseTheme(readCookie()) ?? readLegacy() ?? DEFAULT_PREFS;
}

/** Saves the theme for all our sites. */
export function saveTheme(prefs: ThemePrefs) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  // biome-ignore lint/suspicious/noDocumentCookie: a plain cookie is what lets all subdomains share it; the Cookie Store API is not in every browser yet
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(serializeTheme(prefs))}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${cookieDomain(location.hostname)}${secure}`;
}

/**
 * Runs before first paint (inlined in <head>) so the saved theme shows without a flash.
 * Same logic as loadTheme + applyTheme, kept dependency-free: it is serialized as a string.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement,p,m,t,h,v=(document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]*)/)||[])[1];if(v){v=decodeURIComponent(v).split(".");p=v[0];m=v[1];t=v[2];h=Number(v[3]);}else{var L=${JSON.stringify(LEGACY_PREFIXES)};for(var i=0;i<L.length&&!p&&!m&&!t;i++){p=localStorage.getItem(L[i]+"palette");m=localStorage.getItem(L[i]+"mode");t=localStorage.getItem(L[i]+"tone");h=Number(localStorage.getItem(L[i]+"custom-hue"));}}if(m!=="light"&&m!=="dark")m="system";if(!(h>=0&&h<360))h=${DEFAULT_CUSTOM_HUE};if(t==="deep"||t==="soft")d.dataset.tone=t;if(p&&p!=="${DEFAULT_PALETTE}")d.dataset.palette=p;if(p==="${CUSTOM_PALETTE}"){d.style.setProperty("--h",String(h));d.style.setProperty("--ah",String(Math.round((h+150)%360)));}if(m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");}catch(e){}})();`;
