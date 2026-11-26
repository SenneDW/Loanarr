/**
 * Refreshes src/lib/market/snapshot.json from the ECB Data Portal.
 * The site fetches live data itself; this snapshot is the fallback when the API is down.
 * Run: bun run rates:snapshot
 */
import { writeFileSync } from "node:fs";
import { ECB_URL, parseEcbCsv } from "../src/lib/market/ecb";

const res = await fetch(ECB_URL);
if (!res.ok) throw new Error(`ECB API responded ${res.status}`);
const points = parseEcbCsv(await res.text());
const snapshot = { fetchedAt: new Date().toISOString(), points };
writeFileSync(
  new URL("../src/lib/market/snapshot.json", import.meta.url),
  `${JSON.stringify(snapshot, null, 1)}\n`,
);
console.log(`Saved ${points.length} months, latest ${points.at(-1)?.month}`);
