import type { UIPlan } from "@genui/core";

export interface Planner {
  plan(prompt: string, context?: Record<string, unknown>): UIPlan;
}

function basePlan(title: string, intent: UIPlan["intent"], blocks: UIPlan["blocks"]): UIPlan {
  return {
    version: "1.0",
    title,
    intent,
    layout: {
      shell: "workbench",
      regions: ["left", "main", "right", "bottom"]
    },
    blocks,
    actions: [],
    dataSources: [],
    state: {},
    permissions: {
      requested: [],
      granted: []
    }
  };
}

export class MockPlanner implements Planner {
  private readonly templates = new Map<string, UIPlan>([
    ["리서치해서 A vs B 비교표 만들어줘", basePlan("A vs B Research", "research", [{ id: "cmp", type: "ComparisonMatrix", region: "main", props: { columns: ["A", "B"] } }])],
    ["CSV 업로드해서 KPI랑 차트 보여줘", basePlan("CSV KPI", "analysis", [{ id: "kpi", type: "KPIGrid", region: "main", props: { items: [{ label: "Revenue", value: "-" }] } }, { id: "chart", type: "ChartBlock", region: "right", props: { chartType: "line", series: [] } }])],
    ["캠페인 브리프 만들고 SNS 프리뷰", basePlan("Campaign + Social", "marketing", [{ id: "brief", type: "CampaignBrief", region: "main", props: {} }, { id: "social", type: "SocialPostPreview", region: "right", props: {} }])],
    ["리드 리스트 보여주고 점수화", basePlan("Lead Scoring", "sales", [{ id: "leads", type: "LeadList", region: "main", props: {} }])],
    ["지도에서 근처 카페 찾아", basePlan("Nearby Cafe", "geo", [{ id: "map", type: "MapView", region: "main", props: { center: { lat: 37.5665, lng: 126.978 }, markers: [] } }])],
    ["이 자리에서 차트 코드로 만들어", basePlan("Code + Chart", "dev", [{ id: "editor", type: "CodeEditor", region: "left", props: { value: "" } }, { id: "runner", type: "CodeRunnerJS", region: "main", props: { code: "", output: "" } }, { id: "chart", type: "ChartBlock", region: "right", props: { chartType: "bar", series: [] } }])],
    ["새 툴 스텁 만들어줘", basePlan("Tool Stub", "dev", [{ id: "wizard", type: "ToolBuilderWizard", region: "main", props: {} }])],
    ["research ai trends", basePlan("AI Trends", "research", [{ id: "results", type: "WebResultsList", region: "main", props: { items: [] } }])],
    ["compare pricing plans", basePlan("Pricing Comparison", "analysis", [{ id: "compare", type: "ComparisonMatrix", region: "main", props: { columns: ["Basic", "Pro", "Enterprise"] } }])],
    ["summarize these sources", basePlan("Source Summary", "research", [{ id: "summary", type: "SummaryBlock", region: "main", props: { bullets: [] } }])],
    ["build campaign brief", basePlan("Campaign Brief", "marketing", [{ id: "brief", type: "CampaignBrief", region: "main", props: {} }])],
    ["generate utm builder", basePlan("UTM Builder", "marketing", [{ id: "utm", type: "UTMBuilder", region: "main", props: {} }])],
    ["social post preview", basePlan("Social Preview", "marketing", [{ id: "social", type: "SocialPostPreview", region: "main", props: {} }])],
    ["show pipeline board", basePlan("Pipeline", "sales", [{ id: "pipe", type: "PipelineKanban", region: "main", props: { stages: [] } }])],
    ["proposal workspace", basePlan("Proposal", "sales", [{ id: "proposal", type: "ProposalBuilder", region: "main", props: {} }])],
    ["daily ops dashboard", basePlan("Ops Dashboard", "ops", [{ id: "status", type: "StatusIndicator", region: "left", props: {} }, { id: "tasks", type: "TaskList", region: "main", props: {} }, { id: "sla", type: "SLAWidget", region: "right", props: {} }])],
    ["make task board", basePlan("Task Kanban", "ops", [{ id: "kanban", type: "KanbanBoard", region: "main", props: {} }])],
    ["calendar planning", basePlan("Calendar", "ops", [{ id: "calendar", type: "CalendarLite", region: "main", props: {} }])],
    ["build gantt", basePlan("Gantt", "ops", [{ id: "gantt", type: "GanttLite", region: "main", props: {} }])],
    ["data quality report", basePlan("Data Quality", "analysis", [{ id: "dq", type: "DataQualityReport", region: "main", props: {} }])],
    ["pivot this table", basePlan("Pivot", "analysis", [{ id: "pivot", type: "PivotTableLite", region: "main", props: {} }])],
    ["query sql quickly", basePlan("SQL", "analysis", [{ id: "sql", type: "SQLQueryEditor", region: "main", props: {} }])],
    ["show debug json", basePlan("Debug", "dev", [{ id: "dbg", type: "DebugJSON", region: "main", props: { value: {} } }])],
    [
      "긴 텍스트를 안정적으로 미리보기",
      basePlan("Measured Text Preview", "analysis", [
        {
          id: "measured-copy",
          type: "MeasuredText",
          region: "main",
          props: {
            text: "Pretext can give this workbench deterministic line breaks before we depend on DOM text measurement. 그래서 긴 요약 블록이나 복사본 미리보기에서도 레이아웃 변동을 줄일 수 있습니다.",
            variant: "body",
            measureWidth: 360,
            maxLines: 5,
            whiteSpace: "normal",
            showMetrics: true
          }
        }
      ])
    ],
    ["load file and chart", basePlan("File + Chart", "analysis", [{ id: "upload", type: "FileUpload", region: "left", props: {} }, { id: "chart", type: "ChartBlock", region: "main", props: { chartType: "line", series: [] } }])],
    ["geo route plan", basePlan("Route Plan", "geo", [{ id: "geo-search", type: "GeoSearchBox", region: "left", props: {} }, { id: "route", type: "RoutePlanner", region: "main", props: {} }])],
    ["notebook for analysis", basePlan("Notebook", "dev", [{ id: "nb", type: "NotebookCells", region: "main", props: {} }])]
  ]);

  plan(prompt: string): UIPlan {
    const trimmed = prompt.trim();
    const template = this.templates.get(trimmed);
    if (template) {
      return template;
    }

    return basePlan("Custom Workbench", "custom", [{ id: "summary", type: "SummaryBlock", region: "main", props: { bullets: [trimmed] } }]);
  }

  getPromptCount(): number {
    return this.templates.size;
  }
}
