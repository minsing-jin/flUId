import type { SkillManifest } from "./types.js";

const DOMAIN_PATTERN = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (trimmed === "'self'" || trimmed === "self") {
    return "'self'";
  }
  if (!DOMAIN_PATTERN.test(trimmed)) {
    throw new Error(`Invalid domain entry: ${domain}`);
  }
  return `https://${trimmed}`;
}

export interface ConnectSrcOptions {
  includeSelf?: boolean;
}

/**
 * Build a CSP `connect-src` directive value from a set of active skillpack manifests.
 * The result is always restrictive — no wildcards allowed. `'self'` is included by default.
 */
export function buildConnectSrc(
  manifests: readonly SkillManifest[],
  options: ConnectSrcOptions = {}
): string {
  const includeSelf = options.includeSelf !== false;
  const sources = new Set<string>();
  if (includeSelf) {
    sources.add("'self'");
  }

  for (const manifest of manifests) {
    if (!manifest.allowedDomains) {
      continue;
    }
    for (const domain of manifest.allowedDomains) {
      if (domain.includes("*")) {
        throw new Error(`Wildcard CSP entries are not allowed: ${domain}`);
      }
      sources.add(normalizeDomain(domain));
    }
  }

  if (sources.size === 0) {
    return "'none'";
  }

  return [...sources].join(" ");
}

/**
 * Build a complete `<meta http-equiv="Content-Security-Policy">` value for the sandbox iframe
 * that runs GPT-generated generic-fallback widgets. Keeps script-src tight.
 */
export function buildSandboxCsp(manifests: readonly SkillManifest[]): string {
  const connectSrc = buildConnectSrc(manifests);
  return [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src 'none'"
  ].join("; ");
}
