// Browser stub for node:vm — the code.run_js tool is unavailable in browser mode.
// This stub prevents Vite from failing at import time.
export class Script {
  constructor(_code: string) {
    throw new Error("node:vm is not available in the browser");
  }
  runInContext(): never {
    throw new Error("node:vm is not available in the browser");
  }
}

export function createContext(): Record<string, unknown> {
  return {};
}
