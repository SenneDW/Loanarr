import type { Metadata } from "next";

/** Shared site identity, used for metadata and link previews (Discord, WhatsApp, LinkedIn…). */
export const site = {
  name: "Hypotheur",
  url: "https://hypotheur.sennedewever.be",
  locale: "nl_BE",
  brandColor: "#0B6E57",
  title: "Hypotheur – Wat kan ik kopen?",
  description:
    "Ontdek hoeveel je eerste woning in België mag kosten. Vul je inkomen en spaargeld in en Hypotheur berekent je maximale aankoopprijs, maandlast en totale kostprijs, mét registratierechten per gewest, notariskosten en de actuele rente. Gratis, zonder account.",
} as const;

/**
 * Open Graph + Twitter fields for a page. Next replaces `openGraph` as a whole when a page
 * sets it, so every page builds the full object here instead of only overriding the title.
 */
export function socialMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Pick<Metadata, "openGraph" | "twitter" | "alternates"> {
  return {
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale,
      url: path,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
