"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Small ⓘ button that opens an info card: on hover (desktop) or tap (touch).
 */
export function InfoHint({
  title,
  children,
  className,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Wider card for tables and diagrams. */
  wide?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={120}
        closeDelay={150}
        aria-label={`Uitleg: ${title}`}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[popup-open]:text-primary",
          className,
        )}
      >
        <Info className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className={cn(
          "max-h-[min(70vh,560px)] gap-3 overflow-y-auto p-4",
          wide ? "w-[min(92vw,440px)]" : "w-[min(92vw,340px)]",
        )}
      >
        <div className="text-sm font-semibold text-primary">{title}</div>
        <div className="grid gap-3 text-sm leading-relaxed text-popover-foreground">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
