const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Désactive en dev pour éviter les surprises pendant le dev.
  disable: process.env.NODE_ENV === "development",
  // Fallback hors-ligne côté document
  fallbacks: {
    document: "/offline",
  },
  // Permet d'étendre le SW généré avec un SW custom (app/sw.ts)
  extendDefaultSW: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
