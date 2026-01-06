import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude puppeteer-related packages from webpack bundling on the client side
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'puppeteer-extra': false,
        'puppeteer-extra-plugin-stealth': false,
        'puppeteer-core': false,
        '@sparticuz/chromium': false,
      };
    }

    // Mark these packages as external for server-side builds
    if (isServer) {
      config.externals = [
        ...config.externals,
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth',
        'puppeteer-core',
        '@sparticuz/chromium',
      ];
    }

    return config;
  },
};

export default nextConfig;
