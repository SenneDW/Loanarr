"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  applyTheme,
  type ColorMode,
  CUSTOM_PALETTE,
  type PaletteId,
  palettes,
  swatch,
  type Tone,
  tones,
} from "@/lib/theme";
import {
  DEFAULT_PREFS,
  loadTheme,
  saveTheme,
  serializeTheme,
  type ThemePrefs,
} from "@/lib/theme-store";
import { cn } from "@/lib/utils";

const modes: ReadonlyArray<{
  id: ColorMode;
  label: string;
  Icon: typeof Sun;
}> = [
  { id: "light", label: "Licht", Icon: Sun },
  { id: "dark", label: "Donker", Icon: Moon },
  { id: "system", label: "Systeem", Icon: Monitor },
];

/** Little dots that preview each tone's background (neutral, like globals.css). */
const TONE_SWATCH: Record<"light" | "dark", Record<Tone, string>> = {
  light: {
    deep: "oklch(1 0 0)",
    default: "oklch(0.985 0 0)",
    soft: "oklch(0.94 0 0)",
  },
  dark: {
    deep: "oklch(0.11 0 0)",
    default: "oklch(0.16 0 0)",
    soft: "oklch(0.25 0 0)",
  },
};

/** Popover in the navigation to pick light/dark mode and a color palette. */
export function ThemeToggle() {
  const [prefs, setPrefs] = useState<ThemePrefs>(DEFAULT_PREFS);
  const { palette, mode, tone, hue: customHue } = prefs;
  // Whether dark mode is active right now, so the tone labels fit (e.g. "Zwart").
  const [isDark, setIsDark] = useState(false);
  const current = useRef(serializeTheme(DEFAULT_PREFS));

  // Shows a theme without saving it (on load, or when another site changed it).
  const show = useCallback((next: ThemePrefs) => {
    current.current = serializeTheme(next);
    setPrefs(next);
    setIsDark(applyTheme(next.palette, next.mode, next.hue, next.tone));
  }, []);

  useEffect(() => {
    const saved = loadTheme();
    show(saved);
    // Moves a theme from this site's old storage into the shared cookie.
    saveTheme(saved);
  }, [show]);

  // Coming back to this tab: pick up a theme chosen on one of the other sites.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      const saved = loadTheme();
      if (serializeTheme(saved) !== current.current) show(saved);
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [show]);

  // Follow the OS setting while in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      setIsDark(applyTheme(palette, "system", customHue, tone));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode, palette, customHue, tone]);

  /** Applies and saves a change, for this site and the others. */
  const choose = (patch: Partial<ThemePrefs>) => {
    const next = { ...prefs, ...patch };
    show(next);
    saveTheme(next);
  };
  const choosePalette = (p: PaletteId) => choose({ palette: p });
  const chooseMode = (m: ColorMode) => choose({ mode: m });
  const chooseTone = (t: Tone) => choose({ tone: t });
  const chooseHue = (h: number) => choose({ hue: h, palette: CUSTOM_PALETTE });

  const active = palettes.find((p) => p.id === palette);
  // The slider follows the chosen theme, so dragging starts from the current color.
  const sliderHue = active ? active.hue : customHue;

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Thema kiezen"
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground"
      >
        <Palette className="size-4.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] gap-4 p-4">
        <div className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Weergave
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {modes.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => chooseMode(id)}
                aria-pressed={mode === id}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 whitespace-nowrap text-xs font-medium transition-colors",
                  mode === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Achtergrond
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {tones.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => chooseTone(t.id)}
                aria-pressed={tone === t.id}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 whitespace-nowrap text-xs font-medium transition-colors",
                  tone === t.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-1 ring-foreground/25"
                  style={{
                    background: TONE_SWATCH[isDark ? "dark" : "light"][t.id],
                  }}
                />
                {isDark ? t.dark : t.light}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Kleurthema
            </span>
            <span className="text-xs font-medium">
              {palette === CUSTOM_PALETTE ? "Eigen kleur" : active?.label}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {palettes.map((p) => {
              const selected = palette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choosePalette(p.id)}
                  aria-pressed={selected}
                  aria-label={p.label}
                  title={p.label}
                  className={cn(
                    "relative grid aspect-square place-items-center overflow-hidden rounded-full ring-offset-2 ring-offset-popover transition-transform hover:scale-110",
                    selected && "ring-2 ring-foreground",
                  )}
                  style={{ background: swatch(p.hue, p.sat) }}
                >
                  {selected && (
                    <Check
                      className="size-4 text-white"
                      strokeWidth={3}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Eigen kleur
            </span>
            <span
              className="size-4 rounded-full"
              style={{ background: swatch(sliderHue) }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={359}
            value={sliderHue}
            onChange={(e) => chooseHue(Number(e.target.value))}
            aria-label="Eigen kleur: tint"
            className="h-3 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
            style={{
              background: `linear-gradient(to right, ${Array.from(
                { length: 13 },
                (_, i) => swatch(i * 30),
              ).join(", ")})`,
            }}
          />
          <span className="text-xs text-muted-foreground">
            Interest en kosten krijgen automatisch een contrasterende kleur.
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
