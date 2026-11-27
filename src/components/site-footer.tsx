import { monthLabel } from "@/lib/format";
import { ECB_SOURCE_URL } from "@/lib/market/ecb";
import { getBankTariffs } from "@/lib/market/get-bank-tariffs";
import { getMarketRates } from "@/lib/market/get-market-rates";
import { getTariffChecks } from "@/lib/market/get-tariff-checks";
import { RATES_CHECKED_ON } from "@/lib/sim/rates";
import { TARIFFS_CHECKED_ON } from "@/lib/sim/tariffs";
import { CheckedStatus } from "./checked-status";
import { LogoMark } from "./logo";
import { Term } from "./term";

// Short ("27 nov, 19:52"), so it fits the narrow footer column on one line.
// The year only for the backup copy, which can be older.
const dateTime = (iso: string, withYear: boolean) =>
  new Date(iso).toLocaleString("nl-BE", {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  });

/** Dot + label + date: green when up to date, amber when it needs a look. */
function StatusLine({
  fresh,
  label,
  when,
  title,
}: {
  fresh: boolean;
  label: string;
  when: string;
  title: string;
}) {
  return (
    <dd
      className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground"
      title={title}
    >
      <span
        className={`size-2 shrink-0 rounded-full ${fresh ? "bg-primary" : "bg-chart-4"}`}
        aria-hidden="true"
      />
      {label} · {when}
    </dd>
  );
}

export async function SiteFooter() {
  const [market, banks, tariffChecks] = await Promise.all([
    getMarketRates(),
    getBankTariffs(),
    getTariffChecks(),
  ]);
  const sources = tariffChecks.sources;
  const changed = sources.filter((s) => s.status === "changed");
  const confirmed = sources.filter((s) => s.status === "ok");
  const sourceList = sources
    .map(
      (s) =>
        `${s.label}: ${s.status === "ok" ? "klopt" : s.status === "changed" ? (s.reason ?? "gewijzigd") : "niet bereikbaar"}`,
    )
    .join("\n");
  const checkedDay = new Date(tariffChecks.checkedAt).toLocaleDateString(
    "nl-BE",
    { day: "numeric", month: "short", timeZone: "Europe/Brussels" },
  );
  const latest = market.points.at(-1)?.month ?? "";
  const liveBanks = banks.status.filter((b) => b.live);
  const notLive = banks.status.filter((b) => !b.live);
  // Per bank: since when its current tariff applies, for the tooltip.
  const validFromList = banks.status
    .map(
      (b) =>
        `${b.bank}: ${new Date(`${b.validFrom}T12:00:00Z`).toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}${b.live ? "" : " (niet automatisch gelezen)"}`,
    )
    .join("\n");

  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 text-sm sm:px-6 md:grid-cols-[1.2fr_2fr]">
        <div className="grid h-fit gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <LogoMark className="size-7" />
            Loanarr
          </div>
          <p className="text-xs text-muted-foreground">
            Simulaties zijn louter indicatief en geen kredietaanbod. Je bank
            beslist over je lening op basis van je volledige situatie.
            Verzekeringen (zoals de <Term id="schuldsaldoverzekering" />) en het
            jaarlijkse kostenpercentage (<Term id="jkp" />) zijn niet
            meegerekend.
          </p>
        </div>

        <dl className="grid gap-3 text-xs sm:grid-cols-3 sm:gap-x-6">
          <div className="grid h-fit gap-1">
            <dt className="font-semibold">Marktrente (NBB/ECB)</dt>
            <dd className="text-muted-foreground">
              Cijfers t.e.m. {monthLabel(latest)}
            </dd>
            <StatusLine
              fresh={market.source === "live"}
              label={market.source === "live" ? "Live" : "Reservekopie"}
              when={dateTime(market.fetchedAt, market.source !== "live")}
              title={
                market.source === "live"
                  ? "Automatisch opgehaald bij de ECB"
                  : "Reservekopie: de live gegevens waren niet bereikbaar"
              }
            />
            <dd>
              <a
                href={ECB_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                ECB Data Portal
              </a>
            </dd>
          </div>
          <div className="grid h-fit gap-1">
            <dt className="font-semibold">Tarieflijsten banken</dt>
            <dd className="text-muted-foreground">
              Argenta, Belfius, Crelan, BNP Paribas Fortis, Elantis
            </dd>
            {liveBanks.length === 0 ? (
              // No sheet could be read: the bundled rates, checked by hand.
              <CheckedStatus
                checkedOn={RATES_CHECKED_ON}
                staleAfter="30d"
                freshTitle="Met de hand nagekeken in de tarieflijsten van de banken"
                staleTitle="Meer dan 30 dagen geleden nagekeken: banken passen hun tarieven om de paar weken aan"
              />
            ) : (
              <StatusLine
                fresh={notLive.length === 0}
                label={
                  notLive.length === 0
                    ? "Live"
                    : `Live ${liveBanks.length} van ${banks.status.length}`
                }
                when={dateTime(banks.checkedAt, false)}
                title={`Automatisch gelezen uit de tarieflijsten van de banken. Tarief geldig sinds:\n${validFromList}`}
              />
            )}
          </div>
          <div className="grid h-fit gap-1">
            <dt className="font-semibold">Notaris- en registratierechten</dt>
            <dd className="text-muted-foreground">
              Wettelijk barema (geïndexeerd 1/1/2026)
            </dd>
            {changed.length > 0 ? (
              // A source no longer states what we use: needs an update.
              <StatusLine
                fresh={false}
                label="Mogelijk gewijzigd"
                when={changed.map((s) => s.label).join(", ")}
                title={`Dagelijkse controle bij de officiële bronnen:\n${sourceList}`}
              />
            ) : confirmed.length > 0 ? (
              <StatusLine
                fresh={confirmed.length === sources.length}
                label={
                  confirmed.length === sources.length
                    ? "Gecontroleerd"
                    : `Gecontroleerd ${confirmed.length} van ${sources.length}`
                }
                when={checkedDay}
                title={`Dagelijks automatisch nagekeken bij de officiële bronnen:\n${sourceList}`}
              />
            ) : (
              // No source reachable: the date of the last manual check.
              <CheckedStatus
                checkedOn={TARIFFS_CHECKED_ON}
                staleAfter="year"
                freshTitle="Met de hand nagekeken bij de officiële bronnen"
                staleTitle="Nagekeken vóór de jaarlijkse indexering van 1 januari"
              />
            )}
          </div>
        </dl>
      </div>
    </footer>
  );
}
