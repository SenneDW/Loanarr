import { extractText, getDocumentProxy } from "unpdf";

// Generic identification; some sites refuse requests without a user agent.
const UA = "Mozilla/5.0 (compatible; tariff-check/1.0)";

export async function fetchOk(
  url: string,
  init: { method?: string; timeoutMs?: number } = {},
) {
  const res = await fetch(url, {
    method: init.method,
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res;
}

/** The text of a PDF at `url`, all pages joined. */
export async function pdfText(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetchOk(url)).arrayBuffer());
  // verbosity 0: errors only (pdf.js otherwise logs harmless font warnings).
  const pdf = await getDocumentProxy(bytes, { verbosity: 0 });
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/** The visible text of an HTML page: no scripts, styles or tags, single spaces. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#0?39;|&rsquo;|&#8217;/g, "’")
    .replace(/&euro;/g, "€")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** The visible text of the HTML page at `url`. */
export async function pageText(url: string): Promise<string> {
  return htmlToText(await (await fetchOk(url)).text());
}
