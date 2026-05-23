/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "*.mypinata.cloud" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
  },
  // Silence harmless warnings from @walletconnect/logger which optionally
  // imports pino-pretty for dev. We don't need it in prod.
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push("pino-pretty");
    return config;
  },
};

module.exports = nextConfig;
