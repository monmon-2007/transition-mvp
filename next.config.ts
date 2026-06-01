import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // company logos from job boards
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

// Validate critical env vars at build/startup
const requiredEnvVars = ["NEXTAUTH_SECRET"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Warn about optional but important vars
const optionalEnvVars = ["ANTHROPIC_API_KEY", "RESEND_API_KEY"] as const;
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar] && process.env.NODE_ENV === "production") {
    console.warn(`Warning: ${envVar} is not set. Some features will be unavailable.`);
  }
}

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  telemetry: false,
});
