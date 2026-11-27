import { RateHistory } from "@/components/market/rate-history";
import { AffordabilityCalculator } from "@/components/sim/affordability-calculator";
import { getBankTariffs } from "@/lib/market/get-bank-tariffs";
import { getMarketRates } from "@/lib/market/get-market-rates";
import { lastYears } from "@/lib/market/trend";
import { typicalFixedRate } from "@/lib/sim/rates";

export default async function Home() {
  const [market, banks] = await Promise.all([
    getMarketRates(),
    getBankTariffs(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Wat kan ik kopen?
        </h1>
        <p className="hidden max-w-2xl text-muted-foreground sm:block">
          Bereken hoeveel je eerste woning mag kosten op basis van je gewenste
          maandlast en je eigen middelen. Inclusief registratierechten,
          notariskosten en de kosten van je lening.
        </p>
      </header>

      <AffordabilityCalculator />

      <RateHistory
        points={lastYears(market.points, 20)}
        bankRate={typicalFixedRate(25, banks.tariffs).ratePercent}
      />
    </main>
  );
}
