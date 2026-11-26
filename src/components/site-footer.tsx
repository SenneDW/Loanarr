import { monthLabel } from "@/lib/format";
import { ECB_SOURCE_URL } from "@/lib/market/ecb";
import { getMarketRates } from "@/lib/market/get-market-rates";
import { RATES_CHECKED_ON } from "@/lib/sim/rates";
import { TARIFFS_CHECKED_ON } from "@/lib/sim/tariffs";
import { LogoMark } from "./logo";
import { Term } from "./term";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  });

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Brussels",
  });

export async function SiteFooter() {
  const market = await getMarketRates();
  const latest = market.points.at(-1)?.month ?? "";

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

        <dl className="grid gap-3 text-xs sm:grid-cols-3">
          <div className="grid h-fit gap-1">
            <dt className="font-semibold">Marktrente (NBB/ECB)</dt>
            <dd className="text-muted-foreground">
              Cijfers t.e.m. {monthLabel(latest)}
            </dd>
            <dd className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className={`size-2 rounded-full ${market.source === "live" ? "bg-primary" : "bg-chart-4"}`}
                aria-hidden="true"
              />
              {market.source === "live" ? "Live opgehaald" : "Reservekopie"} op{" "}
              {dateTime(market.fetchedAt)}
            </dd>
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
              Laatst gecontroleerd op {date(RATES_CHECKED_ON)}
            </dd>
            <dd className="text-muted-foreground">
              Argenta, Belfius, Crelan, BNP Paribas Fortis, Elantis
            </dd>
          </div>
          <div className="grid h-fit gap-1">
            <dt className="font-semibold">Notaris- en registratierechten</dt>
            <dd className="text-muted-foreground">
              Laatst gecontroleerd op {date(TARIFFS_CHECKED_ON)}
            </dd>
            <dd className="text-muted-foreground">
              Wettelijk barema (geïndexeerd 1/1/2026)
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
