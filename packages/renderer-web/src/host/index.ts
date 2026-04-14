import type { UIPlan } from "@genui/core";
import { DefaultWebRenderer } from "../render/index.js";

export interface CreateWorkbenchWebOptions {
  debug?: boolean;
}

export interface WorkbenchWebHost {
  render: (plan: UIPlan) => void;
  dispose: () => void;
}

export function createWorkbenchWeb(container: HTMLElement, options: CreateWorkbenchWebOptions = {}): WorkbenchWebHost {
  const renderer = new DefaultWebRenderer();

  if (options.debug) {
    container.setAttribute("data-genui-debug", "true");
  }

  return {
    render(plan: UIPlan): void {
      renderer.renderPlan(plan, null, container);
    },
    dispose(): void {
      container.innerHTML = "";
    }
  };
}
