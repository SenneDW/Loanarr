"use client";

import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type GlossaryKey, glossary } from "@/lib/glossary";

/**
 * A jargon word with a dotted underline. Hover (desktop) or tap (touch) shows a
 * plain-language explanation from the glossary.
 */
export function Term({
  id,
  children,
  cap = false,
}: {
  id: GlossaryKey;
  /** The word as it appears in the sentence; defaults to the glossary term. */
  children?: React.ReactNode;
  /** Start with a capital (labels, start of a sentence). Default: lowercase. */
  cap?: boolean;
}) {
  const entry = glossary[id];
  const isAcronym = /^[A-Z]{2,}/.test(entry.term);
  const word =
    cap || isAcronym
      ? entry.term
      : entry.term.charAt(0).toLowerCase() + entry.term.slice(1);
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={150}
        nativeButton={false}
        render={<span />}
        className="cursor-help underline decoration-primary/50 decoration-dotted decoration-2 underline-offset-[3px] hover:decoration-primary data-[popup-open]:decoration-primary"
      >
        {children ?? word}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-[min(90vw,300px)] gap-1.5 p-3">
        <span className="text-sm font-semibold text-primary">{entry.term}</span>
        <span className="text-sm leading-relaxed">{entry.short}</span>
        <Link
          href={`/begrippen#${id}`}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          Alle begrippen →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
