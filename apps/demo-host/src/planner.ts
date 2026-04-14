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
    ["CSV 업로드해서 KPI랑 차트 보여줘", basePlan("CSV KPI", "analysis", [
      { id: "kpi", type: "KPIGrid", region: "main", props: { items: [
        { label: "Total Revenue", value: "$1.2M", change: "+12%" },
        { label: "Avg Order Value", value: "$85", change: "+3.4%" },
        { label: "Customers", value: "14,200", change: "+820" }
      ] } },
      { id: "chart", type: "ChartBlock", region: "main", props: { chartType: "bar", labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], series: [{ name: "Revenue", data: [180, 210, 195, 240, 220, 280] }] } }
    ])],
    ["캠페인 브리프 만들고 SNS 프리뷰", basePlan("Campaign + Social", "marketing", [
      { id: "brief", type: "CampaignBrief", region: "main", props: { title: "Summer Sale 2026", objective: "Q3 매출 30% 증대를 위한 여름 프로모션 캠페인", audience: "25-35세 MZ 세대", budget: "$50,000" } },
      { id: "social", type: "SocialPostPreview", region: "right", props: { author: "@mybrand", text: "올 여름, 놓치면 후회할 딱 한 번의 기회! 최대 70% 할인 — 지금 바로 확인하세요 ☀️🛍️ #SummerSale #한정판", likes: "2.4K", shares: "891", comments: "342", time: "2h ago" } }
    ])],
    ["리드 리스트 보여주고 점수화", basePlan("Lead Scoring", "sales", [
      { id: "leads", type: "LeadList", region: "main", props: { items: [
        { name: "김민수", company: "테크스타트업 Inc.", score: 92 },
        { name: "이서연", company: "글로벌커머스", score: 87 },
        { name: "박지훈", company: "AI솔루션즈", score: 78 },
        { name: "최유나", company: "디지털마케팅", score: 65 },
        { name: "정도현", company: "핀테크코리아", score: 54 }
      ] } },
      { id: "kpi", type: "KPIGrid", region: "right", props: { items: [
        { label: "Total Leads", value: "248", change: "+32" },
        { label: "Qualified", value: "67%", change: "+5%" },
        { label: "Avg Score", value: "74", change: "+3" }
      ] } }
    ])],
    ["지도에서 근처 카페 찾아", basePlan("Nearby Cafe", "geo", [{ id: "map", type: "MapView", region: "main", props: { center: { lat: 37.5665, lng: 126.978 }, markers: [] } }])],
    ["이 자리에서 차트 코드로 만들어", basePlan("Code + Chart", "dev", [{ id: "editor", type: "CodeEditor", region: "left", props: { value: "" } }, { id: "runner", type: "CodeRunnerJS", region: "main", props: { code: "", output: "" } }, { id: "chart", type: "ChartBlock", region: "right", props: { chartType: "bar", series: [] } }])],
    ["새 툴 스텁 만들어줘", basePlan("Tool Stub", "dev", [{ id: "wizard", type: "ToolBuilderWizard", region: "main", props: {} }])],
    ["research ai trends", basePlan("AI Trends", "research", [
      { id: "results", type: "WebResultsList", region: "main", props: { items: [
        { title: "GPT-5 Architecture Leaked: Mixture of Agents", url: "https://arxiv.org/abs/2026.01234", snippet: "A new paper reveals the internal architecture of next-gen language models using a mixture-of-agents approach..." },
        { title: "Apple Intelligence 3.0 Launches with On-Device RAG", url: "https://developer.apple.com/ai", snippet: "Apple's latest update brings retrieval-augmented generation directly to iPhone and Mac..." },
        { title: "EU AI Act Implementation: What Developers Need to Know", url: "https://euaiact.com/guide", snippet: "Full compliance deadline approaching. Key changes for model providers and deployers..." }
      ] } },
      { id: "summary", type: "SummaryBlock", region: "right", props: { bullets: ["AI agents are becoming the primary interface paradigm", "On-device inference is closing the gap with cloud models", "Regulation is accelerating worldwide, especially in EU and Korea"] } }
    ])],
    ["compare pricing plans", basePlan("Pricing Comparison", "analysis", [
      { id: "compare", type: "ComparisonMatrix", region: "main", props: {
        columns: ["Basic", "Pro", "Enterprise"],
        rows: [
          { label: "Price", Basic: "$9/mo", Pro: "$29/mo", Enterprise: "Custom" },
          { label: "Users", Basic: "1", Pro: "10", Enterprise: "Unlimited" },
          { label: "Storage", Basic: "10GB", Pro: "100GB", Enterprise: "1TB" },
          { label: "API Access", Basic: "—", Pro: "✓", Enterprise: "✓" },
          { label: "Support", Basic: "Email", Pro: "Priority", Enterprise: "Dedicated" }
        ]
      } }
    ])],
    ["summarize these sources", basePlan("Source Summary", "research", [{ id: "summary", type: "SummaryBlock", region: "main", props: { bullets: [] } }])],
    ["build campaign brief", basePlan("Campaign Brief", "marketing", [{ id: "brief", type: "CampaignBrief", region: "main", props: {} }])],
    ["generate utm builder", basePlan("UTM Builder", "marketing", [{ id: "utm", type: "UTMBuilder", region: "main", props: {} }])],
    ["social post preview", basePlan("Social Preview", "marketing", [{ id: "social", type: "SocialPostPreview", region: "main", props: {} }])],
    ["show pipeline board", basePlan("Pipeline", "sales", [{ id: "pipe", type: "PipelineKanban", region: "main", props: { stages: [] } }])],
    ["proposal workspace", basePlan("Proposal", "sales", [{ id: "proposal", type: "ProposalBuilder", region: "main", props: {} }])],
    ["daily ops dashboard", basePlan("Ops Dashboard", "ops", [
      { id: "kpi", type: "KPIGrid", region: "main", props: { items: [
        { label: "Active Users", value: "12,847", change: "+14.2%" },
        { label: "Revenue (MTD)", value: "$284K", change: "+8.7%" },
        { label: "Uptime", value: "99.97%", change: "+0.02%" },
        { label: "Open Tickets", value: "23", change: "-5" }
      ] } },
      { id: "chart", type: "ChartBlock", region: "main", props: { chartType: "bar", labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], series: [{ name: "requests", data: [1200, 1900, 1600, 2100, 1800, 900, 700] }] } },
      { id: "status", type: "StatusIndicator", region: "left", props: { label: "API Gateway", status: "ok" } },
      { id: "status2", type: "StatusIndicator", region: "left", props: { label: "Database", status: "ok" } },
      { id: "status3", type: "StatusIndicator", region: "left", props: { label: "CDN", status: "warning" } },
      { id: "tasks", type: "TaskList", region: "right", props: { items: [
        { title: "Deploy v2.4.1 hotfix", done: true },
        { title: "Review Q2 capacity plan", done: false },
        { title: "Update SSL certificates", done: false },
        { title: "Migrate staging DB", done: true },
        { title: "Write post-mortem for incident #891", done: false }
      ] } },
      { id: "sla", type: "SLAWidget", region: "right", props: { value: 99.97, label: "SLA Uptime", target: "Target: 99.9%" } }
    ])],
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
