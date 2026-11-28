"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type GlossaryItem = {
  id: string;
  term: string;
  short: string;
  more?: string;
};

/** Lowercase without accents, so "laicite" finds "Laïciteit". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * The glossary with a search box: filters on every word typed, in the term and the
 * explanation. Terms whose name matches come first. Press "/" to jump to the box.
 */
export function GlossarySearch({ items }: { items: GlossaryItem[] }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const indexed = useMemo(
    () =>
      items.map((item) => ({
        item,
        term: fold(item.term),
        body: fold(`${item.short} ${item.more ?? ""}`),
      })),
    [items],
  );

  const words = fold(query).split(/\s+/).filter(Boolean);
  const shown =
    words.length === 0
      ? items
      : indexed
          .filter(({ term, body }) =>
            words.every((w) => term.includes(w) || body.includes(w)),
          )
          .map((x) => ({
            ...x,
            inTerm: words.every((w) => x.term.includes(w)),
          }))
          .sort((a, b) => Number(b.inTerm) - Number(a.inTerm))
          .map((x) => x.item);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2">
        <label className="relative block">
          <span className="sr-only">Zoek een begrip</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Zoek een begrip…"
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full rounded-xl border bg-card pr-10 pl-9 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
              aria-label="Zoekopdracht wissen"
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1.5 text-[11px] text-muted-foreground sm:block">
              /
            </kbd>
          )}
        </label>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {words.length === 0
            ? `${items.length} begrippen`
            : shown.length === 0
              ? `Niets gevonden voor ‘${query.trim()}’.`
              : `${shown.length} van ${items.length} begrippen`}
        </p>
      </div>

      {words.length === 0 && (
        <nav aria-label="Snel naar" className="flex flex-wrap gap-1.5">
          {items.map((e) => (
            <a
              key={e.id}
              href={`#${e.id}`}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              {e.term}
            </a>
          ))}
        </nav>
      )}

      <dl className="grid gap-3 sm:grid-cols-2">
        {shown.map((e) => (
          <div
            key={e.id}
            id={e.id}
            className="flex scroll-mt-24 flex-col gap-1.5 rounded-xl border bg-card p-4 target:border-primary target:ring-2 target:ring-primary/30"
          >
            <dt className="font-semibold text-primary">{e.term}</dt>
            <dd className="text-sm leading-relaxed">{e.short}</dd>
            {e.more && (
              <dd className="text-sm leading-relaxed text-muted-foreground">
                {e.more}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
