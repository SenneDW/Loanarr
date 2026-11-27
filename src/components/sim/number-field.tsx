"use client";

import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LOCALE } from "@/lib/format";

interface NumberFieldProps {
  label: string;
  /** Optional info button shown next to the label. */
  info?: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Unit shown after the input, e.g. "€", "%", "jaar". */
  unit: string;
  /** Max decimals shown in the text input. */
  decimals?: number;
  error?: string;
  /** Small help text under the field. */
  hint?: React.ReactNode;
  /** Hide the slider for fields that only need typing. */
  showSlider?: boolean;
}

/**
 * Parses Belgian number input: "250.000" → 250000, "3,2" → 3.2.
 * Dots are treated as thousands separators only when there is no comma
 * and the input has more than one dot or three digits after the dot.
 */
export function parseBelgianNumber(text: string): number {
  let cleaned = text.replace(/[\s€%]/g, "");
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  }
  return cleaned === "" ? Number.NaN : Number(cleaned);
}

export function NumberField({
  label,
  info,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  decimals = 0,
  error,
  hint,
  showSlider = true,
}: NumberFieldProps) {
  const id = useId();
  const format = (n: number) =>
    Number.isFinite(n)
      ? n.toLocaleString(LOCALE, { maximumFractionDigits: decimals })
      : "";
  const [text, setText] = useState(() => format(value));
  // Decimals in the step (0.05 → 2), to avoid float noise like 3.6500000001.
  const stepDecimals = (String(step).split(".")[1] ?? "").length;

  // Keep the text in sync when the value changes elsewhere (e.g. the slider).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to value changes
  useEffect(() => {
    if (!Object.is(parseBelgianNumber(text), value)) setText(format(value));
  }, [value]);

  const inputProps = {
    id,
    inputMode: "decimal" as const,
    value: text,
    "aria-invalid": error ? true : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value);
      onChange(parseBelgianNumber(e.target.value));
    },
    onBlur: () => setText(format(value)),
    // Arrow up/down step like the slider (Shift: ten steps). Snaps to the step
    // grid, so 2.537 goes to 2.550 with steps of 50. No upper limit: the
    // slider's max is a convenience, not a rule (incomes can be higher).
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const size = e.shiftKey ? step * 10 : step;
      const current = Number.isFinite(value) ? value : min;
      const k = current / size;
      let next =
        e.key === "ArrowUp"
          ? (Math.floor(k + 1e-9) + 1) * size
          : (Math.ceil(k - 1e-9) - 1) * size;
      next = Math.max(min, Number(next.toFixed(stepDecimals)));
      setText(format(next));
      onChange(next);
    },
  };

  // With a slider: a compact input next to it, unit outside.
  // Without one: a full-width input under the label, unit inside the box,
  // so the field reads as one unit with its label.
  const input = showSlider ? (
    <div className="flex shrink-0 items-center gap-2">
      <Input {...inputProps} className="h-9 w-28 text-right tabular-nums" />
      <span className="w-8 text-sm text-muted-foreground">{unit}</span>
    </div>
  ) : (
    <div className="relative w-full">
      <Input {...inputProps} className="h-9 pr-9 tabular-nums" />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        {unit}
      </span>
    </div>
  );

  return (
    <div className="grid content-start gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {info}
      </div>
      <div className="flex items-center gap-4">
        {showSlider && (
          <Slider
            aria-label={label}
            className="flex-1"
            min={min}
            max={max}
            step={step}
            value={[
              Math.min(
                Math.max(Number.isFinite(value) ? value : min, min),
                max,
              ),
            ]}
            onValueChange={(v) =>
              onChange(Array.isArray(v) ? v[0] : (v as number))
            }
          />
        )}
        {input}
      </div>
      {hint && !error && (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
