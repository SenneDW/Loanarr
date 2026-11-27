"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SegmentedProps<T extends string | number> {
  label: string;
  info?: React.ReactNode;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  hint?: React.ReactNode;
}

/** A labelled segmented control built on shadcn Tabs. */
export function Segmented<T extends string | number>({
  label,
  info,
  value,
  options,
  onChange,
  hint,
}: SegmentedProps<T>) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">{label}</span>
        {info}
      </div>
      <Tabs
        value={String(value)}
        onValueChange={(v) => {
          const match = options.find((o) => String(o.value) === v);
          if (match) onChange(match.value);
        }}
      >
        {/* Long labels wrap instead of overflowing narrow columns. */}
        <TabsList className="min-h-8 w-full items-stretch group-data-horizontal/tabs:h-auto">
          {options.map((o) => (
            <TabsTrigger
              key={String(o.value)}
              value={String(o.value)}
              className="h-auto min-w-0 basis-0 py-1 leading-tight whitespace-normal"
            >
              {o.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {hint && (
        // Reserve two lines so switching options never shifts the layout.
        <p className="min-h-[2lh] text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
