import { createElement, useState, useCallback, useEffect, useRef, type ReactElement } from "react";

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
 * SlideDeck — stateful slide presenter.
 * - Children are slides (any DeclNode, typically `slide` or `card`).
 * - Arrow keys ←/→ navigate, F toggles fullscreen, E toggles edit mode.
 * - Click indicator dots to jump.
 */
function SlideDeck(props: { children: DeclNode[]; autoPlay?: boolean; intervalMs?: number }): ReactElement {
  const slides = props.children ?? [];
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const total = slides.length;
  const safeIndex = Math.max(0, Math.min(total - 1, index));

  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : total - 1)), [total]);
  const next = useCallback(() => setIndex((i) => (i < total - 1 ? i + 1 : 0)), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setFullscreen((f) => !f);
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setEditMode((m) => !m);
      } else if (e.key === "Escape") {
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // Auto play
  useEffect(() => {
    if (!props.autoPlay) return;
    const ms = num(props.intervalMs, 6000);
    const id = setInterval(next, ms);
    return () => clearInterval(id);
  }, [props.autoPlay, props.intervalMs, next]);

  if (total === 0) {
    return createElement("div", {
      style: { padding: 24, color: "var(--genui-muted)", textAlign: "center", border: "2px dashed var(--genui-border)", borderRadius: 12 }
    }, "(empty slide deck)");
  }

  const containerStyle: React.CSSProperties = fullscreen
    ? {
        position: "fixed", inset: 0, zIndex: 9000,
        background: "var(--genui-bg, #fff)",
        display: "flex", flexDirection: "column"
      }
    : {
        position: "relative",
        background: "var(--genui-bg, #fff)",
        border: "1px solid var(--genui-border, #e2e8f0)",
        borderRadius: "var(--genui-radius, 12px)",
        boxShadow: "var(--genui-shadow-md)",
        overflow: "hidden",
        minHeight: 360
      };

  const slideAreaStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    padding: fullscreen ? 0 : 0,
    minHeight: fullscreen ? "calc(100vh - 60px)" : 360,
    position: "relative"
  };

  const slide = slides[safeIndex];

  return createElement("div", { ref: containerRef, style: containerStyle, tabIndex: 0 }, [
    /* Slide content with key={safeIndex} so it remounts and re-runs entrance animation */
    createElement("div", {
      key: `slide-area-${safeIndex}`,
      style: slideAreaStyle,
      className: "genui-slide-enter"
    }, slide ? renderNode(slide, safeIndex) : null),

    /* Edit overlay */
    editMode ? createElement("div", {
      key: "edit-banner",
      style: {
        position: "absolute", top: 8, left: 8, padding: "4px 10px",
        background: "var(--genui-accent)", color: "var(--genui-accent-fg)",
        borderRadius: 6, fontSize: 11, fontWeight: 700
      }
    }, "EDIT MODE — JSON 노출 (E to exit)") : null,

    /* Bottom bar */
    createElement("div", {
      key: "bar",
      style: {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px",
        borderTop: "1px solid var(--genui-border)",
        background: "var(--genui-bg-secondary, #f8fafc)",
        gap: 12
      }
    }, [
      createElement("button", {
        key: "prev", onClick: prev,
        style: deckBtnStyle()
      }, "‹"),
      createElement("div", {
        key: "dots",
        style: { display: "flex", gap: 6, flex: 1, justifyContent: "center" }
      }, slides.map((_, i) => createElement("button", {
        key: i,
        onClick: () => setIndex(i),
        "aria-label": `Slide ${i + 1}`,
        style: {
          width: i === safeIndex ? 24 : 8,
          height: 8,
          borderRadius: 4,
          border: "none",
          background: i === safeIndex ? "var(--genui-accent)" : "var(--genui-border)",
          cursor: "pointer",
          transition: "all 200ms"
        }
      }))),
      createElement("span", {
        key: "count",
        style: { fontSize: 11, color: "var(--genui-muted)", minWidth: 50, textAlign: "right" }
      }, `${safeIndex + 1} / ${total}`),
      createElement("button", {
        key: "next", onClick: next,
        style: deckBtnStyle()
      }, "›"),
      createElement("button", {
        key: "fs", onClick: () => setFullscreen((f) => !f),
        title: "Fullscreen (F)",
        style: deckBtnStyle()
      }, fullscreen ? "⊠" : "⛶"),
      createElement("button", {
        key: "edit", onClick: () => setEditMode((m) => !m),
        title: "Edit mode (E)",
        style: deckBtnStyle(editMode)
      }, "✎")
    ]),

    /* Edit JSON view */
    editMode && slide ? createElement("pre", {
      key: "json",
      style: {
        position: "absolute", right: 8, top: 40, bottom: 60,
        width: 320, padding: 12,
        background: "rgba(15, 23, 42, 0.96)", color: "#cbd5e1",
        borderRadius: 8, fontSize: 11, overflow: "auto",
        whiteSpace: "pre-wrap", wordBreak: "break-word"
      }
    }, JSON.stringify(slide, null, 2)) : null
  ]);
}

function deckBtnStyle(active = false): React.CSSProperties {
  return {
    width: 32, height: 32,
    border: "1px solid var(--genui-border)",
    borderRadius: 8,
    background: active ? "var(--genui-accent)" : "var(--genui-bg)",
    color: active ? "var(--genui-accent-fg)" : "var(--genui-fg)",
    cursor: "pointer",
    fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 150ms"
  };
}

const ANIM_MAP: Record<string, string> = {
  "fade": "genui-anim-fade",
  "slide-up": "genui-anim-slide-up",
  "slide-down": "genui-anim-slide-down",
  "slide-left": "genui-anim-slide-left",
  "slide-right": "genui-anim-slide-right",
  "scale": "genui-anim-scale",
  "bounce": "genui-anim-bounce",
  "blur": "genui-anim-blur"
};

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
      return createElement("button", { key,
        onClick: () => {
          const action = str(node.action);
          const payload = node.payload ?? str(node.value);
          if (action) {
            globalThis.dispatchEvent?.(new CustomEvent("genui:action", { detail: { action, payload, source: "button" } }));
          }
        },
        style: s({
          padding: "8px 16px",
          borderRadius: "var(--genui-radius, 6px)",
          border: "none",
          background: str(node.color, "var(--genui-accent, #4f46e5)"),
          color: str(node.textColor, "var(--genui-accent-fg, #fff)"),
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 13
        }, custom)
      }, str(node.value, "Button"));

    case "input":
      return createElement("input", { key,
        type: str(node.inputType, "text"),
        placeholder: str(node.placeholder),
        defaultValue: str(node.value),
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const name = str(node.name, "input");
          globalThis.dispatchEvent?.(new CustomEvent("genui:action", { detail: { action: "input.change", payload: { name, value: e.target.value }, source: "input" } }));
        },
        style: s({
          padding: "8px 12px",
          border: "1px solid var(--genui-border, #cbd5e1)",
          borderRadius: "var(--genui-radius, 6px)",
          fontFamily: "inherit",
          fontSize: 13,
          width: "100%"
        }, custom)
      });

    case "select": {
      const options = Array.isArray(node.options) ? node.options : [];
      return createElement("select", { key,
        defaultValue: str(node.value),
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
          const name = str(node.name, "select");
          globalThis.dispatchEvent?.(new CustomEvent("genui:action", { detail: { action: "select.change", payload: { name, value: e.target.value }, source: "select" } }));
        },
        style: s({
          padding: "8px 12px",
          border: "1px solid var(--genui-border, #cbd5e1)",
          borderRadius: "var(--genui-radius, 6px)",
          fontFamily: "inherit",
          fontSize: 13,
          background: "var(--genui-bg, #fff)",
          cursor: "pointer"
        }, custom)
      }, options.map((opt, i) => {
        const rec = typeof opt === "object" && opt !== null ? opt as Record<string, unknown> : { value: String(opt), label: String(opt) };
        return createElement("option", { key: i, value: str(rec.value) }, str(rec.label, str(rec.value)));
      }));
    }

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

    /* ── Presentation: SlideDeck ── */
    case "slidedeck":
      return createElement(SlideDeck, {
        key,
        children: node.children ?? [],
        autoPlay: node.autoPlay === true,
        intervalMs: num(node.intervalMs, 6000)
      });

    /* ── Slide — visual container with title + body ── */
    case "slide": {
      const titleVal = str(node.title);
      const bgGradient = str(node.background, "linear-gradient(135deg, var(--genui-bg) 0%, var(--genui-bg-secondary, #f1f5f9) 100%)");
      return createElement("article", { key, style: s({
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "calc(16px * var(--genui-spacing, 1))",
        padding: "calc(48px * var(--genui-spacing, 1))",
        background: bgGradient,
        color: "var(--genui-fg)",
        position: "relative",
        overflow: "auto"
      }, custom) }, [
        titleVal ? createElement("h2", {
          key: "title",
          style: { margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--genui-fg)" }
        }, titleVal) : null,
        node.subtitle ? createElement("div", {
          key: "sub",
          style: { fontSize: 16, color: "var(--genui-muted)", marginTop: -8 }
        }, str(node.subtitle)) : null,
        createElement("div", {
          key: "body",
          style: { display: "flex", flexDirection: "column", gap: 12, flex: 1 }
        }, kids)
      ]);
    }

    /* ── Animate — entrance animation wrapper ── */
    case "animate": {
      const kind = str(node.kind, "fade");
      const cls = ANIM_MAP[kind] ?? ANIM_MAP.fade;
      const delay = num(node.delay, 0);
      return createElement("div", {
        key,
        className: cls,
        style: s({
          animationDelay: `${delay}ms`,
          animationFillMode: "both"
        }, custom)
      }, kids);
    }

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
  "button", "input", "link", "select",
  "list", "table",
  "slidedeck", "slide", "animate"
] as const;
