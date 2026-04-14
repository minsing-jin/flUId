import type { GuardrailIssue } from "../types.js";

const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; code: string; message: string }> = [
  { pattern: /ignore (all )?previous (instructions?|messages?|system)/i, code: "INSTRUCTION_OVERRIDE", message: "Attempted to override prior instructions" },
  { pattern: /disregard (the )?(system|above|prior) (prompt|instruction)/i, code: "INSTRUCTION_OVERRIDE", message: "Attempted to override prior instructions" },
  { pattern: /system:\s*you/i, code: "ROLE_INJECTION", message: "Attempted to inject a system role message" },
  { pattern: /<\|im_start\|>/i, code: "ROLE_INJECTION", message: "Detected chat template control token" },
  { pattern: /reveal (the )?(system|initial) prompt/i, code: "PROMPT_LEAK", message: "Attempted to extract the system prompt" },
  { pattern: /print (the )?(api[_ ]?key|secret|token)/i, code: "SECRET_LEAK", message: "Attempted to print a secret" },
  { pattern: /document\.cookie/i, code: "COOKIE_EXFIL", message: "Attempted to reach document.cookie" },
  { pattern: /localStorage\./i, code: "STORAGE_EXFIL", message: "Attempted to reach localStorage" },
  { pattern: /fetch\(['"]https?:\/\//i, code: "RAW_FETCH", message: "Attempted raw fetch call" }
];

export function inputFilter(prompt: string): GuardrailIssue[] {
  const issues: GuardrailIssue[] = [];
  for (const { pattern, code, message } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(prompt)) {
      issues.push({ layer: "input", code, message });
    }
  }
  return issues;
}
