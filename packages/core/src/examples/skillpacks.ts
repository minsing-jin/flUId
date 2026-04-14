import type { SkillManifest } from "../skills/types.js";

export const seedSkillpacks: SkillManifest[] = [
  {
    id: "data-research",
    name: "Data Research",
    version: "0.1.0",
    description: "Research + analytics workflows",
    author: "genui",
    categories: ["research", "analysis"],
    permissionsRequested: ["network", "files"],
    components: ["WebResultsList", "SummaryBlock", "DataTable", "ChartBlock", "KPIGrid"],
    tools: ["search.web", "fetch.url", "data.load_csv", "data.profile", "viz.prepare_chart_data"],
    suggestedPrompts: ["리서치해서 A vs B 비교표 만들어줘", "CSV 업로드해서 KPI랑 차트 보여줘"],
    allowedDomains: ["api.duckduckgo.com", "en.wikipedia.org", "arxiv.org"]
  },
  {
    id: "marketing-ops",
    name: "Marketing Ops",
    version: "0.1.0",
    description: "Campaign and content operations",
    author: "genui",
    categories: ["marketing"],
    permissionsRequested: ["ads", "network"],
    components: ["CampaignBrief", "SocialPostPreview", "ContentCalendar", "UTMBuilder"],
    tools: ["marketing.build_utm", "marketing.generate_copy"],
    suggestedPrompts: ["캠페인 브리프 만들고 SNS 프리뷰"],
    allowedDomains: ["graph.facebook.com", "api.twitter.com", "api.hubapi.com"]
  },
  {
    id: "sales-ops",
    name: "Sales Ops",
    version: "0.1.0",
    description: "Lead and pipeline operations",
    author: "genui",
    categories: ["sales"],
    permissionsRequested: ["crm"],
    components: ["LeadList", "PipelineKanban", "ProposalBuilder"],
    tools: ["sales.score_leads", "sales.draft_outreach"],
    suggestedPrompts: ["리드 리스트 보여주고 점수화"],
    allowedDomains: ["api.hubapi.com", "api.pipedrive.com"]
  },
  {
    id: "geo-maps",
    name: "Geo Maps",
    version: "0.1.0",
    description: "Map-centric workflows",
    author: "genui",
    categories: ["geo"],
    permissionsRequested: ["geo", "network"],
    components: ["MapView", "GeoSearchBox", "RoutePlanner"],
    tools: ["geo.geocode", "geo.route"],
    suggestedPrompts: ["지도에서 근처 카페 찾아"],
    allowedDomains: ["api.mapbox.com", "nominatim.openstreetmap.org"]
  },
  {
    id: "dev-tools",
    name: "Dev Tools",
    version: "0.1.0",
    description: "In-place coding and tool building",
    author: "genui",
    categories: ["dev"],
    permissionsRequested: ["code_exec", "files"],
    components: ["CodeEditor", "CodeRunnerJS", "ToolBuilderWizard", "DiffViewer"],
    tools: ["code.run_js", "tool.generate_stub"],
    suggestedPrompts: ["이 자리에서 차트 코드로 만들어", "새 툴 스텁 만들어줘"],
    allowedDomains: ["registry.npmjs.org", "esm.sh"]
  }
];
