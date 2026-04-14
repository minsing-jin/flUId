import type { UIPlan, Block } from "@genui/core";

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
    ["notebook for analysis", basePlan("Notebook", "dev", [{ id: "nb", type: "NotebookCells", region: "main", props: {} }])],

    /* ── Generic Declarative Renderer 데모 (Flexible UI) ── */
    ["내 프로필 페이지 만들어줘", basePlan("My Profile", "custom", [
      { id: "profile", type: "UserProfile", region: "main", props: {
        children: [
          { element: "card", children: [
            { element: "flex", align: "center", gap: 16, children: [
              { element: "image", src: "https://api.dicebear.com/7.x/avataaars/svg?seed=fluid", alt: "avatar", style: { width: 80, height: 80, borderRadius: "50%" } },
              { element: "stack", gap: 4, children: [
                { element: "heading", value: "flUId User", level: 2 },
                { element: "text", value: "Product Owner · Seoul, Korea", style: { color: "var(--genui-muted)" } },
                { element: "flex", gap: 8, children: [
                  { element: "badge", value: "Pro Plan", color: "var(--genui-accent)" },
                  { element: "badge", value: "Early Adopter", color: "#22c55e" }
                ] }
              ] }
            ] },
            { element: "divider" },
            { element: "grid", columns: 3, children: [
              { element: "stack", children: [{ element: "text", value: "142", style: { fontSize: 24, fontWeight: 700, color: "var(--genui-accent)" } }, { element: "text", value: "Projects", style: { fontSize: 12, color: "var(--genui-muted)" } }] },
              { element: "stack", children: [{ element: "text", value: "1.2K", style: { fontSize: 24, fontWeight: 700, color: "var(--genui-accent)" } }, { element: "text", value: "Followers", style: { fontSize: 12, color: "var(--genui-muted)" } }] },
              { element: "stack", children: [{ element: "text", value: "89%", style: { fontSize: 24, fontWeight: 700, color: "var(--genui-accent)" } }, { element: "text", value: "Completion", style: { fontSize: 12, color: "var(--genui-muted)" } }] }
            ] },
            { element: "divider" },
            { element: "heading", value: "Recent Activity", level: 3 },
            { element: "stack", gap: 6, children: [
              { element: "flex", justify: "space-between", children: [{ element: "text", value: "Created 'Sales Dashboard'" }, { element: "text", value: "2h ago", style: { color: "var(--genui-muted)", fontSize: 12 } }] },
              { element: "flex", justify: "space-between", children: [{ element: "text", value: "Updated marketing campaign" }, { element: "text", value: "5h ago", style: { color: "var(--genui-muted)", fontSize: 12 } }] },
              { element: "flex", justify: "space-between", children: [{ element: "text", value: "Shared report with team" }, { element: "text", value: "1d ago", style: { color: "var(--genui-muted)", fontSize: 12 } }] }
            ] }
          ] }
        ]
      } }
    ])],

    ["날씨 위젯 만들어줘", basePlan("Weather Dashboard", "custom", [
      { id: "weather", type: "WeatherWidget", region: "main", props: {
        children: [
          { element: "grid", columns: 2, children: [
            { element: "card", children: [
              { element: "flex", align: "center", gap: 16, children: [
                { element: "text", value: "☀️", style: { fontSize: 64 } },
                { element: "stack", gap: 2, children: [
                  { element: "text", value: "Seoul", style: { fontSize: 14, color: "var(--genui-muted)" } },
                  { element: "text", value: "24°C", style: { fontSize: 42, fontWeight: 700, color: "var(--genui-fg)" } },
                  { element: "text", value: "Sunny · Feels like 26°C", style: { fontSize: 13, color: "var(--genui-muted)" } }
                ] }
              ] },
              { element: "divider" },
              { element: "flex", justify: "space-between", children: [
                { element: "stack", children: [{ element: "text", value: "Humidity", style: { fontSize: 11, color: "var(--genui-muted)" } }, { element: "text", value: "45%", style: { fontWeight: 600 } }] },
                { element: "stack", children: [{ element: "text", value: "Wind", style: { fontSize: 11, color: "var(--genui-muted)" } }, { element: "text", value: "12 km/h", style: { fontWeight: 600 } }] },
                { element: "stack", children: [{ element: "text", value: "UV", style: { fontSize: 11, color: "var(--genui-muted)" } }, { element: "text", value: "High", style: { fontWeight: 600, color: "#f59e0b" } }] }
              ] }
            ] },
            { element: "card", children: [
              { element: "heading", value: "7-Day Forecast", level: 3 },
              { element: "stack", gap: 8, children: [
                { element: "flex", justify: "space-between", align: "center", children: [{ element: "text", value: "Mon" }, { element: "text", value: "☀️ 25°/18°" }, { element: "progress", percent: 10, height: 4, color: "#3b82f6" }] },
                { element: "flex", justify: "space-between", align: "center", children: [{ element: "text", value: "Tue" }, { element: "text", value: "⛅ 22°/16°" }, { element: "progress", percent: 30, height: 4, color: "#3b82f6" }] },
                { element: "flex", justify: "space-between", align: "center", children: [{ element: "text", value: "Wed" }, { element: "text", value: "🌧️ 19°/14°" }, { element: "progress", percent: 80, height: 4, color: "#3b82f6" }] },
                { element: "flex", justify: "space-between", align: "center", children: [{ element: "text", value: "Thu" }, { element: "text", value: "⛅ 21°/15°" }, { element: "progress", percent: 40, height: 4, color: "#3b82f6" }] },
                { element: "flex", justify: "space-between", align: "center", children: [{ element: "text", value: "Fri" }, { element: "text", value: "☀️ 26°/19°" }, { element: "progress", percent: 5, height: 4, color: "#3b82f6" }] }
              ] }
            ] }
          ] },
          { element: "alert", variant: "info", value: "Air quality is Good (AQI 42). Enjoy outdoor activities!" }
        ]
      } }
    ])]
  ]);

  plan(prompt: string): UIPlan {
    const trimmed = prompt.trim();

    // Exact match
    const template = this.templates.get(trimmed);
    if (template) return template;

    // Fuzzy match
    for (const [key, plan] of this.templates) {
      const keywords = key.toLowerCase().split(/\s+/);
      const promptLower = trimmed.toLowerCase();
      const matchCount = keywords.filter((kw) => kw.length > 2 && promptLower.includes(kw)).length;
      if (matchCount >= 2) return plan;
    }

    // Smart generation: analyze keywords and build a meaningful UI
    return this.smartGenerate(trimmed);
  }

  private smartGenerate(prompt: string): UIPlan {
    const lower = prompt.toLowerCase();
    const title = prompt.length > 40 ? prompt.slice(0, 37) + "..." : prompt;
    const blocks: Block[] = [];
    let blockIdx = 0;
    const id = () => `auto-${blockIdx++}`;

    // Detect intent from keywords
    const hasDashboard = /대시보드|dashboard|분석|analytics|모니터링|monitor/i.test(lower);
    const hasSales = /매출|revenue|sales|수익|profit|주문|order/i.test(lower);
    const hasMarketing = /마케팅|marketing|캠페인|campaign|sns|소셜|광고/i.test(lower);
    const hasTask = /할일|task|todo|작업|계획|plan|일정|schedule/i.test(lower);
    const hasProfile = /프로필|profile|소개|about|정보|info/i.test(lower);
    const hasChart = /차트|chart|그래프|graph|추이|trend/i.test(lower);
    const hasTable = /테이블|table|리스트|list|목록|데이터/i.test(lower);
    const hasMap = /지도|map|위치|location|근처|nearby|장소/i.test(lower);
    const hasWeather = /날씨|weather|기온|온도/i.test(lower);

    // Always add a KPI header
    const kpiItems = [];
    if (hasSales) {
      kpiItems.push({ label: "Total Revenue", value: "$1.2M", change: "+12.3%" });
      kpiItems.push({ label: "Orders", value: "8,420", change: "+340" });
      kpiItems.push({ label: "Avg Order", value: "$142", change: "+$8" });
      kpiItems.push({ label: "Conversion", value: "3.8%", change: "+0.4%" });
    } else if (hasMarketing) {
      kpiItems.push({ label: "Impressions", value: "2.4M", change: "+18%" });
      kpiItems.push({ label: "Clicks", value: "89K", change: "+12%" });
      kpiItems.push({ label: "CTR", value: "3.7%", change: "+0.3%" });
      kpiItems.push({ label: "Cost", value: "$4.2K", change: "-$200" });
    } else {
      kpiItems.push({ label: "Active Users", value: "12,847", change: "+14%" });
      kpiItems.push({ label: "Sessions", value: "34K", change: "+8%" });
      kpiItems.push({ label: "Uptime", value: "99.97%", change: "+0.02%" });
    }

    blocks.push({ id: id(), type: "KPIGrid", region: "main", props: { items: kpiItems } });

    // Add chart if requested or if dashboard
    if (hasChart || hasDashboard || hasSales) {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const data = hasSales
        ? [180, 210, 195, 260, 240, 120, 90]
        : [1200, 1800, 1600, 2100, 1900, 900, 700];
      blocks.push({ id: id(), type: "ChartBlock", region: "main", props: {
        chartType: "bar", labels, series: [{ name: hasSales ? "Revenue" : "Requests", data }]
      } });
    }

    // Add table if requested
    if (hasTable || hasDashboard) {
      blocks.push({ id: id(), type: "DataTable", region: "main", props: {
        columns: ["Name", "Status", "Value", "Change"],
        rows: [
          { Name: "Product A", Status: "Active", Value: "$42K", Change: "+12%" },
          { Name: "Product B", Status: "Active", Value: "$28K", Change: "+8%" },
          { Name: "Product C", Status: "Paused", Value: "$15K", Change: "-3%" },
          { Name: "Product D", Status: "Active", Value: "$9K", Change: "+22%" }
        ]
      } });
    }

    // Add tasks
    if (hasTask) {
      blocks.push({ id: id(), type: "TaskList", region: "right", props: {
        items: [
          { title: "Q2 전략 보고서 작성", done: false },
          { title: "팀 미팅 자료 준비", done: true },
          { title: "클라이언트 피드백 반영", done: false },
          { title: "디자인 리뷰 일정 잡기", done: false },
          { title: "데이터 마이그레이션 테스트", done: true }
        ]
      } });
    }

    // Add map
    if (hasMap) {
      blocks.push({ id: id(), type: "MapView", region: "main", props: {
        center: { lat: 37.5665, lng: 126.978 }, markers: [{ name: "Seoul" }]
      } });
    }

    // Add weather
    if (hasWeather) {
      blocks.push({ id: id(), type: "WeatherCustom", region: "main", props: {
        children: [
          { element: "card", children: [
            { element: "flex", align: "center", gap: 16, children: [
              { element: "text", value: "☀️", style: { fontSize: 48 } },
              { element: "stack", gap: 2, children: [
                { element: "text", value: "24°C", style: { fontSize: 36, fontWeight: 700 } },
                { element: "text", value: "Seoul · Sunny", style: { color: "var(--genui-muted)" } }
              ] }
            ] }
          ] }
        ]
      } });
    }

    // Add marketing components
    if (hasMarketing) {
      blocks.push({ id: id(), type: "SocialPostPreview", region: "right", props: {
        author: "@brand", text: "새로운 캠페인이 시작되었습니다! 지금 확인하세요 🚀", likes: "2.4K", shares: "891", comments: "342", time: "2h ago"
      } });
    }

    // Add profile
    if (hasProfile) {
      blocks.push({ id: id(), type: "ProfileCard", region: "left", props: {
        children: [
          { element: "card", children: [
            { element: "flex", align: "center", gap: 12, children: [
              { element: "image", src: "https://api.dicebear.com/7.x/avataaars/svg?seed=jarvis", alt: "avatar", style: { width: 56, height: 56, borderRadius: "50%" } },
              { element: "stack", gap: 2, children: [
                { element: "heading", value: "User Profile", level: 3 },
                { element: "text", value: "Product Owner", style: { color: "var(--genui-muted)", fontSize: 13 } }
              ] }
            ] }
          ] }
        ]
      } });
    }

    // Add status indicators for dashboards
    if (hasDashboard) {
      blocks.push({ id: id(), type: "StatusIndicator", region: "left", props: { label: "API Gateway", status: "ok" } });
      blocks.push({ id: id(), type: "StatusIndicator", region: "left", props: { label: "Database", status: "ok" } });
      blocks.push({ id: id(), type: "StatusIndicator", region: "left", props: { label: "CDN", status: "warning" } });
    }

    // If nothing matched at all, generate a smart summary
    if (blocks.length <= 1) {
      blocks.push({ id: id(), type: "SmartSummary", region: "main", props: {
        children: [
          { element: "card", children: [
            { element: "heading", value: title, level: 2 },
            { element: "divider" },
            { element: "grid", columns: 2, children: [
              { element: "card", children: [
                { element: "heading", value: "Overview", level: 3 },
                { element: "text", value: `"${prompt}"에 대한 워크스페이스입니다. 이 화면은 프롬프트 키워드를 분석해서 자동 생성되었습니다.`, style: { color: "var(--genui-muted)", lineHeight: 1.6 } },
                { element: "progress", percent: 65, height: 6 },
                { element: "text", value: "65% complete", style: { fontSize: 12, color: "var(--genui-muted)" } }
              ] },
              { element: "card", children: [
                { element: "heading", value: "Quick Actions", level: 3 },
                { element: "stack", gap: 8, children: [
                  { element: "button", value: "Explore Data" },
                  { element: "button", value: "Generate Report", color: "var(--genui-muted)" },
                  { element: "button", value: "Share", color: "#22c55e" }
                ] }
              ] }
            ] },
            { element: "alert", variant: "info", value: "💡 API 키를 넣으면 GPT가 이 요청에 완벽히 맞는 UI를 실시간으로 설계합니다." }
          ] }
        ]
      } });
    }

    // Determine theme based on intent
    const theme = hasMarketing
      ? { mood: "vivid" as const, density: "comfortable" as const, accent: "rose" }
      : hasSales
        ? { mood: "serious" as const, density: "compact" as const, accent: "indigo" }
        : hasTask
          ? { mood: "minimal" as const, density: "spacious" as const, accent: "emerald" }
          : { mood: "serious" as const, density: "comfortable" as const, accent: "indigo" };

    return {
      ...basePlan(title, hasSales ? "analysis" : hasMarketing ? "marketing" : "custom", blocks),
      theme
    };
  }

  getPromptCount(): number {
    return this.templates.size;
  }
}
