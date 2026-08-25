import type { NextConfig } from "next";

// Defense-in-depth. No `default-src`, so scripts/styles/images/media stay unrestricted and
// nothing in the app breaks — but `frame-src 'none'` means any future or accidental <iframe>
// simply refuses to load, and `frame-ancestors 'none'` (+ X-Frame-Options) stops the wiki
// itself from being framed for clickjacking.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ["frame-src 'none'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
