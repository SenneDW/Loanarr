import type { Metadata } from "next";
import { GlossarySearch } from "@/components/glossary-search";
import { glossary } from "@/lib/glossary";
import { socialMetadata } from "@/lib/site";

const title = "Begrippen – Hypotheur";
const description =
  "Moeilijke woorden rond woonkrediet en de aankoop van je eerste woning, in gewone taal uitgelegd.";

export const metadata: Metadata = {
  title,
  description,
  ...socialMetadata({ title, description, path: "/begrippen" }),
};

const items = Object.entries(glossary)
  .map(([id, e]) => ({
    id,
    term: e.term,
    short: e.short,
    more: "more" in e ? e.more : undefined,
  }))
  .sort((a, b) => a.term.localeCompare(b.term, "nl-BE"));

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

      <GlossarySearch items={items} />
    </main>
  );
}
