"use client";

import {
  forecastForToday,
  useMarket,
  useToday,
} from "@/components/market-context";
import { Term } from "@/components/term";
import { formatPercent, monthLabel } from "@/lib/format";
import type { RateForecast } from "@/lib/market/forecast";
import { releaseStatus } from "@/lib/market/release";
import { typicalFixedRate } from "@/lib/sim/rates";
import { cn } from "@/lib/utils";
import type { RateMode } from "@/stores/rate-sync";

const pct = (n: number) => formatPercent(n / 100, 2);

const MONTH_WORDS = ["", "één maand", "twee maanden", "drie maanden"];
const monthsWord = (n: number) => MONTH_WORDS[n] ?? `${n} maanden`;

const dayLabel = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** Lets the user pick where the rate comes from, and explains each source. */
export function RateHint({
  years,
  mode,
  onModeChange,
}: {
  years: number;
  mode: RateMode;
  onModeChange: (mode: Exclude<RateMode, "custom">) => void;
}) {
  const { negotiatedFixed, change3m, forecasts, yieldsUntil } = useMarket();
  const today = useToday();
  const forecast = forecastForToday(forecasts, today);
  const safeYears = Number.isFinite(years) && years > 0 ? years : 25;
  const banks = typicalFixedRate(safeYears);
  const rising = change3m !== undefined && change3m > 0.05;

  const options: {
    mode: Exclude<RateMode, "custom">;
    title: string;
    rate: number;
    sub: string;
  }[] = [
    {
      mode: "market",
      title: "Marktrente",
      rate: negotiatedFixed.ratePercent,
      sub: `wat kopers effectief betaalden (NBB, ${monthLabel(negotiatedFixed.month)})`,
    },
  ];
  if (forecast) {
    options.push({
      mode: "forecast",
      title: "Verwachte rente nu",
      rate: forecast.ratePercent,
      sub: `onze schatting voor ${monthLabel(forecast.month)} (marge ${pct(forecast.low)} – ${pct(forecast.high)})`,
    });
  }
  options.push({
    mode: "banks",
    title: "Tarieflijst banken",
    rate: banks.ratePercent,
    sub: `vóór onderhandeling, ${safeYears} jaar vast`,
  });

  return (
    <div className="grid gap-2 rounded-lg bg-primary/5 p-3 text-xs ring-1 ring-primary/15">
      <span className="font-medium">Welke rente gebruiken we?</span>
      <div
        className={cn(
          "grid gap-2",
          options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {options.map((o) => (
          <button
            key={o.mode}
            type="button"
            onClick={() => onModeChange(o.mode)}
            aria-pressed={mode === o.mode}
            className={cn(
              "grid content-start gap-0.5 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:border-primary/60",
              mode === o.mode && "border-primary ring-1 ring-primary",
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{o.title}</span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                {pct(o.rate)}
              </span>
            </span>
            <span className="text-muted-foreground">{o.sub}</span>
          </button>
        ))}
      </div>
      {mode === "custom" && (
        <p className="text-muted-foreground">
          Je gebruikt je eigen rentevoet. Kies hierboven om terug te gaan.
        </p>
      )}
      {negotiatedFixed.month && (
        <FreshnessNote
          month={negotiatedFixed.month}
          today={today}
          forecast={forecast}
          yieldsUntil={yieldsUntil}
        />
      )}
      <p className="text-muted-foreground">
        {rising && (
          <>
            De rente stijgt (+{change3m?.toLocaleString("nl-BE")}{" "}
            <Term id="procentpunt">procentpunt</Term> in 3 maanden): reken met
            wat marge.{" "}
          </>
        )}
        De <Term id="marktrente" /> komt van de <Term id="nbb" />. Banken
        publiceren hogere <Term id="affichetarief">affichetarieven</Term> op hun{" "}
        <Term id="tarieflijst">tarieflijst</Term> (spreiding {pct(banks.min)} –{" "}
        {pct(banks.max)}). Na onderhandeling of via een{" "}
        <Term id="kredietmakelaar" /> kom je meestal ergens tussen de marktrente
        en de tarieflijst uit.
      </p>
    </div>
  );
}

/** How old the NBB figure is today, when the next one arrives, and how we estimate today's rate. */
function FreshnessNote({
  month,
  today,
  forecast,
  yieldsUntil,
}: {
  month: string;
  today: Date | null;
  forecast?: RateForecast;
  yieldsUntil?: string;
}) {
  const status = today ? releaseStatus(month, today) : undefined;

  let age = "";
  let next: React.ReactNode = null;
  if (status) {
    if (status.ageMonths > 0)
      age = `, vandaag ${monthsWord(status.ageMonths)} oud`;
    const nextLabel = monthLabel(status.nextMonth);
    const when = `begin ${monthLabel(status.expectedIn)}`;
    next =
      status.daysUntil <= 0
        ? `Het cijfer van ${nextLabel} had rond ${when} moeten verschijnen; zodra het er is, neemt de app het automatisch over.`
        : status.daysUntil <= 14
          ? `Het cijfer van ${nextLabel} verschijnt binnenkort, rond ${when}.`
          : `Het cijfer van ${nextLabel} verschijnt pas rond ${when}.`;
  }

  return (
    <div className="grid gap-1.5 rounded-md bg-amber-500/10 px-3 py-2 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-200">
      <p>
        <span className="font-semibold">Let op:</span> de marktrente is het
        cijfer van {monthLabel(month)}
        {age}. De <Term id="nbb" /> publiceert pas zo&apos;n 5 weken na het
        einde van de maand. {next} Het is ook een gemiddelde over alle kopers,
        en veel van die leningen hebben de rente van een offerte van enkele
        maanden eerder. Een offerte die je vandaag krijgt, ligt daarom vaak
        hoger, zeker als je meer dan 90 % leent.
      </p>
      {forecast && (
        <p>
          <span className="font-semibold">Verwachte rente nu</span> (
          {pct(forecast.ratePercent)} voor {monthLabel(forecast.month)}): onze
          schatting van wat de NBB voor deze maand zal publiceren. We nemen de
          rente van {monthLabel(forecast.fromMonth)} en tellen erbij op hoeveel
          de Europese 10-jaarsrente sindsdien bewoog; hypotheekrentes volgen die
          met zo&apos;n twee maanden vertraging.
          {yieldsUntil &&
            ` Gebaseerd op beursdata tot ${dayLabel(yieldsUntil)}.`}{" "}
          Het blijft een gemiddelde, geen offerte.
        </p>
      )}
      <p>
        Heb je al een offerte? Vul die rente in bij{" "}
        <span className="font-medium">Jaarlijkse rentevoet</span>.
      </p>
    </div>
  );
}
