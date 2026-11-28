import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The app was called Loanarr: send old links to the same page on the new domain.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "loanarr.sennedewever.be" }],
        destination: "https://hypotheur.sennedewever.be/:path*",
        permanent: true,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
