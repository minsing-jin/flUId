import { z } from "zod";
import type { ComponentDefinition } from "./component-registry.js";

const emptyPropsSchema = z.object({}).strict();

function makeMeta(displayName: string, category: string, description: string): ComponentDefinition["meta"] {
  return {
    displayName,
    category,
    description,
    examples: [`${displayName} example`]
  };
}

export function createDefaultComponentCatalog(): ComponentDefinition[] {
  return [
    { type: "WorkbenchShell", schema: z.object({}).strict(), meta: makeMeta("Workbench Shell", "shell", "Layout with 4 regions") },
    {
      type: "PromptInput",
      schema: z.object({ placeholder: z.string().optional() }).strict(),
      meta: makeMeta("Prompt Input", "shell", "Text prompt input with quick prompts")
    },
    {
      type: "VoiceInput",
      schema: z.object({ language: z.string().optional() }).strict(),
      meta: makeMeta("Voice Input", "shell", "Voice transcript input")
    },
    {
      type: "ActivityLog",
      schema: z.object({ entries: z.array(z.string()).optional() }).strict(),
      meta: makeMeta("Activity Log", "shell", "Tool call status log")
    },
    { type: "NotificationToast", schema: emptyPropsSchema, meta: makeMeta("Notification Toast", "shell", "Transient alerts") },
    { type: "Tabs", schema: emptyPropsSchema, meta: makeMeta("Tabs", "shell", "Tabbed content switcher") },
    { type: "SplitPane", schema: emptyPropsSchema, meta: makeMeta("Split Pane", "shell", "Resizable split layout") },
    { type: "Accordion", schema: emptyPropsSchema, meta: makeMeta("Accordion", "shell", "Expandable sections") },
    { type: "Drawer", schema: emptyPropsSchema, meta: makeMeta("Drawer", "shell", "Side overlay panel") },
    { type: "Modal", schema: emptyPropsSchema, meta: makeMeta("Modal", "shell", "Dialog layer") },
    {
      type: "PermissionGate",
      schema: z.object({ requested: z.array(z.string()).optional(), granted: z.array(z.string()).optional() }).strict(),
      meta: makeMeta("Permission Gate", "shell", "Permission approval state")
    },
    { type: "ErrorCard", schema: emptyPropsSchema, meta: makeMeta("Error Card", "shell", "Error state UI") },
    { type: "EmptyState", schema: emptyPropsSchema, meta: makeMeta("Empty State", "shell", "No data state") },
    { type: "InspectorPanel", schema: emptyPropsSchema, meta: makeMeta("Inspector Panel", "shell", "Inspect selected block") },
    {
      type: "DebugJSON",
      schema: z.object({ value: z.unknown().optional() }).strict(),
      meta: makeMeta("Debug JSON", "shell", "JSON plan/state viewer")
    },
    {
      type: "MeasuredText",
      schema: z
        .object({
          text: z.string().min(1),
          variant: z.enum(["title", "body", "caption", "code"]).optional(),
          measureWidth: z.number().positive().optional(),
          maxLines: z.number().int().positive().optional(),
          whiteSpace: z.enum(["normal", "pre-wrap"]).optional(),
          showMetrics: z.boolean().optional()
        })
        .strict(),
      meta: makeMeta("Measured Text", "shell", "Deterministic text preview with optional line metrics")
    },
    { type: "SearchBox", schema: emptyPropsSchema, meta: makeMeta("Search Box", "shell", "Generic text search") },
    { type: "FilterChips", schema: emptyPropsSchema, meta: makeMeta("Filter Chips", "shell", "Applied filters display") },

    { type: "WebResultsList", schema: z.object({ items: z.array(z.record(z.unknown())).optional() }).strict(), meta: makeMeta("Web Results List", "research", "Search results list") },
    { type: "SourceCard", schema: emptyPropsSchema, meta: makeMeta("Source Card", "research", "Single source preview") },
    { type: "SummaryBlock", schema: z.object({ bullets: z.array(z.string()).optional() }).strict(), meta: makeMeta("Summary Block", "research", "Bullet summary") },
    { type: "ComparisonMatrix", schema: z.object({ columns: z.array(z.string()).optional(), rows: z.array(z.record(z.unknown())).optional() }).strict(), meta: makeMeta("Comparison Matrix", "research", "Rows/cols comparison") },
    { type: "ReadingList", schema: emptyPropsSchema, meta: makeMeta("Reading List", "research", "Saved references") },
    { type: "CitationList", schema: emptyPropsSchema, meta: makeMeta("Citation List", "research", "Citations and links") },
    { type: "DocumentViewer", schema: emptyPropsSchema, meta: makeMeta("Document Viewer", "research", "Sanitized markdown/html document") },
    { type: "HighlightAnnotator", schema: emptyPropsSchema, meta: makeMeta("Highlight Annotator", "research", "Highlight and notes") },
    { type: "TimelineSummary", schema: emptyPropsSchema, meta: makeMeta("Timeline Summary", "research", "Chronological events") },

    { type: "DataTable", schema: z.object({ columns: z.array(z.string()).optional(), rows: z.array(z.record(z.unknown())).optional() }).strict(), meta: makeMeta("Data Table", "data", "Tabular data view") },
    { type: "PivotTableLite", schema: emptyPropsSchema, meta: makeMeta("PivotTable Lite", "data", "Group-by aggregation") },
    { type: "KPIGrid", schema: z.object({ items: z.array(z.record(z.unknown())).optional() }).strict(), meta: makeMeta("KPI Grid", "data", "KPI cards") },
    { type: "ChartBlock", schema: z.object({ chartType: z.string().optional(), series: z.array(z.unknown()).optional() }).strict(), meta: makeMeta("Chart Block", "data", "Chart rendering block") },
    { type: "TimeSeriesExplorer", schema: emptyPropsSchema, meta: makeMeta("Time Series Explorer", "data", "Range + trend charts") },
    { type: "SQLQueryEditor", schema: emptyPropsSchema, meta: makeMeta("SQL Query Editor", "data", "SQL input for tools") },
    { type: "FileUpload", schema: emptyPropsSchema, meta: makeMeta("File Upload", "data", "CSV/XLSX upload") },
    { type: "DataTransformWizard", schema: emptyPropsSchema, meta: makeMeta("Data Transform Wizard", "data", "Filter/select/group wizard") },
    { type: "DataQualityReport", schema: emptyPropsSchema, meta: makeMeta("Data Quality Report", "data", "Missing/outliers/duplicates") },
    { type: "CorrelationHeatmap", schema: emptyPropsSchema, meta: makeMeta("Correlation Heatmap", "data", "Variable correlation map") },
    { type: "CohortTableLite", schema: emptyPropsSchema, meta: makeMeta("Cohort Table Lite", "data", "Cohort retention table") },

    { type: "CampaignBrief", schema: emptyPropsSchema, meta: makeMeta("Campaign Brief", "marketing", "Campaign summary") },
    { type: "CopyVariants", schema: emptyPropsSchema, meta: makeMeta("Copy Variants", "marketing", "Content variants") },
    { type: "SocialPostPreview", schema: emptyPropsSchema, meta: makeMeta("Social Post Preview", "marketing", "Platform post preview") },
    { type: "ContentCalendar", schema: emptyPropsSchema, meta: makeMeta("Content Calendar", "marketing", "Scheduled content") },
    { type: "UTMBuilder", schema: emptyPropsSchema, meta: makeMeta("UTM Builder", "marketing", "UTM generation") },
    { type: "KeywordIdeas", schema: emptyPropsSchema, meta: makeMeta("Keyword Ideas", "marketing", "Keyword suggestions") },
    { type: "LandingPageOutline", schema: emptyPropsSchema, meta: makeMeta("Landing Page Outline", "marketing", "Page structure draft") },
    { type: "PerformanceDashboard", schema: emptyPropsSchema, meta: makeMeta("Performance Dashboard", "marketing", "CTR/CVR/CPA view") },
    { type: "BudgetAllocator", schema: emptyPropsSchema, meta: makeMeta("Budget Allocator", "marketing", "Budget slider table") },
    { type: "A/B Test Planner", schema: emptyPropsSchema, meta: makeMeta("A/B Test Planner", "marketing", "Test design") },

    { type: "LeadList", schema: emptyPropsSchema, meta: makeMeta("Lead List", "sales", "Leads + score + next step") },
    { type: "PipelineKanban", schema: z.object({ stages: z.array(z.record(z.unknown())).optional() }).strict(), meta: makeMeta("Pipeline Kanban", "sales", "Deal stages board") },
    { type: "DealDetailCard", schema: emptyPropsSchema, meta: makeMeta("Deal Detail Card", "sales", "Deal detail view") },
    { type: "OutreachSequenceBuilder", schema: emptyPropsSchema, meta: makeMeta("Outreach Sequence Builder", "sales", "Outreach flow") },
    { type: "CallNotes", schema: emptyPropsSchema, meta: makeMeta("Call Notes", "sales", "Transcript + action items") },
    { type: "FollowUpPlanner", schema: emptyPropsSchema, meta: makeMeta("Follow Up Planner", "sales", "Follow-up schedule") },
    { type: "ProposalBuilder", schema: emptyPropsSchema, meta: makeMeta("Proposal Builder", "sales", "Proposal and pricing") },
    { type: "ObjectionHandlingCards", schema: emptyPropsSchema, meta: makeMeta("Objection Handling Cards", "sales", "Response cards") },

    { type: "CodeEditor", schema: z.object({ value: z.string().optional() }).strict(), meta: makeMeta("Code Editor", "dev", "Code editing area") },
    { type: "CodeRunnerJS", schema: z.object({ code: z.string().optional(), output: z.string().optional() }).strict(), meta: makeMeta("Code Runner JS", "dev", "Client-side JS runner") },
    { type: "NotebookCells", schema: emptyPropsSchema, meta: makeMeta("Notebook Cells", "dev", "Markdown/code cells") },
    { type: "APITestConsole", schema: emptyPropsSchema, meta: makeMeta("API Test Console", "dev", "HTTP request builder") },
    { type: "WorkflowBuilderLite", schema: emptyPropsSchema, meta: makeMeta("Workflow Builder Lite", "dev", "Step workflow") },
    { type: "ToolBuilderWizard", schema: emptyPropsSchema, meta: makeMeta("Tool Builder Wizard", "dev", "Tool schema stub generator") },
    { type: "DiffViewer", schema: emptyPropsSchema, meta: makeMeta("Diff Viewer", "dev", "String diff visualization") },
    { type: "TerminalOutput", schema: emptyPropsSchema, meta: makeMeta("Terminal Output", "dev", "Log stream viewer") },
    { type: "JSONSchemaViewer", schema: emptyPropsSchema, meta: makeMeta("JSON Schema Viewer", "dev", "Schema inspection") },

    { type: "MapView", schema: z.object({ center: z.record(z.number()).optional(), markers: z.array(z.record(z.unknown())).optional() }).strict(), meta: makeMeta("Map View", "geo", "Map visualization block") },
    { type: "GeoSearchBox", schema: emptyPropsSchema, meta: makeMeta("Geo Search Box", "geo", "Place search") },
    { type: "MarkerList", schema: emptyPropsSchema, meta: makeMeta("Marker List", "geo", "Map marker list") },
    { type: "RoutePlanner", schema: emptyPropsSchema, meta: makeMeta("Route Planner", "geo", "Route plan UI") },
    { type: "RadiusFilter", schema: emptyPropsSchema, meta: makeMeta("Radius Filter", "geo", "Distance-based filter") },
    { type: "HeatmapLayer", schema: emptyPropsSchema, meta: makeMeta("Heatmap Layer", "geo", "Map heatmap overlay") },

    { type: "TaskList", schema: emptyPropsSchema, meta: makeMeta("Task List", "ops", "Task backlog") },
    { type: "KanbanBoard", schema: emptyPropsSchema, meta: makeMeta("Kanban Board", "ops", "Generic kanban") },
    { type: "GanttLite", schema: emptyPropsSchema, meta: makeMeta("Gantt Lite", "ops", "Timeline schedule") },
    { type: "CalendarLite", schema: emptyPropsSchema, meta: makeMeta("Calendar Lite", "ops", "Calendar schedule") },
    { type: "ChecklistStepper", schema: emptyPropsSchema, meta: makeMeta("Checklist Stepper", "ops", "Step checklist") },
    { type: "ApprovalCard", schema: emptyPropsSchema, meta: makeMeta("Approval Card", "ops", "Approve/deny control") },
    { type: "StatusIndicator", schema: emptyPropsSchema, meta: makeMeta("Status Indicator", "ops", "Status badge") },
    { type: "SLAWidget", schema: emptyPropsSchema, meta: makeMeta("SLA Widget", "ops", "SLA monitor") }
  ];
}
