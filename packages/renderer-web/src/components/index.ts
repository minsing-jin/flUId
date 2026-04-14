import { formatMeasuredTextMetrics, measureMeasuredText, normalizeMeasuredTextProps, resolveMeasuredTextVariant } from "./measured-text.js";

const GENUI_COMPONENT_TAGS = {
  WorkbenchShell: "genui-workbench-shell",
  PromptInput: "genui-prompt-input",
  ActivityLog: "genui-activity-log",
  PermissionGate: "genui-permission-gate",
  DebugJSON: "genui-debug-json",
  MeasuredText: "genui-measured-text",
  DataTable: "genui-data-table",
  ChartBlock: "genui-chart-block",
  KPIGrid: "genui-kpi-grid",
  SummaryBlock: "genui-summary-block",
  WebResultsList: "genui-web-results-list",
  ComparisonMatrix: "genui-comparison-matrix",
  CodeEditor: "genui-code-editor",
  CodeRunnerJS: "genui-code-runner-js",
  MapView: "genui-map-view",
  PipelineKanban: "genui-pipeline-kanban"
} as const;

type JsonRecord = Record<string, unknown>;

function parsePropsAttribute(element: HTMLElement): JsonRecord {
  const raw = element.getAttribute("data-props");
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as JsonRecord) : {};
  } catch {
    return {};
  }
}

class BaseGenUIElement extends HTMLElement {
  protected props: JsonRecord = {};

  connectedCallback(): void {
    this.refresh();
  }

  static get observedAttributes(): string[] {
    return ["data-props"];
  }

  attributeChangedCallback(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.props = parsePropsAttribute(this);
    this.render();
  }

  protected render(): void {
    this.textContent = "GenUI component";
  }
}

class WorkbenchShellElement extends BaseGenUIElement {
  protected override render(): void {
    this.innerHTML = `
      <section class="genui-shell">
        <div class="genui-region genui-region-left" data-region="left"></div>
        <div class="genui-region genui-region-main" data-region="main"></div>
        <div class="genui-region genui-region-right" data-region="right"></div>
        <div class="genui-region genui-region-bottom" data-region="bottom"></div>
      </section>
    `;
  }
}

class PromptInputElement extends BaseGenUIElement {
  protected override render(): void {
    const placeholder = typeof this.props.placeholder === "string" ? this.props.placeholder : "Describe your workbench...";
    this.innerHTML = `
      <div class="genui-prompt-input">
        <input type="text" placeholder="${placeholder}" />
        <button type="button">Generate</button>
      </div>
    `;

    const input = this.querySelector("input");
    const button = this.querySelector("button");
    if (!input || !button) {
      return;
    }

    button.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("genui-prompt", {
          detail: { text: input.value },
          bubbles: true
        })
      );
    });
  }
}

class ActivityLogElement extends BaseGenUIElement {
  protected override render(): void {
    const entries = Array.isArray(this.props.entries) ? this.props.entries : [];
    const list = entries
      .map((entry) => `<li>${String(entry)}</li>`)
      .join("");
    this.innerHTML = `<section><h4>Activity</h4><ul>${list}</ul></section>`;
  }
}

class PermissionGateElement extends BaseGenUIElement {
  protected override render(): void {
    const requested = Array.isArray(this.props.requested) ? this.props.requested : [];
    const granted = new Set(Array.isArray(this.props.granted) ? this.props.granted.map(String) : []);
    const missing = requested.map(String).filter((permission) => !granted.has(permission));

    this.innerHTML = missing.length
      ? `<article><strong>Permissions needed</strong><p>${missing.join(", ")}</p></article>`
      : `<article><strong>Permissions OK</strong></article>`;
  }
}

class DebugJsonElement extends BaseGenUIElement {
  protected override render(): void {
    this.innerHTML = `<pre>${JSON.stringify(this.props.value ?? this.props, null, 2)}</pre>`;
  }
}

class MeasuredTextElement extends BaseGenUIElement {
  protected override render(): void {
    const config = normalizeMeasuredTextProps(this.props);
    const variant = resolveMeasuredTextVariant(config.variant);
    const layout = measureMeasuredText(config);

    const article = document.createElement("article");
    article.style.display = "grid";
    article.style.gap = "8px";
    article.style.width = `min(100%, ${config.measureWidth}px)`;
    article.style.boxSizing = "border-box";
    article.style.padding = "12px 14px";
    article.style.border = "1px solid #d9e2ec";
    article.style.borderRadius = "12px";
    article.style.background = "#ffffff";
    article.style.color = "#102a43";
    article.dataset.genuiMeasured = layout.engine;

    const textContainer = document.createElement("div");
    textContainer.style.display = "grid";
    textContainer.style.gap = "0";
    textContainer.style.fontFamily = variant.fontFamily;
    textContainer.style.fontSize = variant.fontSize;
    textContainer.style.fontWeight = variant.fontWeight;
    textContainer.style.lineHeight = `${variant.lineHeight}px`;
    textContainer.style.wordBreak = "break-word";

    for (const lineText of layout.visibleLines) {
      const line = document.createElement("div");
      line.textContent = lineText;
      line.style.minHeight = `${variant.lineHeight}px`;
      line.style.whiteSpace = config.whiteSpace === "pre-wrap" ? "pre-wrap" : "normal";
      textContainer.appendChild(line);
    }

    article.appendChild(textContainer);

    if (layout.truncated) {
      const truncation = document.createElement("small");
      truncation.textContent = `+${layout.hiddenLineCount} more line${layout.hiddenLineCount === 1 ? "" : "s"}`;
      truncation.style.color = "#486581";
      article.appendChild(truncation);
    }

    if (config.showMetrics) {
      const metrics = document.createElement("small");
      metrics.textContent = formatMeasuredTextMetrics(config, layout);
      metrics.style.color = "#486581";
      article.appendChild(metrics);
    }

    this.replaceChildren(article);
  }
}

class DataTableElement extends BaseGenUIElement {
  protected override render(): void {
    const columns = Array.isArray(this.props.columns) ? this.props.columns.map(String) : [];
    const rows = Array.isArray(this.props.rows) ? this.props.rows : [];

    const headerHtml = columns.map((col) => `<th>${col}</th>`).join("");
    const bodyHtml = rows
      .map((row) => {
        if (!row || typeof row !== "object") {
          return "";
        }
        const record = row as Record<string, unknown>;
        const cells = columns.map((col) => `<td>${String(record[col] ?? "")}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    this.innerHTML = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  }
}

class ChartBlockElement extends BaseGenUIElement {
  protected override render(): void {
    const chartType = typeof this.props.chartType === "string" ? this.props.chartType : "line";
    this.innerHTML = `<section><h4>Chart (${chartType})</h4><pre>${JSON.stringify(this.props.series ?? [], null, 2)}</pre></section>`;
  }
}

class KPIGridElement extends BaseGenUIElement {
  protected override render(): void {
    const items = Array.isArray(this.props.items) ? this.props.items : [];
    const cards = items
      .map((item) => {
        if (!item || typeof item !== "object") {
          return "";
        }
        const record = item as Record<string, unknown>;
        return `<article><strong>${String(record.label ?? "KPI")}</strong><p>${String(record.value ?? "-")}</p></article>`;
      })
      .join("");
    this.innerHTML = `<section class="genui-kpi-grid">${cards}</section>`;
  }
}

class SummaryBlockElement extends BaseGenUIElement {
  protected override render(): void {
    const bullets = Array.isArray(this.props.bullets) ? this.props.bullets.map(String) : [];
    this.innerHTML = `<ul>${bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>`;
  }
}

class WebResultsListElement extends BaseGenUIElement {
  protected override render(): void {
    const items = Array.isArray(this.props.items) ? this.props.items : [];
    const rows = items
      .map((item) => {
        if (!item || typeof item !== "object") {
          return "";
        }
        const record = item as Record<string, unknown>;
        const title = String(record.title ?? "result");
        const url = String(record.url ?? "#");
        return `<li><a href="${url}" target="_blank" rel="noreferrer">${title}</a></li>`;
      })
      .join("");

    this.innerHTML = `<ol>${rows}</ol>`;
  }
}

class ComparisonMatrixElement extends BaseGenUIElement {
  protected override render(): void {
    const columns = Array.isArray(this.props.columns) ? this.props.columns.map(String) : [];
    const rows = Array.isArray(this.props.rows) ? this.props.rows : [];
    const header = columns.map((column) => `<th>${column}</th>`).join("");

    const body = rows
      .map((row) => {
        if (!row || typeof row !== "object") {
          return "";
        }
        const record = row as Record<string, unknown>;
        const cells = columns.map((column) => `<td>${String(record[column] ?? "")}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    this.innerHTML = `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  }
}

class CodeEditorElement extends BaseGenUIElement {
  protected override render(): void {
    const value = typeof this.props.value === "string" ? this.props.value : "";
    this.innerHTML = `<textarea spellcheck="false">${value}</textarea>`;

    const textarea = this.querySelector("textarea");
    if (!textarea) {
      return;
    }

    textarea.addEventListener("input", () => {
      this.dispatchEvent(
        new CustomEvent("genui-code-change", {
          detail: { value: textarea.value },
          bubbles: true
        })
      );
    });
  }
}

class CodeRunnerJsElement extends BaseGenUIElement {
  protected override render(): void {
    const code = typeof this.props.code === "string" ? this.props.code : "";
    const output = typeof this.props.output === "string" ? this.props.output : "";
    this.innerHTML = `
      <section>
        <textarea spellcheck="false">${code}</textarea>
        <button type="button">Run JS</button>
        <pre>${output}</pre>
      </section>
    `;

    const button = this.querySelector("button");
    const textarea = this.querySelector("textarea");
    if (!button || !textarea) {
      return;
    }

    button.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("genui-code-run-request", {
          detail: { code: textarea.value },
          bubbles: true
        })
      );
    });
  }
}

class MapViewElement extends BaseGenUIElement {
  protected override render(): void {
    const center = this.props.center ?? { lat: 37.5665, lng: 126.978 };
    const markers = Array.isArray(this.props.markers) ? this.props.markers : [];

    this.innerHTML = `
      <section>
        <h4>MapView</h4>
        <p>center: ${JSON.stringify(center)}</p>
        <pre>${JSON.stringify(markers, null, 2)}</pre>
      </section>
    `;
  }
}

class PipelineKanbanElement extends BaseGenUIElement {
  protected override render(): void {
    const stages = Array.isArray(this.props.stages) ? this.props.stages : [];
    const stageHtml = stages
      .map((stage) => {
        if (!stage || typeof stage !== "object") {
          return "";
        }
        const record = stage as Record<string, unknown>;
        const title = String(record.title ?? "Stage");
        const cards = Array.isArray(record.cards)
          ? (record.cards as unknown[]).map((card) => `<li>${String(card)}</li>`).join("")
          : "";
        return `<section><h5>${title}</h5><ul>${cards}</ul></section>`;
      })
      .join("");

    this.innerHTML = `<div class="genui-kanban">${stageHtml}</div>`;
  }
}

const ELEMENTS: Array<[string, CustomElementConstructor]> = [
  [GENUI_COMPONENT_TAGS.WorkbenchShell, WorkbenchShellElement],
  [GENUI_COMPONENT_TAGS.PromptInput, PromptInputElement],
  [GENUI_COMPONENT_TAGS.ActivityLog, ActivityLogElement],
  [GENUI_COMPONENT_TAGS.PermissionGate, PermissionGateElement],
  [GENUI_COMPONENT_TAGS.DebugJSON, DebugJsonElement],
  [GENUI_COMPONENT_TAGS.MeasuredText, MeasuredTextElement],
  [GENUI_COMPONENT_TAGS.DataTable, DataTableElement],
  [GENUI_COMPONENT_TAGS.ChartBlock, ChartBlockElement],
  [GENUI_COMPONENT_TAGS.KPIGrid, KPIGridElement],
  [GENUI_COMPONENT_TAGS.SummaryBlock, SummaryBlockElement],
  [GENUI_COMPONENT_TAGS.WebResultsList, WebResultsListElement],
  [GENUI_COMPONENT_TAGS.ComparisonMatrix, ComparisonMatrixElement],
  [GENUI_COMPONENT_TAGS.CodeEditor, CodeEditorElement],
  [GENUI_COMPONENT_TAGS.CodeRunnerJS, CodeRunnerJsElement],
  [GENUI_COMPONENT_TAGS.MapView, MapViewElement],
  [GENUI_COMPONENT_TAGS.PipelineKanban, PipelineKanbanElement]
];

export function defineDefaultWebComponents(): void {
  for (const [tagName, constructor] of ELEMENTS) {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, constructor);
    }
  }
}

export function resolveTagName(componentType: string): string {
  if (Object.prototype.hasOwnProperty.call(GENUI_COMPONENT_TAGS, componentType)) {
    return GENUI_COMPONENT_TAGS[componentType as keyof typeof GENUI_COMPONENT_TAGS];
  }

  return "genui-debug-json";
}

export function listDefaultComponentTypes(): string[] {
  return Object.keys(GENUI_COMPONENT_TAGS);
}
