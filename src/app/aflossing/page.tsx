import type { Metadata } from "next";
import Link from "next/link";
import { LoanSimulator } from "@/components/sim/loan-simulator";
import { socialMetadata } from "@/lib/site";

const title = "Aflossingstabel – Loanarr";
const description =
  "Vul je leenbedrag, rente en looptijd in en zie je maandlast, met per jaar hoeveel kapitaal en interest je aan de bank terugbetaalt.";

export const metadata: Metadata = {
  title,
  description,
  ...socialMetadata({ title, description, path: "/aflossing" }),
};

export default function AflossingPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="grid gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Aflossingstabel
        </h1>
        <div className="grid max-w-3xl gap-2 rounded-xl border border-primary/15 bg-secondary/60 px-4 py-3 text-sm">
          <p>
            <strong>Zo werkt het:</strong> je vult het{" "}
            <strong>leenbedrag</strong> in, en wij berekenen de{" "}
            <strong>maandlast</strong> die je dan elke maand aan de bank
            betaalt, met per jaar hoeveel kapitaal en interest daarin zit.
          </p>
          <p className="text-muted-foreground">
            Wil je liever vertrekken van wat je per maand wil betalen? Gebruik{" "}
            <Link
              href="/"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Wat kan ik kopen?
            </Link>
            . Daar kan je je resultaat ook meteen hier openen.
          </p>
        </div>
      </header>

      <LoanSimulator />
    </main>
  );
}
