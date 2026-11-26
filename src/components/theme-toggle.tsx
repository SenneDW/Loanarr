"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  applyTheme,
  type ColorMode,
  CUSTOM_HUE_KEY,
  CUSTOM_PALETTE,
  DEFAULT_CUSTOM_HUE,
  DEFAULT_PALETTE,
  MODE_KEY,
  PALETTE_KEY,
  type PaletteId,
  palettes,
  swatch,
} from "@/lib/theme";
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

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode): the theme still applies for this visit.
  }
};

/** Popover in the navigation to pick light/dark mode and a color palette. */
export function ThemeToggle() {
  const [palette, setPalette] = useState<PaletteId>(DEFAULT_PALETTE);
  const [mode, setMode] = useState<ColorMode>("system");
  const [customHue, setCustomHue] = useState(DEFAULT_CUSTOM_HUE);

  useEffect(() => {
    setPalette((read(PALETTE_KEY) as PaletteId | null) ?? DEFAULT_PALETTE);
    setMode((read(MODE_KEY) as ColorMode | null) ?? "system");
    setCustomHue(Number(read(CUSTOM_HUE_KEY)) || DEFAULT_CUSTOM_HUE);
  }, []);

  // Follow the OS setting while in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(palette, "system", customHue);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode, palette, customHue]);

  const choosePalette = (p: PaletteId) => {
    setPalette(p);
    save(PALETTE_KEY, p);
    applyTheme(p, mode, customHue);
  };
  const chooseMode = (m: ColorMode) => {
    setMode(m);
    save(MODE_KEY, m);
    applyTheme(palette, m, customHue);
  };
  const chooseHue = (h: number) => {
    setCustomHue(h);
    setPalette(CUSTOM_PALETTE);
    save(CUSTOM_HUE_KEY, String(h));
    save(PALETTE_KEY, CUSTOM_PALETTE);
    applyTheme(CUSTOM_PALETTE, mode, h);
  };

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
      <PopoverContent align="end" className="w-80 gap-4 p-4">
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
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
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
