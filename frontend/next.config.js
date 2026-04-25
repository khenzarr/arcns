/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── Security headers for the public adapter API ───────────────────────────
  // Applied to all /api/v1/* routes.
  // CORS is handled per-route in adapterHelpers.ts; these headers add
  // additional hardening at the Next.js config layer.
  async headers() {
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "Referrer-Policy",           value: "no-referrer" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // ── Core Node.js polyfills for wagmi/viem ──────────────────────────────
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      // ── MetaMask SDK / WalletConnect transitive deps ───────────────────
      // These are React Native / Node-only packages that must not be bundled
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      "lokijs": false,
      "encoding": false,
    };

    // ── Suppress known harmless warnings from wallet SDKs ─────────────────
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve 'pino-pretty'/,
      /Module not found: Can't resolve '@react-native-async-storage/,
    ];

    return config;
  },
};

module.exports = nextConfig;
