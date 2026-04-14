import { createElement, useState, useCallback, type ReactElement } from "react";

/**
 * A declarative UI node that GPT can compose freely.
 * No pre-registration needed — the GenericRenderer interprets these at runtime.
 */
export interface DeclNode {
  /** Primitive type: text, card, grid, flex, stack, badge, progress, image, divider, button, input, link, spacer, heading, list, table, code, alert */
  element: string;
  /** Display text content (for text, heading, badge, button, link, alert) */
  value?: string;
  /** Nested children (recursive) */
  children?: DeclNode[];
  /** Inline styles — only safe CSS properties, no script injection */
  style?: Record<string, string | number>;
  /** Shorthand props per element type */
  [key: string]: unknown;
}

// Dangerous keys that must never appear in style or props
const FORBIDDEN_KEYS = new Set([
  "innerHTML", "outerHTML", "dangerouslySetInnerHTML",
  "srcdoc", "javascript", "eval", "Function",
  "onload", "onerror", "onclick", "onmouseover"
]);

function isSafe(node: DeclNode): boolean {
  for (const key of Object.keys(node)) {
    if (FORBIDDEN_KEYS.has(key)) return false;
  }
  if (node.style) {
    for (const key of Object.keys(node.style)) {
      if (FORBIDDEN_KEYS.has(key)) return false;
      const val = String(node.style[key] ?? "");
      if (val.includes("javascript:") || val.includes("expression(")) return false;
    }
  }
  return true;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function renderChildren(children: DeclNode[] | undefined): ReactElement[] {
  if (!children || !Array.isArray(children)) return [];
  return children.map((child, i) => renderNode(child, i));
}

const LAYOUT_ELEMENTS = new Set(["grid", "flex", "stack", "container", "section", "box", "card"]);

/**
 * Draggable layout children — wraps each child in a drag handle.
 * Only applies to layout primitives (grid, flex, stack, card, container).
 */
function DraggableChildren(props: { children: DeclNode[]; parentStyle: React.CSSProperties }): ReactElement {
  const [items, setItems] = useState(props.children);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Sync if parent changes
  if (props.children.length !== items.length) {
    setItems(props.children);
  }

  const onDragStart = useCallback((idx: number, e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.4";
    (e.currentTarget as HTMLElement).style.transform = "scale(0.97)";
  }, []);

  const onDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    (e.currentTarget as HTMLElement).style.transform = "none";
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const next = [...items];
      const [moved] = next.splice(dragIdx, 1);
      if (moved) {
        next.splice(overIdx, 0, moved);
        setItems(next);
      }
    }
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, overIdx, items]);

  const onDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }, []);

  return createElement("div", { style: props.parentStyle },
    items.map((child, i) =>
      createElement("div", {
        key: i,
        draggable: true,
        onDragStart: (e: React.DragEvent) => onDragStart(i, e),
        onDragEnd,
        onDragOver: (e: React.DragEvent) => onDragOver(i, e),
        onDrop: (e: React.DragEvent) => e.preventDefault(),
        style: {
          cursor: "grab",
          transition: "all 200ms cubic-bezier(0.4,0,0.2,1)",
          borderRadius: "var(--genui-radius-sm, 8px)",
          border: overIdx === i ? "2px solid var(--genui-accent, #4f46e5)" : "2px solid transparent",
          padding: overIdx === i ? 2 : 0
        }
      }, renderNode(child, i))
    )
  );
}

/**
 * Render layout children — if the parent is a layout element, make children draggable.
 * Otherwise render normally.
 */
function renderLayoutChildren(parentElement: string, children: DeclNode[] | undefined, parentStyle: React.CSSProperties): ReactElement {
  if (!children || children.length === 0) {
    return createElement("div", { style: parentStyle });
  }
  if (LAYOUT_ELEMENTS.has(parentElement) && children.length > 1) {
    return createElement(DraggableChildren, { children, parentStyle });
  }
  return createElement("div", { style: parentStyle }, renderChildren(children));
}

const s = (base: React.CSSProperties, custom?: Record<string, string | number>): React.CSSProperties => ({
  ...base,
  ...(custom as React.CSSProperties)
});

/**
 * Render a single declarative node to a React element.
 * This is the heart of the Generic Declarative Renderer.
 */
export function renderNode(node: DeclNode, key: number | string = 0): ReactElement {
  if (!isSafe(node)) {
    return createElement("div", { key, style: { color: "#ef4444", fontSize: 12, padding: 8, border: "1px solid #fecaca", borderRadius: 6 } },
      `Blocked: unsafe element "${node.element}"`
    );
  }

  const custom = node.style;
  const kids = renderChildren(node.children);

  switch (node.element) {
    /* ── Text ── */
    case "text":
      return createElement("span", { key, style: s({ color: "var(--genui-fg)" }, custom) }, str(node.value));

    case "heading": {
      const level = num(node.level, 2);
      const tag = `h${Math.min(Math.max(level, 1), 6)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return createElement(tag, { key, style: s({ margin: "0 0 8px 0", fontWeight: 700, color: "var(--genui-fg)" }, custom) }, str(node.value));
    }

    case "code":
      return createElement("pre", { key, style: s({
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 13,
        padding: 12,
        background: "#1e293b",
        color: "#e2e8f0",
        borderRadius: "var(--genui-radius, 8px)",
        overflow: "auto",
        whiteSpace: "pre-wrap"
      }, custom) }, str(node.value));

    /* ── Layout (draggable children) ── */
    case "card":
      return renderLayoutChildren("card", node.children, s({
        background: "var(--genui-bg, #fff)",
        border: "1px solid var(--genui-border, #e2e8f0)",
        borderRadius: "var(--genui-radius, 8px)",
        padding: "calc(14px * var(--genui-spacing, 1))",
        boxShadow: "var(--genui-shadow-sm, 0 1px 2px rgba(0,0,0,0.04))",
        transition: "box-shadow 200ms ease"
      }, custom));

    case "grid": {
      const cols = num(node.columns, 2);
      return renderLayoutChildren("grid", node.children, s({
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: `calc(12px * var(--genui-spacing, 1))`
      }, custom));
    }

    case "flex":
      return renderLayoutChildren("flex", node.children, s({
        display: "flex",
        flexDirection: str(node.direction, "row") as React.CSSProperties["flexDirection"],
        gap: `calc(${num(node.gap, 8)}px * var(--genui-spacing, 1))`,
        alignItems: str(node.align, "stretch"),
        justifyContent: str(node.justify, "flex-start"),
        flexWrap: node.wrap ? "wrap" : "nowrap"
      }, custom));

    case "stack":
      return renderLayoutChildren("stack", node.children, s({
        display: "flex",
        flexDirection: "column",
        gap: `calc(${num(node.gap, 8)}px * var(--genui-spacing, 1))`
      }, custom));

    /* ── Display ── */
    case "badge":
      return createElement("span", { key, style: s({
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "var(--genui-radius, 6px)",
        fontSize: 12,
        fontWeight: 600,
        background: str(node.color, "var(--genui-accent, #4f46e5)"),
        color: str(node.textColor, "var(--genui-accent-fg, #fff)")
      }, custom) }, str(node.value));

    case "progress": {
      const pct = Math.min(100, Math.max(0, num(node.percent, 50)));
      return createElement("div", { key, style: s({
        width: "100%",
        height: num(node.height, 8),
        background: "var(--genui-border, #e2e8f0)",
        borderRadius: 99,
        overflow: "hidden"
      }, custom) },
        createElement("div", { style: {
          width: `${pct}%`,
          height: "100%",
          background: str(node.color, "var(--genui-accent, #4f46e5)"),
          borderRadius: 99,
          transition: "width 0.3s ease"
        } })
      );
    }

    case "image":
      return createElement("img", {
        key,
        src: str(node.src),
        alt: str(node.alt, ""),
        style: s({
          maxWidth: "100%",
          borderRadius: "var(--genui-radius, 8px)",
          objectFit: "cover"
        }, custom)
      });

    case "divider":
      return createElement("hr", { key, style: s({
        border: "none",
        borderTop: "1px solid var(--genui-border, #e2e8f0)",
        margin: `calc(12px * var(--genui-spacing, 1)) 0`
      }, custom) });

    case "spacer":
      return createElement("div", { key, style: { height: num(node.size, 16) } });

    case "alert": {
      const variant = str(node.variant, "info");
      const colors: Record<string, { bg: string; border: string; fg: string }> = {
        info: { bg: "#eff6ff", border: "#bfdbfe", fg: "#1e40af" },
        success: { bg: "#f0fdf4", border: "#bbf7d0", fg: "#166534" },
        warning: { bg: "#fffbeb", border: "#fed7aa", fg: "#92400e" },
        error: { bg: "#fef2f2", border: "#fecaca", fg: "#991b1b" }
      };
      const c = colors[variant] ?? colors.info!;
      return createElement("div", { key, style: s({
        padding: "10px 14px",
        borderRadius: "var(--genui-radius, 8px)",
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.fg,
        fontSize: 13
      }, custom) }, [
        str(node.value) ? createElement("span", { key: "v" }, str(node.value)) : null,
        ...kids
      ]);
    }

    /* ── Interactive ── */
    case "button":
      return createElement("button", { key, style: s({
        padding: "8px 16px",
        borderRadius: "var(--genui-radius, 6px)",
        border: "none",
        background: str(node.color, "var(--genui-accent, #4f46e5)"),
        color: str(node.textColor, "var(--genui-accent-fg, #fff)"),
        fontWeight: 600,
        cursor: "pointer",
        fontSize: 13
      }, custom) }, str(node.value, "Button"));

    case "input":
      return createElement("input", { key,
        type: str(node.inputType, "text"),
        placeholder: str(node.placeholder),
        defaultValue: str(node.value),
        style: s({
          padding: "8px 12px",
          border: "1px solid var(--genui-border, #cbd5e1)",
          borderRadius: "var(--genui-radius, 6px)",
          fontFamily: "inherit",
          fontSize: 13,
          width: "100%"
        }, custom)
      });

    case "link":
      return createElement("a", { key,
        href: str(node.href, "#"),
        target: "_blank",
        rel: "noopener noreferrer",
        style: s({
          color: "var(--genui-accent, #4f46e5)",
          textDecoration: "underline",
          cursor: "pointer"
        }, custom)
      }, str(node.value, str(node.href)));

    /* ── Data ── */
    case "list": {
      const items = Array.isArray(node.items) ? node.items : [];
      const ordered = node.ordered === true;
      const tag = ordered ? "ol" : "ul";
      return createElement(tag, { key, style: s({ margin: 0, paddingLeft: 20, lineHeight: 1.8 }, custom) },
        items.map((item, i) =>
          createElement("li", { key: i }, typeof item === "string" ? item : JSON.stringify(item))
        )
      );
    }

    case "table": {
      const columns = Array.isArray(node.columns) ? node.columns.map(String) : [];
      const rows = Array.isArray(node.rows) ? node.rows : [];
      return createElement("table", { key, style: s({ width: "100%", borderCollapse: "collapse", fontSize: 13 }, custom) }, [
        createElement("thead", { key: "h" },
          createElement("tr", null, columns.map((col) =>
            createElement("th", { key: col, style: { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--genui-border)", color: "var(--genui-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" } }, col)
          ))
        ),
        createElement("tbody", { key: "b" },
          rows.map((row, ri) => {
            const rec = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
            return createElement("tr", { key: ri, style: { background: ri % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" } },
              columns.map((col) => createElement("td", { key: col, style: { padding: "8px 10px", borderBottom: "1px solid var(--genui-border)" } }, String(rec[col] ?? "")))
            );
          })
        )
      ]);
    }

    /* ── Container (generic wrapper, draggable children) ── */
    case "container":
    case "section":
    case "box":
      return renderLayoutChildren(node.element, node.children, s({}, custom));

    /* ── Unknown → safe fallback ── */
    default:
      return createElement("div", { key, style: s({
        padding: 8,
        border: "1px dashed var(--genui-border, #cbd5e1)",
        borderRadius: 6,
        color: "var(--genui-muted, #64748b)",
        fontSize: 12
      }, custom) }, [
        createElement("span", { key: "t", style: { opacity: 0.7 } }, `[${node.element}] `),
        str(node.value) ? createElement("span", { key: "v" }, str(node.value)) : null,
        ...kids
      ]);
  }
}

/**
 * Render a full declarative UI tree from Block.props.children.
 * This is the entry point for the Generic Declarative Renderer.
 */
export function renderGenericBlock(props: Record<string, unknown>): ReactElement {
  const children = Array.isArray(props.children) ? (props.children as DeclNode[]) : [];

  if (children.length === 0) {
    // If no children but has other props, show them as a card
    const entries = Object.entries(props).filter(([k]) => k !== "children");
    if (entries.length > 0) {
      return createElement("div", { style: {
        background: "var(--genui-bg)",
        border: "1px solid var(--genui-border)",
        borderRadius: "var(--genui-radius, 8px)",
        padding: "calc(14px * var(--genui-spacing, 1))"
      } },
        entries.map(([k, v], i) =>
          createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--genui-border)" } }, [
            createElement("span", { key: "k", style: { color: "var(--genui-muted)", fontSize: 12 } }, k),
            createElement("span", { key: "v", style: { fontWeight: 600 } }, String(v))
          ])
        )
      );
    }
    return createElement("div", { style: { color: "var(--genui-muted)", padding: 16, textAlign: "center" } }, "Empty block");
  }

  return createElement("div", { style: { display: "flex", flexDirection: "column", gap: `calc(8px * var(--genui-spacing, 1))` } },
    children.map((child, i) => renderNode(child, i))
  );
}

/** List of supported primitive element names */
export const GENERIC_PRIMITIVES = [
  "text", "heading", "code",
  "card", "grid", "flex", "stack", "container", "section", "box",
  "badge", "progress", "image", "divider", "spacer", "alert",
  "button", "input", "link",
  "list", "table"
] as const;
