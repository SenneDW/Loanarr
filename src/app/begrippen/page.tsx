import type { Metadata } from "next";
import { glossary } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Begrippen – Loanarr",
  description:
    "Moeilijke woorden rond woonkrediet en de aankoop van je eerste woning, in gewone taal uitgelegd.",
};

const entries = Object.entries(glossary).sort(([, a], [, b]) =>
  a.term.localeCompare(b.term, "nl-BE"),
);

export default function BegrippenPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Begrippen</h1>
        <p className="max-w-2xl text-muted-foreground">
          De moeilijke woorden rond woonkrediet en je eerste woning, in gewone
          taal. In de simulatie zie je ze met een stippellijn: beweeg erover of
          tik erop voor uitleg.
        </p>
      </header>

      <nav aria-label="Snel naar" className="flex flex-wrap gap-1.5">
        {entries.map(([id, e]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
          >
            {e.term}
          </a>
        ))}
      </nav>

      <dl className="grid gap-3 sm:grid-cols-2">
        {entries.map(([id, e]) => (
          <div
            key={id}
            id={id}
            className="flex scroll-mt-24 flex-col gap-1.5 rounded-xl border bg-card p-4 target:border-primary target:ring-2 target:ring-primary/30"
          >
            <dt className="font-semibold text-primary">{e.term}</dt>
            <dd className="text-sm leading-relaxed">{e.short}</dd>
            {"more" in e && e.more && (
              <dd className="text-sm leading-relaxed text-muted-foreground">
                {e.more}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </main>
  );
}
