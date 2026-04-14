import { createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { UIPlan } from "@genui/core";
import { listReactSupportedComponents, reactComponentMap } from "../components/index.js";

export interface ReactRenderAdapter {
  listSupportedComponents(): string[];
  renderPlan(plan: UIPlan, runtime: unknown, mountPoint: HTMLElement): void;
  update(next: UIPlan): void;
}

function renderBlock(plan: UIPlan, blockId: string): ReactElement | null {
  const block = plan.blocks.find((item) => item.id === blockId);
  if (!block) {
    return null;
  }

  const renderer = reactComponentMap[block.type];
  if (!renderer) {
    return createElement("pre", null, `Unsupported component: ${block.type}`);
  }

  return createElement(
    "section",
    { key: block.id, "data-block-id": block.id, "data-region": block.region },
    [
      block.title ? createElement("h3", { key: `${block.id}-title` }, block.title) : null,
      createElement("div", { key: `${block.id}-body` }, renderer(block.props))
    ]
  );
}

function renderPlanTree(plan: UIPlan): ReactElement {
  return createElement("main", { className: "genui-react-workbench" },
    plan.blocks.map((block) => renderBlock(plan, block.id)).filter((item): item is ReactElement => item !== null)
  );
}

export class DefaultReactRenderer implements ReactRenderAdapter {
  private root: Root | null = null;
  private mountPoint: HTMLElement | null = null;

  listSupportedComponents(): string[] {
    return listReactSupportedComponents();
  }

  renderPlan(plan: UIPlan, _runtime: unknown, mountPoint: HTMLElement): void {
    this.mountPoint = mountPoint;
    this.root = this.root ?? createRoot(mountPoint);
    this.root.render(renderPlanTree(plan));
  }

  update(next: UIPlan): void {
    if (!this.root || !this.mountPoint) {
      return;
    }

    this.root.render(renderPlanTree(next));
  }
}
