import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MarketShell } from "@/components/market-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { site, socialMetadata } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  applicationName: site.name,
  keywords: [
    "hypothecaire lening",
    "woonkrediet",
    "simulator",
    "eerste woning",
    "registratierechten",
    "notariskosten",
    "maandlast",
    "België",
  ],
  ...socialMetadata({
    title: site.title,
    description: site.description,
    path: "/",
  }),
};

export const viewport: Viewport = {
  // Also colors the accent bar of Discord link embeds.
  themeColor: site.brandColor,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl-BE"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme init script, no user input
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteNav />
        <MarketShell>{children}</MarketShell>
        <SiteFooter />
      </body>
    </html>
  );
}
