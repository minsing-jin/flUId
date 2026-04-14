import { createElement, type ReactElement } from "react";

type BlockProps = Record<string, unknown>;

export type ReactBlockRenderer = (props: BlockProps) => ReactElement;

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/* ── Shared styles ── */
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "var(--genui-bg, #fff)",
  border: "1px solid var(--genui-border, #e2e8f0)",
  borderRadius: "var(--genui-radius, 8px)",
  padding: "calc(14px * var(--genui-spacing, 1))",
  ...extra
});

const badge = (bg?: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: "var(--genui-radius, 6px)",
  fontSize: "12px",
  fontWeight: 600,
  background: bg ?? "var(--genui-accent, #4f46e5)",
  color: "var(--genui-accent-fg, #fff)"
});

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "var(--genui-font-size, 13px)"
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid var(--genui-border, #e2e8f0)",
  color: "var(--genui-muted, #64748b)",
  fontWeight: 600,
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--genui-border, #e2e8f0)"
};

/* ── Fallback for unknown types ── */
const GenericFallback = (type: string, props: BlockProps): ReactElement =>
  createElement("div", { style: card({ opacity: 0.7 }) }, [
    createElement("div", { key: "t", style: { ...badge("var(--genui-muted, #94a3b8)"), marginBottom: 8 } }, type),
    createElement("pre", { key: "p", style: { margin: 0, fontSize: 11, color: "var(--genui-muted)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflow: "auto" } }, JSON.stringify(props, null, 2))
  ]);

/* ── Component registry ── */
export const reactComponentMap: Record<string, ReactBlockRenderer> = {

  /* ━━ Layout ━━ */
  WorkbenchShell: () => createElement("section", { className: "genui-react-shell" }),
  PromptInput: (props) =>
    createElement("div", { style: { display: "flex", gap: 8 } }, [
      createElement("input", {
        key: "i",
        placeholder: asString(props.placeholder, "Describe your workbench..."),
        style: { flex: 1, padding: "8px 12px", border: "1px solid var(--genui-border)", borderRadius: "var(--genui-radius)", fontFamily: "inherit" }
      }),
      createElement("button", { key: "b", type: "button", style: { ...badge(), padding: "8px 16px", border: "none", cursor: "pointer" } }, "Generate")
    ]),

  /* ━━ KPIGrid ━━ */
  KPIGrid: (props) => {
    const items = asArray(props.items);
    return createElement("div", {
      style: { display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`, gap: "calc(12px * var(--genui-spacing, 1))" }
    }, items.map((item, i) => {
      const rec = asRecord(item);
      return createElement("div", { key: i, style: card({ textAlign: "center" }) }, [
        createElement("div", { key: "v", style: { fontSize: "28px", fontWeight: 700, color: "var(--genui-accent, #4f46e5)", lineHeight: 1.2 } }, asString(rec.value, "—")),
        createElement("div", { key: "l", style: { fontSize: "12px", color: "var(--genui-muted, #64748b)", marginTop: 4 } }, asString(rec.label, "")),
        rec.change ? createElement("div", { key: "c", style: { fontSize: "12px", marginTop: 2, color: String(rec.change).startsWith("-") ? "#ef4444" : "#22c55e" } }, String(rec.change)) : null
      ]);
    }));
  },

  /* ━━ ChartBlock ━━ */
  ChartBlock: (props) => {
    const chartType = asString(props.chartType, "bar");
    const series = asArray(props.series);
    const labels = asArray(props.labels).map(String);
    const maxVal = series.reduce((max: number, s) => {
      const data = asArray(asRecord(s).data);
      return Math.max(max, ...data.map((v) => asNumber(v, 0)));
    }, 1);
    return createElement("div", { style: card() }, [
      createElement("div", { key: "h", style: { display: "flex", justifyContent: "space-between", marginBottom: 12 } }, [
        createElement("span", { key: "t", style: badge() }, chartType.toUpperCase()),
        series.length > 0 ? createElement("span", { key: "n", style: { fontSize: 11, color: "var(--genui-muted)" } }, `${series.length} series`) : null
      ]),
      chartType === "bar" || chartType === "line"
        ? createElement("div", { key: "bars", style: { display: "flex", alignItems: "flex-end", gap: 4, height: 120 } },
            (series[0] ? asArray(asRecord(series[0]).data) : labels).map((_v, i) => {
              const val = series[0] ? asNumber(asArray(asRecord(series[0]).data)[i], 0) : 0;
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 10;
              return createElement("div", { key: i, style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } }, [
                createElement("div", { key: "b", style: { width: "100%", height: `${Math.max(pct, 5)}%`, background: "var(--genui-accent, #4f46e5)", borderRadius: "4px 4px 0 0", transition: "height 0.3s", minHeight: 4 } }),
                labels[i] ? createElement("div", { key: "l", style: { fontSize: 10, color: "var(--genui-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 50 } }, labels[i]) : null
              ]);
            })
          )
        : chartType === "pie"
          ? createElement("div", { key: "pie", style: { width: 120, height: 120, borderRadius: "50%", background: `conic-gradient(var(--genui-accent) 0% 65%, var(--genui-border) 65% 100%)`, margin: "0 auto" } })
          : createElement("div", { key: "ph", style: { height: 120, background: "var(--genui-border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--genui-muted)" } }, `${chartType} chart`)
    ]);
  },

  /* ━━ DataTable ━━ */
  DataTable: (props) => {
    const columns = asArray(props.columns).map(String);
    const rows = asArray(props.rows);
    return createElement("div", { style: { overflow: "auto" } },
      createElement("table", { style: tableStyle }, [
        createElement("thead", { key: "h" },
          createElement("tr", null, columns.map((col) => createElement("th", { key: col, style: thStyle }, col)))
        ),
        createElement("tbody", { key: "b" },
          rows.map((row, ri) => {
            const rec = asRecord(row);
            return createElement("tr", { key: ri, style: { background: ri % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" } },
              columns.map((col) => createElement("td", { key: `${ri}-${col}`, style: tdStyle }, String(rec[col] ?? "")))
            );
          })
        )
      ])
    );
  },

  /* ━━ ComparisonMatrix ━━ */
  ComparisonMatrix: (props) => {
    const columns = asArray(props.columns).map(String);
    const rows = asArray(props.rows);
    return createElement("div", { style: { overflow: "auto" } },
      createElement("table", { style: tableStyle }, [
        createElement("thead", { key: "h" },
          createElement("tr", null, [
            createElement("th", { key: "_", style: thStyle }, ""),
            ...columns.map((col) => createElement("th", { key: col, style: { ...thStyle, textAlign: "center" } }, col))
          ])
        ),
        createElement("tbody", { key: "b" },
          rows.length > 0
            ? rows.map((row, ri) => {
                const rec = asRecord(row);
                return createElement("tr", { key: ri },
                  [createElement("td", { key: "_", style: { ...tdStyle, fontWeight: 600 } }, asString(rec.label, `Row ${ri + 1}`)),
                   ...columns.map((col) => createElement("td", { key: col, style: { ...tdStyle, textAlign: "center" } },
                     String(rec[col] ?? rec.label === col ? "✓" : "—")
                   ))]
                );
              })
            : [createElement("tr", { key: "e" }, createElement("td", { colSpan: columns.length + 1, style: { ...tdStyle, textAlign: "center", color: "var(--genui-muted)" } }, "No data"))]
        )
      ])
    );
  },

  /* ━━ SummaryBlock ━━ */
  SummaryBlock: (props) =>
    createElement("div", { style: card() },
      createElement("ul", { style: { margin: 0, paddingLeft: 20, lineHeight: 1.8 } },
        asArray(props.bullets).map((bullet, i) =>
          createElement("li", { key: i, style: { color: "var(--genui-fg)" } }, String(bullet))
        )
      )
    ),

  /* ━━ WebResultsList ━━ */
  WebResultsList: (props) => {
    const items = asArray(props.items);
    return createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
      items.length === 0
        ? [createElement("div", { key: "e", style: { color: "var(--genui-muted)", padding: 16, textAlign: "center" } }, "No results")]
        : items.map((item, i) => {
            const rec = asRecord(item);
            return createElement("div", { key: i, style: card({ display: "flex", flexDirection: "column", gap: 4 }) }, [
              createElement("div", { key: "t", style: { fontWeight: 600, color: "var(--genui-accent)" } }, asString(rec.title, `Result ${i + 1}`)),
              rec.url ? createElement("div", { key: "u", style: { fontSize: 11, color: "var(--genui-muted)", wordBreak: "break-all" } }, String(rec.url)) : null,
              rec.snippet ? createElement("div", { key: "s", style: { fontSize: 13, color: "var(--genui-fg)", lineHeight: 1.5 } }, String(rec.snippet)) : null
            ]);
          })
    );
  },

  /* ━━ MapView ━━ */
  MapView: (props) => {
    const center = asRecord(props.center);
    const markers = asArray(props.markers);
    const lat = asNumber(center.lat, 37.5665);
    const lng = asNumber(center.lng, 126.978);
    return createElement("div", { style: card({ position: "relative", overflow: "hidden" }) }, [
      createElement("div", { key: "map", style: { height: 220, background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)", borderRadius: "var(--genui-radius)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" } }, [
        createElement("div", { key: "pin", style: { fontSize: 32 } }, "📍"),
        createElement("div", { key: "coord", style: { position: "absolute", bottom: 8, right: 8, fontSize: 10, background: "rgba(255,255,255,0.9)", padding: "2px 8px", borderRadius: 4 } }, `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      ]),
      markers.length > 0 ? createElement("div", { key: "ml", style: { marginTop: 8, fontSize: 12, color: "var(--genui-muted)" } }, `${markers.length} markers`) : null
    ]);
  },

  /* ━━ PipelineKanban ━━ */
  PipelineKanban: (props) => {
    const stages = asArray(props.stages);
    const stageNames = stages.length > 0 ? stages.map(String) : ["To Do", "In Progress", "Done"];
    return createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${stageNames.length}, 1fr)`, gap: 8 } },
      stageNames.map((name, i) =>
        createElement("div", { key: i, style: card({ background: "rgba(0,0,0,0.02)", minHeight: 150 }) }, [
          createElement("div", { key: "h", style: { fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "var(--genui-muted)", marginBottom: 8, letterSpacing: "0.05em" } }, String(name)),
          createElement("div", { key: "c", style: { ...card(), fontSize: 12, color: "var(--genui-muted)", textAlign: "center" } }, "Drop items here")
        ])
      )
    );
  },

  /* ━━ CodeEditor ━━ */
  CodeEditor: (props) =>
    createElement("textarea", {
      defaultValue: asString(props.value, ""),
      style: { width: "100%", minHeight: 160, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, padding: 12, border: "1px solid var(--genui-border)", borderRadius: "var(--genui-radius)", background: "#1e293b", color: "#e2e8f0", resize: "vertical" }
    }),

  CodeRunnerJS: (props) =>
    createElement("div", { style: card() }, [
      createElement("div", { key: "h", style: badge("var(--genui-muted)") }, "JS Runner"),
      createElement("pre", { key: "c", style: { margin: "8px 0 0", padding: 8, background: "#1e293b", color: "#e2e8f0", borderRadius: 6, fontSize: 12, overflow: "auto", maxHeight: 200 } }, asString(props.code, "// no code")),
      props.output ? createElement("pre", { key: "o", style: { margin: "8px 0 0", padding: 8, background: "#f1f5f9", borderRadius: 6, fontSize: 12 } }, String(props.output)) : null
    ]),

  /* ━━ Marketing ━━ */
  CampaignBrief: (props) =>
    createElement("div", { style: card({ display: "flex", flexDirection: "column", gap: 10 }) }, [
      createElement("div", { key: "t", style: { fontSize: 18, fontWeight: 700 } }, asString(props.title, "Campaign Brief")),
      createElement("div", { key: "o", style: { color: "var(--genui-muted)", fontSize: 13 } }, asString(props.objective, "Define campaign objective...")),
      props.audience ? createElement("div", { key: "a" }, [createElement("strong", { key: "l" }, "Audience: "), String(props.audience)]) : null,
      props.budget ? createElement("div", { key: "b" }, [createElement("strong", { key: "l" }, "Budget: "), String(props.budget)]) : null
    ]),

  SocialPostPreview: (props) =>
    createElement("div", { style: card({ maxWidth: 380 }) }, [
      createElement("div", { key: "h", style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } }, [
        createElement("div", { key: "a", style: { width: 36, height: 36, borderRadius: "50%", background: "var(--genui-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--genui-accent-fg)", fontWeight: 700 } }, "S"),
        createElement("div", { key: "n" }, [
          createElement("div", { key: "name", style: { fontWeight: 600, fontSize: 14 } }, asString(props.author, "@brand")),
          createElement("div", { key: "time", style: { fontSize: 11, color: "var(--genui-muted)" } }, asString(props.time, "just now"))
        ])
      ]),
      createElement("div", { key: "body", style: { fontSize: 14, lineHeight: 1.6, marginBottom: 10 } }, asString(props.text, "Preview your social post here...")),
      createElement("div", { key: "actions", style: { display: "flex", gap: 16, fontSize: 12, color: "var(--genui-muted)" } }, [
        createElement("span", { key: "like" }, `♡ ${asString(props.likes, "0")}`),
        createElement("span", { key: "rt" }, `↻ ${asString(props.shares, "0")}`),
        createElement("span", { key: "cm" }, `💬 ${asString(props.comments, "0")}`)
      ])
    ]),

  UTMBuilder: (props) =>
    createElement("div", { style: card({ display: "flex", flexDirection: "column", gap: 8 }) }, [
      createElement("div", { key: "t", style: { fontWeight: 700 } }, "UTM Builder"),
      ...(["source", "medium", "campaign", "term", "content"] as const).map((field) =>
        createElement("div", { key: field, style: { display: "flex", alignItems: "center", gap: 8 } }, [
          createElement("label", { key: "l", style: { width: 80, fontSize: 12, color: "var(--genui-muted)" } }, `utm_${field}`),
          createElement("input", { key: "i", defaultValue: asString(props[field], ""), style: { flex: 1, padding: "4px 8px", border: "1px solid var(--genui-border)", borderRadius: 4, fontSize: 13, fontFamily: "inherit" } })
        ])
      )
    ]),

  /* ━━ Sales ━━ */
  LeadList: (props) => {
    const leads = asArray(props.leads ?? props.items);
    return createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
      leads.length === 0
        ? [createElement("div", { key: "e", style: { color: "var(--genui-muted)", textAlign: "center", padding: 16 } }, "No leads")]
        : leads.map((lead, i) => {
            const rec = asRecord(lead);
            return createElement("div", { key: i, style: card({ display: "flex", justifyContent: "space-between", alignItems: "center" }) }, [
              createElement("div", { key: "info" }, [
                createElement("div", { key: "n", style: { fontWeight: 600 } }, asString(rec.name, `Lead ${i + 1}`)),
                createElement("div", { key: "c", style: { fontSize: 12, color: "var(--genui-muted)" } }, asString(rec.company, ""))
              ]),
              rec.score ? createElement("div", { key: "s", style: badge() }, `${rec.score}`) : null
            ]);
          })
    );
  },

  ProposalBuilder: (props) =>
    createElement("div", { style: card({ display: "flex", flexDirection: "column", gap: 10 }) }, [
      createElement("div", { key: "t", style: { fontSize: 18, fontWeight: 700 } }, asString(props.title, "Proposal Builder")),
      createElement("div", { key: "d", style: { color: "var(--genui-muted)" } }, asString(props.description, "Build your proposal here...")),
      createElement("div", { key: "b", style: badge() }, asString(props.status, "Draft"))
    ]),

  /* ━━ Ops ━━ */
  StatusIndicator: (props) => {
    const status = asString(props.status, "ok");
    const colors: Record<string, string> = { ok: "#22c55e", warning: "#f59e0b", error: "#ef4444", unknown: "#94a3b8" };
    return createElement("div", { style: card({ display: "flex", alignItems: "center", gap: 10 }) }, [
      createElement("div", { key: "dot", style: { width: 12, height: 12, borderRadius: "50%", background: colors[status] ?? colors.unknown } }),
      createElement("div", { key: "l", style: { fontWeight: 600 } }, asString(props.label, "System Status")),
      createElement("div", { key: "s", style: { marginLeft: "auto", fontSize: 12, color: "var(--genui-muted)" } }, status.toUpperCase())
    ]);
  },

  TaskList: (props) => {
    const tasks = asArray(props.tasks ?? props.items);
    return createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
      tasks.map((task, i) => {
        const rec = asRecord(task);
        const done = rec.done === true || rec.status === "done";
        return createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--genui-border)" } }, [
          createElement("div", { key: "c", style: { width: 18, height: 18, borderRadius: 4, border: "2px solid var(--genui-border)", background: done ? "var(--genui-accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 } }, done ? "✓" : ""),
          createElement("div", { key: "t", style: { textDecoration: done ? "line-through" : "none", color: done ? "var(--genui-muted)" : "var(--genui-fg)" } }, asString(rec.title ?? rec.text, `Task ${i + 1}`))
        ]);
      })
    );
  },

  SLAWidget: (props) =>
    createElement("div", { style: card({ textAlign: "center" }) }, [
      createElement("div", { key: "v", style: { fontSize: 32, fontWeight: 700, color: asNumber(props.value, 99) >= 99 ? "#22c55e" : asNumber(props.value, 0) >= 95 ? "#f59e0b" : "#ef4444" } }, `${asNumber(props.value, 99.9)}%`),
      createElement("div", { key: "l", style: { fontSize: 12, color: "var(--genui-muted)", marginTop: 4 } }, asString(props.label, "SLA Uptime")),
      createElement("div", { key: "t", style: { fontSize: 11, color: "var(--genui-muted)", marginTop: 2 } }, asString(props.target, "Target: 99.9%"))
    ]),

  KanbanBoard: (props) => reactComponentMap.PipelineKanban!(props),
  CalendarLite: (props) => createElement("div", { style: card({ textAlign: "center", minHeight: 200 }) }, [
    createElement("div", { key: "t", style: { fontWeight: 700, marginBottom: 8 } }, asString(props.title, "Calendar")),
    createElement("div", { key: "icon", style: { fontSize: 48, opacity: 0.3 } }, "📅"),
    createElement("div", { key: "m", style: { color: "var(--genui-muted)", fontSize: 12, marginTop: 8 } }, "Calendar view")
  ]),
  GanttLite: (props) => createElement("div", { style: card({ minHeight: 120 }) }, [
    createElement("div", { key: "t", style: { fontWeight: 700, marginBottom: 8 } }, asString(props.title, "Gantt")),
    createElement("div", { key: "bars", style: { display: "flex", flexDirection: "column", gap: 4 } },
      asArray(props.tasks ?? props.items).slice(0, 5).map((t, i) =>
        createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 8 } }, [
          createElement("div", { key: "l", style: { width: 80, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis" } }, asString(asRecord(t).title, `Task ${i}`)),
          createElement("div", { key: "b", style: { flex: 1, height: 16, background: "var(--genui-accent)", borderRadius: 4, opacity: 0.3 + (i * 0.15) } })
        ])
      )
    )
  ]),

  /* ━━ Analysis ━━ */
  DataQualityReport: (props) => createElement("div", { style: card() }, [
    createElement("div", { key: "t", style: { fontWeight: 700, marginBottom: 8 } }, "Data Quality"),
    ...(["completeness", "accuracy", "consistency", "timeliness"] as const).map((m) =>
      createElement("div", { key: m, style: { display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--genui-border)" } }, [
        createElement("span", { key: "l" }, m.charAt(0).toUpperCase() + m.slice(1)),
        createElement("span", { key: "v", style: { fontWeight: 600 } }, `${asNumber(props[m], 95)}%`)
      ])
    )
  ]),

  /* ━━ Misc ━━ */
  DebugJSON: (props) => createElement("pre", { style: { ...card(), fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, overflow: "auto", maxHeight: 300, whiteSpace: "pre-wrap" } }, JSON.stringify(props.value ?? props, null, 2)),
  ActivityLog: (props) =>
    createElement("div", { style: card({ maxHeight: 200, overflow: "auto" }) },
      createElement("ul", { style: { margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.8 } },
        asArray(props.entries).map((entry, i) =>
          createElement("li", { key: i, style: { color: "var(--genui-muted)" } }, String(entry))
        )
      )
    ),
  MeasuredText: (props) => {
    const text = asString(props.text, "");
    const variant = asString(props.variant, "body");
    const fontSize = variant === "title" ? "22px" : variant === "caption" ? "13px" : "15px";
    return createElement("div", { style: card() },
      createElement("div", { style: { fontSize, lineHeight: 1.6 } }, text)
    );
  },

  /* ━━ Geo ━━ */
  GeoSearchBox: (props) =>
    createElement("div", { style: card({ display: "flex", gap: 8 }) }, [
      createElement("input", { key: "i", placeholder: asString(props.placeholder, "Search location..."), style: { flex: 1, padding: "8px 12px", border: "1px solid var(--genui-border)", borderRadius: "var(--genui-radius)", fontFamily: "inherit" } }),
      createElement("button", { key: "b", style: { ...badge(), padding: "8px 14px", border: "none", cursor: "pointer" } }, "Search")
    ]),
  RoutePlanner: (props) =>
    createElement("div", { style: card() }, [
      createElement("div", { key: "t", style: { fontWeight: 700, marginBottom: 8 } }, "Route Planner"),
      createElement("div", { key: "map", style: { height: 160, background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", borderRadius: "var(--genui-radius)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 } }, "🗺️"),
      createElement("div", { key: "m", style: { marginTop: 8, fontSize: 12, color: "var(--genui-muted)" } }, asString(props.description, "Plan your route"))
    ]),

  /* ━━ Dev ━━ */
  ToolBuilderWizard: (props) =>
    createElement("div", { style: card() }, [
      createElement("div", { key: "t", style: { fontWeight: 700, marginBottom: 8 } }, "Tool Builder"),
      createElement("div", { key: "d", style: { fontSize: 13, color: "var(--genui-muted)" } }, "Create a new tool stub with schema and handler")
    ]),
  NotebookCells: (props) =>
    createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
      asArray(props.cells).length === 0
        ? [createElement("div", { key: "e", style: card({ fontFamily: "ui-monospace, monospace", fontSize: 13, color: "var(--genui-muted)" }) }, "# New notebook cell\n")]
        : asArray(props.cells).map((cell, i) =>
            createElement("div", { key: i, style: card({ fontFamily: "ui-monospace, monospace", fontSize: 13 }) }, String(asRecord(cell).code ?? asRecord(cell).text ?? ""))
          )
    ),

  /* ━━ Other ━━ */
  FileUpload: (props) =>
    createElement("div", { style: card({ textAlign: "center", border: "2px dashed var(--genui-border)", cursor: "pointer" }) }, [
      createElement("div", { key: "i", style: { fontSize: 32, opacity: 0.4 } }, "📁"),
      createElement("div", { key: "t", style: { color: "var(--genui-muted)", fontSize: 13 } }, asString(props.label, "Drop files here or click to upload"))
    ]),
  ContentCalendar: (props) => reactComponentMap.CalendarLite!(props),
  PivotTableLite: (props) => reactComponentMap.DataTable!(props),
  SQLQueryEditor: (props) => reactComponentMap.CodeEditor!({ ...props, value: asString(props.query ?? props.value, "SELECT * FROM ...") }),
  DiffViewer: (props) =>
    createElement("pre", { style: card({ fontFamily: "ui-monospace, monospace", fontSize: 12, whiteSpace: "pre-wrap" }) }, asString(props.diff ?? props.value, "No diff")),

  /* ━━ Error Placeholder (used by block-level isolation) ━━ */
  ErrorPlaceholder: (props) =>
    createElement("div", { style: card({ background: "#fef2f2", borderColor: "#fecaca", textAlign: "center" }) }, [
      createElement("div", { key: "i", style: { fontSize: 24, marginBottom: 4 } }, "⚠"),
      createElement("div", { key: "m", style: { color: "#991b1b", fontSize: 13 } }, asString(props.message, "This block failed to render")),
      createElement("div", { key: "h", style: { color: "#dc2626", fontSize: 11, marginTop: 4 } }, asString(props.hint, "Try regenerating this section"))
    ])
};

export function listReactSupportedComponents(): string[] {
  return Object.keys(reactComponentMap);
}
