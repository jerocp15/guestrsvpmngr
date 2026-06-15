import process from "node:process";

/**
 * Server-only configuration.
 *
 * The .server.ts suffix prevents Vite from bundling this file into the
 * client — values here never reach the browser. Always read `process.env`
 * inside a function so Cloudflare Workers resolve them at request time.
 */

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",

    /** Base URL for backend API calls (mirrors the public value) */
    apiBaseUrl: process.env.VITE_API_BASE_URL ?? "",

    /** Secret key for signing server tokens / webhooks */
    apiSecretKey: process.env.API_SECRET_KEY ?? "",

    /** Database connection string (if using an external DB) */
    databaseUrl: process.env.DATABASE_URL ?? "",

    /** Supabase / Lovable Cloud service role key (admin operations only) */
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

