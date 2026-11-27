import { ImageResponse } from "next/og";

export const alt =
  "Loanarr: bereken hoeveel je eerste woning in België mag kosten, met alle kosten erbij.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const green = "#0B6E57";
const greenDark = "#07463A";
const mint = "#D7EFE6";

function LogoMark({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#fff" />
      <path
        d="M14 31 32 16l18 15"
        fill="none"
        stroke={green}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 28v18a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V28"
        fill="none"
        stroke={green}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <rect x="24.5" y="38" width="4" height="7" rx="1.2" fill={green} />
      <rect x="30" y="34" width="4" height="11" rx="1.2" fill={green} />
      <rect x="35.5" y="30" width="4" height="15" rx="1.2" fill={green} />
    </svg>
  );
}

// Illustrative example only (Flanders, 2% registration rights on the sole own home).
const rows: [string, string][] = [
  ["Registratierechten", "€ 6.200"],
  ["Notaris & kredietakte", "€ 7.850"],
  ["Maandlast (25 j.)", "€ 1.395"],
];

const points = [
  "Registratierechten per gewest",
  "Notaris- en kredietkosten inbegrepen",
  "Actuele rente van Belgische banken",
];

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: `linear-gradient(135deg, ${green} 0%, ${greenDark} 100%)`,
        color: "#fff",
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "column", flex: 1, gap: 28 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <LogoMark px={64} />
          <div style={{ fontSize: 40, fontWeight: 700 }}>Loanarr</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
          }}
        >
          <span>Wat kan ik</span>
          <span>écht kopen?</span>
        </div>
        <div style={{ fontSize: 26, color: mint, maxWidth: 560 }}>
          Je eerste woning in België, tot op de cent berekend vanuit je inkomen
          en spaargeld.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {points.map((p) => (
            <div
              key={p}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 22,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  background: mint,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5 6.5 12 13 4.5"
                    fill="none"
                    stroke={greenDark}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {p}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 400,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            color: "#16302A",
            borderRadius: 24,
            padding: "32px 34px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontSize: 20, color: "#5B716B" }}>
            Voorbeeld: je woning mag kosten
          </div>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: green,
              letterSpacing: -1,
              marginBottom: 18,
            }}
          >
            € 310.000
          </div>
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 21,
                padding: "11px 0",
                borderTop: "1px solid #E3ECE9",
              }}
            >
              <span style={{ color: "#5B716B" }}>{label}</span>
              <span style={{ fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 22,
            fontSize: 22,
            color: mint,
          }}
        >
          Gratis · zonder account
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 40,
          fontSize: 22,
          color: mint,
          opacity: 0.85,
        }}
      >
        loanarr.sennedewever.be
      </div>
    </div>,
    size,
  );
}
