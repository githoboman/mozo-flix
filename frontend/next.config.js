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
  webpack: (config, { isServer }) => {
    config.externals = config.externals || [];
    // Silence harmless warnings from @walletconnect/logger which optionally
    // imports pino-pretty for dev. We don't need it in prod.
    config.externals.push("pino-pretty");

    // ConnectKit / wagmi transitively pulls in @coinbase/cdp-sdk +
    // @base-org/account, which reach for x402 payment SDKs and a few Node-
    // only modules (`fs`, `net`, `tls`, `pino-pretty`). We don't use the
    // Base Account / smart-account connector — only the standard EVM
    // wallets (MetaMask, Coinbase Wallet, WalletConnect) — so we can safely
    // stub these unresolved paths and let webpack keep building.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      "@x402/evm": false,
      "@x402/http": false,
      "@x402/utils": false,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
    };

    return config;
  },
};

module.exports = nextConfig;
