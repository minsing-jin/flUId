import type { UIPlan } from "@genui/core";
import { defineDefaultWebComponents, listDefaultComponentTypes, resolveTagName } from "../components/index.js";

export interface WebRenderAdapter {
  listSupportedComponents(): string[];
  renderPlan(plan: UIPlan, runtime: unknown, mountPoint: HTMLElement): void;
  update(next: UIPlan): void;
}

export class DefaultWebRenderer implements WebRenderAdapter {
  private mountPoint: HTMLElement | null = null;
  private currentPlan: UIPlan | null = null;

  listSupportedComponents(): string[] {
    return listDefaultComponentTypes();
  }

  renderPlan(plan: UIPlan, _runtime: unknown, mountPoint: HTMLElement): void {
    defineDefaultWebComponents();
    this.currentPlan = plan;
    this.mountPoint = mountPoint;

    const shell = document.createElement(resolveTagName("WorkbenchShell"));
    mountPoint.innerHTML = "";
    mountPoint.appendChild(shell);

    const regionTargets = new Map<string, HTMLElement>();
    for (const region of ["left", "main", "right", "bottom"]) {
      const target = shell.querySelector(`[data-region=\"${region}\"]`);
      if (target instanceof HTMLElement) {
        regionTargets.set(region, target);
      }
    }

    for (const block of plan.blocks) {
      const tagName = resolveTagName(block.type);
      const element = document.createElement(tagName);
      element.setAttribute("data-block-id", block.id);
      element.setAttribute("data-props", JSON.stringify(block.props));

      const region = regionTargets.get(block.region);
      if (region) {
        region.appendChild(element);
      }
    }
  }

  update(next: UIPlan): void {
    if (!this.mountPoint) {
      return;
    }

    this.renderPlan(next, null, this.mountPoint);
  }
}
