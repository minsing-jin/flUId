import type { UIPlan } from "@genui/core";
import type { GuardrailIssue } from "../types.js";

const SUSPICIOUS_KEYS = new Set([
  "innerHTML",
  "outerHTML",
  "dangerouslySetInnerHTML",
  "eval",
  "__proto__",
  "constructor",
  "srcdoc",
  "javascriptHref"
]);

const HTTP_URL_PATTERN = /^https?:\/\/([^/?#]+)/i;

function extractDomains(value: unknown): string[] {
  if (typeof value === "string") {
    const match = HTTP_URL_PATTERN.exec(value);
    return match && match[1] ? [match[1].toLowerCase()] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(extractDomains);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(extractDomains);
  }
  return [];
}

function walkForSuspiciousKeys(
  value: unknown,
  path: string,
  issues: GuardrailIssue[]
): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForSuspiciousKeys(item, `${path}[${index}]`, issues));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (SUSPICIOUS_KEYS.has(key)) {
      issues.push({
        layer: "output",
        code: "SUSPICIOUS_KEY",
        message: `Suspicious key in generated plan: ${key}`,
        path: nextPath
      });
    }
    walkForSuspiciousKeys(child, nextPath, issues);
  }
}

export interface StaticCheckOptions {
  allowedDomains: readonly string[];
}

/**
 * Perform static analysis of a generated UIPlan against the active skillpack
 * allowed-domain list and a suspicious-key denylist. Detects data-exfiltration
 * hints that zod schema validation alone cannot catch.
 */
export function outputStaticCheck(plan: UIPlan, options: StaticCheckOptions): GuardrailIssue[] {
  const issues: GuardrailIssue[] = [];
  const allowed = new Set(options.allowedDomains.map((domain) => domain.toLowerCase()));

  walkForSuspiciousKeys(plan.blocks, "blocks", issues);
  walkForSuspiciousKeys(plan.actions, "actions", issues);
  walkForSuspiciousKeys(plan.dataSources, "dataSources", issues);
  walkForSuspiciousKeys(plan.state, "state", issues);

  const domains = new Set([
    ...extractDomains(plan.blocks),
    ...extractDomains(plan.actions),
    ...extractDomains(plan.dataSources)
  ]);

  for (const domain of domains) {
    if (!allowed.has(domain)) {
      issues.push({
        layer: "output",
        code: "DOMAIN_NOT_ALLOWLISTED",
        message: `URL domain is not on the skillpack allowlist: ${domain}`
      });
    }
  }

  return issues;
}
