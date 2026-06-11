#!/usr/bin/env node
// Runs automatically after every dependency install (npm/bun/pnpm postinstall).
//
// Why this exists:
// When a new dependency is added while the Vite dev server is already running,
// Vite re-optimizes dependencies on the fly and invalidates its pre-bundled
// chunks. Requests for the old chunk URLs then fail with a 504 (Outdated
// Optimize Dep), which shows up as a blank screen until a manual restart.
//
// This script removes the stale optimize cache and asks the running dev server
// to restart, so the next page load gets freshly optimized dependencies.

import { existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function log(msg) {
  console.log(`[postinstall] ${msg}`);
}

// 1. Drop Vite's pre-bundled dependency cache so it re-optimizes cleanly.
const viteCache = join(root, "node_modules", ".vite");
try {
  if (existsSync(viteCache)) {
    rmSync(viteCache, { recursive: true, force: true });
    log("Cleared stale Vite dependency cache (node_modules/.vite).");
  }
} catch (err) {
  log(`Could not clear Vite cache: ${err.message}`);
}

// 2. If a Vite dev server is currently running, restart it so it picks up the
//    new dependencies. The process supervisor relaunches it after it exits.
//    This is best-effort: failures here must never break the install.
function findVitePids() {
  const pids = [];
  // Prefer /proc (portable on Linux without pgrep/ps).
  if (existsSync("/proc")) {
    try {
      for (const entry of readdirSync("/proc")) {
        if (!/^\d+$/.test(entry)) continue;
        const pid = Number(entry);
        if (pid === process.pid) continue;
        try {
          const cmd = readFileSync(join("/proc", entry, "cmdline"), "utf8").replace(/\0/g, " ");
          if (/\bvite\b/.test(cmd) && cmd.includes("dev")) pids.push(pid);
        } catch {
          // process vanished or not readable
        }
      }
      return pids;
    } catch {
      // fall through to pgrep
    }
  }
  // Fallback for non-Linux environments.
  try {
    return execSync("pgrep -f 'vite dev' || true", { encoding: "utf8" })
      .split("\n")
      .map((p) => Number(p.trim()))
      .filter((p) => p && p !== process.pid);
  } catch {
    return [];
  }
}

try {
  const pids = findVitePids();
  if (pids.length > 0) {
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // process may have already exited
      }
    }
    log(`Restarted running dev server (${pids.length} process(es)).`);
  } else {
    log("No running dev server detected; nothing to restart.");
  }
} catch (err) {
  log(`Dev-server restart skipped: ${err.message}`);
}

