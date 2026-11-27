"use client";

import type { CSSProperties } from "react";
import { useMarket } from "@/components/market-context";
import {
  formatEur,
  formatEurRounded,
  formatPercent,
  monthLabel,
} from "@/lib/format";
import { creditCosts, registrationDuty } from "@/lib/sim/costs";
import { simulateLoan } from "@/lib/sim/loan";
import { bankRatesFor, RATES_CHECKED_ON } from "@/lib/sim/rates";

const EXAMPLE_LOAN = 200_000;
const delay = (seconds: number) =>
  ({ "--delay": `${seconds}s` }) as CSSProperties;
const dateNl = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString("nl-BE", opts);

/* ------------------------------------------------------------------ */
/* Aflossingswijze                                                     */
/* ------------------------------------------------------------------ */

/** Compares fixed monthly payments with fixed capital repayment, animated. */
export function RepaymentInfo({
  ratePercent,
  years,
}: {
  ratePercent: number;
  years: number;
}) {
  const safeYears = Number.isFinite(years)
    ? Math.min(Math.max(years, 5), 40)
    : 25;
  const safeRate = Number.isFinite(ratePercent) ? ratePercent : 5;
  const annuity = simulateLoan({
    principal: EXAMPLE_LOAN,
    annualRatePercent: safeRate,
    years: safeYears,
    repaymentType: "annuity",
  });
  const linear = simulateLoan({
    principal: EXAMPLE_LOAN,
    annualRatePercent: safeRate,
    years: safeYears,
    repaymentType: "linear",
  });
  const max = Math.max(
    ...annuity.years.map((y) => y.payment),
    ...linear.years.map((y) => y.payment),
  );

  return (
    <>
      <p>
        Bij beide betaal je de lening volledig terug. Het verschil zit in{" "}
        <strong>hoe</strong> je maandlast evolueert. Voorbeeld:{" "}
        {formatEurRounded(EXAMPLE_LOAN)} aan {formatPercent(safeRate / 100, 2)}{" "}
        over {safeYears} jaar.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MiniSchedule
          title="Vaste mensualiteiten"
          years={annuity.years}
          max={max}
          lines={[
            `${formatEur(annuity.firstPayment)} per maand`,
            `Interest: ${formatEurRounded(annuity.totalInterest)}`,
          ]}
        />
        <MiniSchedule
          title="Vaste kapitaalaflossing"
          years={linear.years}
          max={max}
          lines={[
            `${formatEurRounded(linear.firstPayment)} → ${formatEurRounded(linear.lastPayment)}`,
            `Interest: ${formatEurRounded(linear.totalInterest)}`,
          ]}
        />
      </div>
      <Legend />
      <ul className="grid list-disc gap-1 pl-4 text-xs text-muted-foreground">
        <li>
          <strong className="text-foreground">Vaste mensualiteiten:</strong>{" "}
          elke maand hetzelfde bedrag. In het begin betaal je vooral interest,
          later vooral kapitaal. Makkelijk te plannen; de meest gekozen vorm.
        </li>
        <li>
          <strong className="text-foreground">Vaste kapitaalaflossing:</strong>{" "}
          elke maand evenveel kapitaal. De maandlast start hoger en daalt. Je
          betaalt{" "}
          <strong className="text-foreground">
            {formatEurRounded(annuity.totalInterest - linear.totalInterest)}
          </strong>{" "}
          minder interest, maar je moet de hogere start kunnen dragen.
        </li>
      </ul>
    </>
  );
}

function MiniSchedule({
  title,
  years,
  max,
  lines,
}: {
  title: string;
  years: { payment: number; interest: number; capital: number }[];
  max: number;
  lines: string[];
}) {
  const w = 150;
  const h = 70;
  const gap = 1;
  const barW = (w - gap * (years.length - 1)) / years.length;
  return (
    <figure className="grid gap-1.5 rounded-md bg-muted/60 p-2">
      <figcaption className="text-xs font-semibold">{title}</figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-[70px] w-full"
        role="img"
        aria-label={title}
      >
        {years.map((y, i) => {
          const x = i * (barW + gap);
          const capH = (y.capital / max) * h;
          const intH = (y.interest / max) * h;
          return (
            <g key={x} className="anim-grow-y" style={delay(i * 0.025)}>
              <rect
                x={x}
                y={h - capH}
                width={barW}
                height={capH}
                fill="var(--chart-1)"
              />
              <rect
                x={x}
                y={h - capH - intH}
                width={barW}
                height={intH}
                fill="var(--chart-4)"
              />
            </g>
          );
        })}
      </svg>
      {lines.map((l) => (
        <span key={l} className="text-xs tabular-nums">
          {l}
        </span>
      ))}
    </figure>
  );
}

function Legend() {
  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-chart-1" /> Kapitaal
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-chart-4" /> Interest
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rentevoet                                                           */
/* ------------------------------------------------------------------ */

export function RateInfo({ years }: { years: number }) {
  const { negotiatedFixed } = useMarket();
  const rates = Number.isFinite(years) ? bankRatesFor(years) : [];
  return (
    <>
      <p>
        De rentevoet bepaalt hoeveel je lening kost. Hier zie je de{" "}
        <strong>vaste rente voor {years} jaar</strong> uit de officiële
        tarieflijsten van banken (gecontroleerd op{" "}
        {dateNl(RATES_CHECKED_ON, { day: "numeric", month: "long" })}).
      </p>
      {rates.length > 0 && (
        <table className="w-full text-xs tabular-nums">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-1 text-left font-medium">Bank</th>
              <th className="py-1 text-right font-medium">Basis</th>
              <th className="py-1 text-right font-medium">Met verzekering</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.bank} className="border-b last:border-0">
                <td className="py-1">
                  <a
                    href={r.tariff.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-primary"
                  >
                    {r.bank}
                  </a>
                </td>
                <td className="py-1 text-right">
                  {formatPercent(r.list / 100, 2)}
                </td>
                <td className="py-1 text-right font-semibold text-primary">
                  {formatPercent(r.withProducts / 100, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ul className="grid list-disc gap-1 pl-4 text-xs text-muted-foreground">
        <li>
          <strong className="text-foreground">Met verzekering:</strong> korting
          als je de schuldsaldo- en brandverzekering (en soms je loonrekening)
          bij de bank neemt. Dat doen de meeste kopers.
        </li>
        <li>
          <strong className="text-foreground">Onderhandelen loont:</strong> na
          onderhandeling betaalden kopers gemiddeld{" "}
          {formatPercent(negotiatedFixed.ratePercent / 100, 2)} (NBB,{" "}
          {monthLabel(negotiatedFixed.month)}, het meest recente cijfer: de NBB
          publiceert met zo&apos;n twee maanden vertraging). Een offerte van
          vandaag ligt vaak hoger. Vraag dus altijd offertes bij meerdere
          banken.
        </li>
        <li>
          Een goed EPC-label geeft vaak nog 0,10–0,20 % korting. KBC, ING en vdk
          publiceren geen tarieflijst.
        </li>
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Looptijd                                                            */
/* ------------------------------------------------------------------ */

export function DurationInfo({ ratePercent }: { ratePercent: number }) {
  const rate = Number.isFinite(ratePercent) ? ratePercent : 5;
  const rows = [15, 20, 25, 30].map((years) => {
    const r = simulateLoan({
      principal: EXAMPLE_LOAN,
      annualRatePercent: rate,
      years,
      repaymentType: "annuity",
    });
    return { years, monthly: r.firstPayment, interest: r.totalInterest };
  });
  const maxInterest = Math.max(...rows.map((r) => r.interest));
  return (
    <>
      <p>
        Hoe langer je leent, hoe lager je maandlast, maar hoe meer interest je
        in totaal betaalt. Voorbeeld: {formatEurRounded(EXAMPLE_LOAN)} aan{" "}
        {formatPercent(rate / 100, 2)}.
      </p>
      <div className="grid gap-2">
        {rows.map((r, i) => (
          <div
            key={r.years}
            className="grid grid-cols-[52px_1fr_auto] items-center gap-2 text-xs tabular-nums"
          >
            <span className="font-medium">{r.years} jaar</span>
            <svg
              viewBox="0 0 100 10"
              className="h-2.5 w-full"
              aria-hidden="true"
            >
              <rect width="100" height="10" rx="3" fill="var(--muted)" />
              <rect
                className="anim-grow-x"
                style={delay(i * 0.1)}
                width={(r.interest / maxInterest) * 100}
                height="10"
                rx="3"
                fill="var(--chart-4)"
              />
            </svg>
            <span className="text-right">
              {formatEurRounded(r.monthly)}/m ·{" "}
              <span className="text-muted-foreground">
                {formatEurRounded(r.interest)} interest
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Starters kiezen meestal 20 tot 25 jaar. Boven 25 jaar zijn er minder
        banken en is de rente hoger.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Maandlast en eigen middelen                                         */
/* ------------------------------------------------------------------ */

export function MonthlyPaymentInfo() {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <>
      <div className="flex items-center gap-4">
        <svg
          viewBox="0 0 90 90"
          className="size-20 shrink-0"
          aria-hidden="true"
        >
          <circle
            cx="45"
            cy="45"
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="12"
          />
          <circle
            cx="45"
            cy="45"
            r={r}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="12"
            strokeLinecap="round"
            transform="rotate(-90 45 45)"
            className="anim-draw"
            style={
              { "--dash": c, strokeDasharray: `${c / 3} ${c}` } as CSSProperties
            }
          />
          <text
            x="45"
            y="50"
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="var(--foreground)"
          >
            ⅓
          </text>
        </svg>
        <p>
          Het bedrag dat je <strong>elke maand</strong> aan je lening wil
          betalen. Banken aanvaarden meestal tot ongeveer{" "}
          <strong>een derde van je netto gezinsinkomen</strong>, en er moet
          genoeg leefgeld overblijven.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: reken ook met verzekeringen (schuldsaldo, brand), onderhoud en
        energie. Kies liever wat marge dan het absolute maximum.
      </p>
    </>
  );
}

export function OwnFundsInfo() {
  return (
    <>
      <p>
        Je spaargeld en schenkingen die je in de aankoop steekt. Banken lenen
        meestal <strong>tot 90 % van de aankoopprijs</strong>, dus je eigen
        middelen moeten dekken:
      </p>
      <LtvDiagram />
      <p className="text-xs text-muted-foreground">
        Houd ook een buffer opzij voor verhuis, inrichting en onverwachte
        kosten: die zitten niet in deze simulatie.
      </p>
    </>
  );
}

function LtvDiagram() {
  return (
    <svg
      viewBox="0 0 320 70"
      className="w-full"
      role="img"
      aria-label="Lening 90 %, eigen inbreng 10 % plus kosten"
    >
      <g className="anim-grow-x" style={delay(0)}>
        <rect
          x="0"
          y="10"
          width="240"
          height="26"
          rx="4"
          fill="var(--chart-1)"
        />
      </g>
      <g className="anim-grow-x" style={delay(0.3)}>
        <rect
          x="242"
          y="10"
          width="26"
          height="26"
          rx="4"
          fill="var(--chart-4)"
        />
      </g>
      <g className="anim-grow-x" style={delay(0.55)}>
        <rect
          x="270"
          y="10"
          width="48"
          height="26"
          rx="4"
          fill="var(--chart-4)"
          opacity="0.55"
        />
      </g>
      <text
        x="120"
        y="28"
        textAnchor="middle"
        fontSize="11"
        fill="white"
        fontWeight="600"
      >
        Lening ≤ 90 %
      </text>
      <text
        x="255"
        y="54"
        textAnchor="middle"
        fontSize="10"
        fill="var(--foreground)"
      >
        10 %
      </text>
      <text
        x="294"
        y="54"
        textAnchor="middle"
        fontSize="10"
        fill="var(--foreground)"
      >
        kosten
      </text>
      <text x="0" y="54" fontSize="10" fill="var(--muted-foreground)">
        aankoopprijs
      </text>
      <path d="M242 62h76" stroke="var(--chart-4)" strokeWidth="2" />
      <text
        x="280"
        y="70"
        textAnchor="middle"
        fontSize="9"
        fill="var(--muted-foreground)"
      >
        eigen middelen
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Woning                                                              */
/* ------------------------------------------------------------------ */

export function RegionInfo() {
  const price = 300_000;
  const rows = [
    {
      region: "Vlaanderen",
      rule: "2 % (3 % vanaf 2027 aangekondigd)",
      duty: registrationDuty(price, "flanders", 2026),
    },
    {
      region: "Wallonië",
      rule: "3 %",
      duty: registrationDuty(price, "wallonia", 2026),
    },
    {
      region: "Brussel",
      rule: "12,5 %, eerste € 200.000 vrijgesteld (prijs ≤ € 600.000)",
      duty: registrationDuty(price, "brussels", 2026),
    },
  ];
  return (
    <>
      <p>
        De <strong>registratierechten</strong> (de belasting op je aankoop)
        hangen af van het gewest. Deze tarieven gelden voor je{" "}
        <strong>enige eigen woning</strong> waar je zelf gaat wonen.
      </p>
      <table className="w-full text-xs tabular-nums">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-1 text-left font-medium">Gewest</th>
            <th className="py-1 text-left font-medium">Tarief</th>
            <th className="py-1 text-right font-medium">Op € 300.000</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.region} className="border-b last:border-0">
              <td className="py-1 font-medium">{r.region}</td>
              <td className="py-1 pr-2">{r.rule}</td>
              <td className="py-1 text-right">{formatEurRounded(r.duty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">
        Voorwaarden: je moet er binnen een bepaalde termijn gaan wonen en
        (meestal) geen andere woning bezitten. Je notaris controleert dit.
      </p>
    </>
  );
}

export function DeedYearInfo() {
  return (
    <>
      <p>
        Wat telt is de datum van de <strong>notariële akte</strong>, niet van
        het compromis. Tussen compromis en akte zit meestal{" "}
        <strong>2 tot 4 maanden</strong>.
      </p>
      <p>
        In Vlaanderen betaal je in 2026 <strong>2 %</strong>. De Vlaamse
        regering kondigde <strong>3 % vanaf 1 januari 2027</strong> aan; dat is
        nog niet definitief goedgekeurd. Op € 300.000 scheelt dat € 3.000.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Details                                                             */
/* ------------------------------------------------------------------ */

export function LtvInfo() {
  return (
    <>
      <p>
        De <strong>quotiteit</strong> is je lening gedeeld door de waarde van de
        woning. Bij 90 % leent de bank € 270.000 voor een woning van € 300.000.
      </p>
      <LtvDiagram />
      <ul className="grid list-disc gap-1 pl-4 text-xs text-muted-foreground">
        <li>Tot 90 %: bij de meeste banken zonder toeslag.</li>
        <li>
          90–100 %: enkel voor een beperkt deel van de leningen (regels van de
          Nationale Bank) en vaak met een toeslag van +0,60 % tot +1,00 %.
        </li>
        <li>Onder 80 % geven sommige banken een kleine korting.</li>
      </ul>
    </>
  );
}

export function InscriptionInfo() {
  const full = creditCosts(EXAMPLE_LOAN, 1, 280).total;
  const mandate = creditCosts(EXAMPLE_LOAN, 0, 280).total;
  const max = full;
  return (
    <>
      <p>
        De bank wil zekerheid op je woning. Dat kan op twee manieren, die je ook
        kan combineren:
      </p>
      <ul className="grid list-disc gap-1 pl-4">
        <li>
          <strong>Hypothecaire inschrijving:</strong> de hypotheek wordt meteen
          ingeschreven. Je betaalt 1 % registratierecht en 0,3 % hypotheekrecht
          op het bedrag.
        </li>
        <li>
          <strong>Hypothecair mandaat:</strong> de bank mag de hypotheek later
          inschrijven als het nodig is. Veel goedkoper, maar niet elke bank
          aanvaardt het voor (een groot deel van) de lening.
        </li>
      </ul>
      <div className="grid gap-1.5 text-xs tabular-nums">
        <span className="text-muted-foreground">
          Kosten kredietakte voor {formatEurRounded(EXAMPLE_LOAN)}:
        </span>
        {[
          { label: "100 % inschrijving", value: full },
          { label: "100 % mandaat", value: mandate },
        ].map((row, i) => (
          <div
            key={row.label}
            className="grid grid-cols-[110px_1fr_auto] items-center gap-2"
          >
            <span>{row.label}</span>
            <svg
              viewBox="0 0 100 10"
              className="h-2.5 w-full"
              aria-hidden="true"
            >
              <rect width="100" height="10" rx="3" fill="var(--muted)" />
              <rect
                className="anim-grow-x"
                style={delay(i * 0.15)}
                width={(row.value / max) * 100}
                height="10"
                rx="3"
                fill={i === 0 ? "var(--chart-4)" : "var(--chart-1)"}
              />
            </svg>
            <span className="text-right font-medium">
              {formatEurRounded(row.value)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function FileCostsInfo() {
  return (
    <p>
      Wat de bank aanrekent om je dossier op te maken. Meestal{" "}
      <strong>€ 300–500</strong> (Argenta en Elantis: € 350). Je betaalt pas als
      je het kredietaanbod ondertekent.
    </p>
  );
}

export function ValuationInfo() {
  return (
    <p>
      De bank laat de woning schatten om de waarde te bepalen. Meestal{" "}
      <strong>€ 180–300</strong> (Argenta € 180, Elantis € 230). Sommige banken
      nemen dit voor hun rekening.
    </p>
  );
}

export function IncomeInfo() {
  return (
    <p>
      Je netto inkomen per maand (alle kredietnemers samen). Dan berekenen we je{" "}
      <strong>schuldratio</strong>: het deel van je inkomen dat naar je lening
      gaat. Boven een derde wordt het moeilijker bij de meeste banken.
    </p>
  );
}
