/**
 * Client-safe configuration.
 *
 * These values are available in the browser because they use the `VITE_`
 * prefix in `.env`. Never put secrets here — they ship to the client bundle.
 */

function getEnv(key: string, fallback = ""): string {
  // import.meta.env is injected by Vite at build time
  const value = (import.meta.env as Record<string, string | undefined>)?.[key];
  return value ?? fallback;
}

function getBool(key: string, fallback = false): boolean {
  const value = getEnv(key, fallback ? "true" : "false");
  return value === "true" || value === "1";
}

export const clientConfig = {
  /** Application display name (e.g. restaurant name) */
  appName: getEnv("VITE_APP_NAME", "Guest Manager"),

  /** Base URL for API requests. Empty string = localStorage-only mode. */
  apiBaseUrl: getEnv("VITE_API_BASE_URL", ""),

  /** Whether the auth/login screen is enabled */
} as const;
