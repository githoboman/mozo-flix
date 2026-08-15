/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js's static `public/` folder skips paths that start with a dot,
  // so `public/.well-known/*` files never reach Vercel — the URL 404s.
  // Rewrite the well-known verification path to a real route handler
  // that returns the same content (see app/api/ory-verify/route.ts).
  async rewrites() {
    return [
      {
        source: "/.well-known/ory-verify.txt",
        destination: "/api/ory-verify",
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "*.mypinata.cloud" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    // Silence harmless warnings from @walletconnect/logger which optionally
    // imports pino-pretty for dev. We don't need it in prod.
    config.externals.push("pino-pretty");
    return config;
  },
};

module.exports = nextConfig;
