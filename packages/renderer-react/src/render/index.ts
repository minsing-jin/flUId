import { createElement, useState, useCallback, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { UIPlan, Block } from "@genui/core";
import { listReactSupportedComponents, reactComponentMap } from "../components/index.js";
import { renderGenericBlock } from "../generic/index.js";

export interface ReactRenderAdapter {
  listSupportedComponents(): string[];
  renderPlan(plan: UIPlan, runtime: unknown, mountPoint: HTMLElement): void;
  update(next: UIPlan): void;
  showLoading(mountPoint: HTMLElement): void;
}

/* ── Loading Skeleton ── */
function SkeletonUI(): ReactElement {
  return createElement("div", { className: "genui-skeleton" }, [
    createElement("div", { key: "s1", className: "genui-skeleton-block" }, [
      createElement("div", { key: "a", className: "genui-skeleton-line short" }),
      createElement("div", { key: "b", className: "genui-skeleton-line" }),
      createElement("div", { key: "c", className: "genui-skeleton-line medium" }),
      createElement("div", { key: "d", className: "genui-skeleton-line tall" })
    ]),
    createElement("div", { key: "s2", className: "genui-skeleton-block" }, [
      createElement("div", { key: "a", style: { display: "flex", gap: 12, marginBottom: 16 } }, [
        createElement("div", { key: "c1", className: "genui-skeleton-line circle" }),
        createElement("div", { key: "lines", style: { flex: 1 } }, [
          createElement("div", { key: "l1", className: "genui-skeleton-line short" }),
          createElement("div", { key: "l2", className: "genui-skeleton-line medium" })
        ])
      ]),
      createElement("div", { key: "b", className: "genui-skeleton-line" }),
      createElement("div", { key: "c", className: "genui-skeleton-line" }),
      createElement("div", { key: "d", className: "genui-skeleton-line short" })
    ]),
    createElement("div", { key: "s3", className: "genui-skeleton-block" }, [
      createElement("div", { key: "a", className: "genui-skeleton-line short" }),
      createElement("div", { key: "b", className: "genui-skeleton-line tall" }),
      createElement("div", { key: "c", className: "genui-skeleton-line medium" })
    ])
  ]);
}

/* ── Block Renderer ── */
function renderBlockContent(block: Block): ReactElement {
  const renderer = reactComponentMap[block.type];
  const body = renderer ? renderer(block.props) : renderGenericBlock(block.props);
  return createElement("div", null, body);
}

/* ── Draggable Block Wrapper ── */
function DraggableBlock(props: {
  block: Block;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  dragOverIndex: number | null;
}): ReactElement {
  const { block, index, onDragStart, onDragOver, onDragEnd, dragOverIndex } = props;
  const isDragOver = dragOverIndex === index;

  return createElement(
    "section",
    {
      key: block.id,
      "data-block-id": block.id,
      "data-region": block.region,
      className: isDragOver ? "drag-over" : "",
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        onDragStart(index);
      },
      onDragEnd: (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).classList.remove("dragging");
        onDragEnd();
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(index);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
      }
    },
    [
      block.title ? createElement("h3", { key: `${block.id}-title` }, block.title) : null,
      createElement("div", { key: `${block.id}-body` }, renderBlockContent(block))
    ]
  );
}

/* ── Plan Tree with Drag-and-Drop ── */
function PlanTree(props: { plan: UIPlan; onReorder?: (blocks: Block[]) => void }): ReactElement {
  const [blocks, setBlocks] = useState(props.plan.blocks);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync when plan changes externally
  if (props.plan.blocks !== blocks && props.plan.blocks.length !== blocks.length) {
    setBlocks(props.plan.blocks);
  }

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newBlocks = [...blocks];
      const [moved] = newBlocks.splice(dragIndex, 1);
      if (moved) {
        newBlocks.splice(dragOverIndex, 0, moved);
        setBlocks(newBlocks);
        props.onReorder?.(newBlocks);
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, blocks, props]);

  return createElement("main", { className: "genui-react-workbench" },
    blocks.map((block, index) =>
      createElement(DraggableBlock, {
        key: block.id,
        block,
        index,
        onDragStart: handleDragStart,
        onDragOver: handleDragOver,
        onDragEnd: handleDragEnd,
        dragOverIndex
      })
    )
  );
}

export class DefaultReactRenderer implements ReactRenderAdapter {
  private root: Root | null = null;
  private mountPoint: HTMLElement | null = null;

  listSupportedComponents(): string[] {
    return listReactSupportedComponents();
  }

  showLoading(mountPoint: HTMLElement): void {
    this.mountPoint = mountPoint;
    this.root = this.root ?? createRoot(mountPoint);
    this.root.render(createElement("div", null, [
      createElement("div", { key: "bar", className: "genui-loading-bar" }),
      createElement(SkeletonUI, { key: "skel" })
    ]));
  }

  renderPlan(plan: UIPlan, _runtime: unknown, mountPoint: HTMLElement): void {
    this.mountPoint = mountPoint;
    this.root = this.root ?? createRoot(mountPoint);
    this.root.render(createElement(PlanTree, { plan }));
  }

  update(next: UIPlan): void {
    if (!this.root || !this.mountPoint) {
      return;
    }
    this.root.render(createElement(PlanTree, { plan: next }));
  }
}
