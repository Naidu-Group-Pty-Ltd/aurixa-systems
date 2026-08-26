/**
 * The public half of the documentation.
 *
 * Slug, title, one-line summary, group and tier badge for every section. This
 * IS bundled into the site, deliberately: it is the marketing surface and the
 * SEO surface, and it reveals nothing a visitor could not read on the pricing
 * page.
 *
 * The bodies are not here. They live in supabase/functions/_shared/docsCorpus*,
 * are filtered server-side by entitlement, and are fetched at runtime. If the
 * bodies were in this file the gate would be decorative — anyone could read a
 * paid module's documentation out of the JavaScript bundle.
 *
 * `src/lib/docs/publicIndex.test.ts` asserts this file and the corpus describe
 * the same set of sections, so the index cannot drift into advertising a
 * section the server will not serve, or omit one it will.
 */

export type PublicDocsEntry = {
  slug: string;
  title: string;
  summary: string;
  group: string;
  /** Pricing-catalogue module slug, or null when the section is universal. */
  moduleSlug: string | null;
  readMinutes: number;
};

export const PUBLIC_DOCS_INDEX: PublicDocsEntry[] = [
  // Getting Started
  { slug: "getting-started", title: "Getting Started", summary: "Signing in, the shape of the workspace, and the concepts everything else assumes.", group: "Getting Started", moduleSlug: null, readMinutes: 8 },
  { slug: "navigation-and-search", title: "Navigation, Search and Keyboard Shortcuts", summary: "Moving quickly: global search, command palette, and the shortcuts worth learning.", group: "Getting Started", moduleSlug: null, readMinutes: 5 },
  { slug: "notifications", title: "Notifications", summary: "What the platform tells you about, where it appears, and how to tune the noise.", group: "Getting Started", moduleSlug: null, readMinutes: 5 },

  // Main Dashboard
  { slug: "overview", title: "Overview", summary: "The landing dashboard: pipeline health, activity and what needs attention today.", group: "Main Dashboard", moduleSlug: null, readMinutes: 6 },
  { slug: "calendar", title: "Calendar", summary: "Appointments, availability and the two-way sync with your connected calendar.", group: "Main Dashboard", moduleSlug: null, readMinutes: 7 },
  { slug: "client-tracker", title: "Client Tracker", summary: "A live board of where every client sits, independent of formal deal stages.", group: "Main Dashboard", moduleSlug: null, readMinutes: 4 },
  { slug: "market-updates", title: "Market Updates", summary: "Curated market intelligence, suburb movements and the data behind your advice.", group: "Main Dashboard", moduleSlug: "market-updates", readMinutes: 9 },
  { slug: "commercial-industrial", title: "Commercial & Industrial", summary: "Commercial and industrial modelling: leases, capex, DCF and financing.", group: "Main Dashboard", moduleSlug: "commercial-industrial", readMinutes: 12 },
  { slug: "opportunity-marketplace", title: "Property Marketplace", summary: "Sourced opportunities, listing intelligence and matching stock to client mandates.", group: "Main Dashboard", moduleSlug: "opportunity-marketplace", readMinutes: 7 },

  // Reports & Analysis
  { slug: "reports-analytics", title: "Reports & Analytics", summary: "The reporting engine: what it produces, how generation works, and where output lands.", group: "Reports & Analysis", moduleSlug: null, readMinutes: 10 },
  { slug: "generated-reports", title: "Generated Reports", summary: "The investment report library, its lifecycle, and bulk generation.", group: "Reports & Analysis", moduleSlug: null, readMinutes: 6 },
  { slug: "report-comparisons", title: "Report Comparisons", summary: "Putting properties or scenarios side by side in a single client-ready document.", group: "Reports & Analysis", moduleSlug: "report-comparisons", readMinutes: 6 },
  { slug: "cash-flow-analysis", title: "Cash Flow Analysis", summary: "Ten-year cash flow modelling, holding costs and the year-by-year position.", group: "Reports & Analysis", moduleSlug: null, readMinutes: 9 },
  { slug: "cashflow-comparisons", title: "Cash Flow Comparisons", summary: "Comparing the holding position across properties or structures side by side.", group: "Reports & Analysis", moduleSlug: "cashflow-comparisons", readMinutes: 5 },
  { slug: "quantitative-reports", title: "Quantitative Reports", summary: "Data-led analysis across the portfolio and market, beyond single-property reporting.", group: "Reports & Analysis", moduleSlug: "commercial-industrial", readMinutes: 6 },
  { slug: "report-requests", title: "Report Requests", summary: "Requests coming in from clients and staff, and how they are triaged.", group: "Reports & Analysis", moduleSlug: null, readMinutes: 4 },
  { slug: "depreciation", title: "Depreciation", summary: "Depreciation estimation, comparable data and how schedules feed the cash flow model.", group: "Reports & Analysis", moduleSlug: null, readMinutes: 6 },
  { slug: "charts", title: "Charts & Visualisation", summary: "The chart library behind reports, and building saved visualisations.", group: "Reports & Analysis", moduleSlug: null, readMinutes: 4 },

  // Client & CRM
  { slug: "client-management", title: "Client Management", summary: "The client record: every tab, what belongs in it, and how the parts connect.", group: "Client & CRM", moduleSlug: null, readMinutes: 14 },
  { slug: "client-forms", title: "Client Forms", summary: "Structured data collection sent to clients, and how responses land on the record.", group: "Client & CRM", moduleSlug: "client-forms", readMinutes: 6 },
  { slug: "borrowing-capacity", title: "Borrowing Capacity", summary: "Modelling what a client can borrow, across lenders and scenarios.", group: "Client & CRM", moduleSlug: "borrowing-capacity", readMinutes: 10 },
  { slug: "portfolio-analysis", title: "Portfolio Analysis", summary: "Analysing a client's whole holding: concentration, performance and equity position.", group: "Client & CRM", moduleSlug: "portfolio-analysis", readMinutes: 8 },
  { slug: "send-portfolio", title: "Send Portfolio To Client", summary: "Packaging portfolio analysis into a client-ready deliverable and sending it.", group: "Client & CRM", moduleSlug: "send-portfolio", readMinutes: 4 },
  { slug: "client-ai", title: "Client AI", summary: "AI assistance scoped to a single client's record and history.", group: "Client & CRM", moduleSlug: "client-ai", readMinutes: 5 },
  { slug: "lender-intelligence", title: "Lender Intelligence", summary: "Lender policies, rate cards and comparing capacity across lenders.", group: "Client & CRM", moduleSlug: "lenders", readMinutes: 7 },
  { slug: "email-copilot", title: "Email Copilot", summary: "Client email in the workspace: threading, drafting and linking to records.", group: "Client & CRM", moduleSlug: "email-copilot", readMinutes: 7 },
  { slug: "conversations", title: "Conversations", summary: "Unified messaging across channels, threaded against the client.", group: "Client & CRM", moduleSlug: null, readMinutes: 5 },
  { slug: "call-logs", title: "Call Logs", summary: "Call recording, transcription, analytics and alerting.", group: "Client & CRM", moduleSlug: "call-logs", readMinutes: 8 },

  // Operations
  { slug: "deal-pipeline", title: "Deal Pipeline", summary: "Tracking deals through stages, with dates, risk and commission.", group: "Operations", moduleSlug: "deal-pipeline", readMinutes: 11 },
  { slug: "reminders", title: "Reminders", summary: "Follow-ups against clients and deals, assignment and escalation.", group: "Operations", moduleSlug: null, readMinutes: 5 },
  { slug: "checklists", title: "Checklists", summary: "Repeatable process templates instantiated against clients and deals.", group: "Operations", moduleSlug: null, readMinutes: 6 },
  { slug: "game-plan", title: "Game Plan", summary: "Long-horizon client strategy: phases, milestones, KPIs and actions.", group: "Operations", moduleSlug: null, readMinutes: 8 },
  { slug: "agreements", title: "Agreements", summary: "Generating, sending and tracking agreements through to signature.", group: "Operations", moduleSlug: "agreements", readMinutes: 8 },
  { slug: "agreement-centre", title: "Agreement Centre", summary: "Partner agreements end to end: internal review, portal issuance, execution and the executed vault.", group: "Operations", moduleSlug: "agreements", readMinutes: 9 },
  { slug: "marketing-analytics", title: "Marketing & Attribution", summary: "Lead sources, campaign performance and what actually produces clients.", group: "Operations", moduleSlug: "marketing", readMinutes: 7 },
  { slug: "automation", title: "Automation", summary: "Scheduled and triggered work that runs without anyone remembering to run it.", group: "Operations", moduleSlug: null, readMinutes: 6 },
  { slug: "commission-ledger", title: "Commission Ledger", summary: "Commission forecast, actuals, payouts and clawback tracking.", group: "Operations", moduleSlug: null, readMinutes: 5 },

  // Intelligence & AI
  { slug: "ai-agent", title: "Aurixa Agent", summary: "The conversational assistant that can read the workspace and act inside it.", group: "Intelligence & AI", moduleSlug: "aurixa-agent", readMinutes: 12 },
  { slug: "report-qa", title: "Report Q&A and Intelligence Hub", summary: "Asking questions of your documents and reports in natural language.", group: "Intelligence & AI", moduleSlug: "intelligence-hub", readMinutes: 7 },
  { slug: "pdf-import", title: "PDF Import & Document Extraction", summary: "Turning uploaded documents into structured data on the client record.", group: "Intelligence & AI", moduleSlug: "intelligence-hub", readMinutes: 7 },
  { slug: "model-hub", title: "Model Hub", summary: "Which AI model powers each feature, and controlling that per capability.", group: "Intelligence & AI", moduleSlug: "model-hub", readMinutes: 6 },

  // Portals
  { slug: "client-portal", title: "Client Portal", summary: "The client-facing login: what they see, what they can do, and how to control it.", group: "Portals", moduleSlug: null, readMinutes: 8 },
  { slug: "finance-portal", title: "Finance Portal", summary: "The broker-facing surface for finance referrals, documents and messaging.", group: "Portals", moduleSlug: "finance-portal", readMinutes: 9 },
  { slug: "solicitor-portal", title: "Solicitor Portal", summary: "The legal-partner surface for conveyancing and matter management.", group: "Portals", moduleSlug: "finance-portal", readMinutes: 7 },
  { slug: "builder-portal", title: "Builder Portal", summary: "The builder-facing surface for construction progress and invoicing.", group: "Portals", moduleSlug: "finance-portal", readMinutes: 6 },
  { slug: "partner-network", title: "Partner Network", summary: "Managing the referral partners around your business and the agreements with them.", group: "Portals", moduleSlug: "finance-portal", readMinutes: 5 },

  // Administration
  { slug: "settings", title: "Settings", summary: "Workspace configuration: the settings that shape everything else.", group: "Administration", moduleSlug: null, readMinutes: 7 },
  { slug: "user-management", title: "User Management & Permissions", summary: "Users, roles and the per-module permission model that governs everything.", group: "Administration", moduleSlug: null, readMinutes: 10 },
  { slug: "white-label", title: "Branding & White Label", summary: "Making the platform and its output look like your business.", group: "Administration", moduleSlug: null, readMinutes: 5 },
  { slug: "templates", title: "Templates", summary: "Report and document templates, the builder, and the approval workflow.", group: "Administration", moduleSlug: null, readMinutes: 9 },
  { slug: "data-import", title: "Data Import", summary: "Bringing existing clients and records into the workspace.", group: "Administration", moduleSlug: null, readMinutes: 7 },
  { slug: "sources", title: "Data Sources", summary: "The external data feeding the platform, and its freshness.", group: "Administration", moduleSlug: null, readMinutes: 5 },
  { slug: "integrations", title: "Integrations", summary: "Connecting calendar, mail, CRM, messaging and e-signature services.", group: "Administration", moduleSlug: "integrations", readMinutes: 7 },
  { slug: "monitoring", title: "Monitoring & Error Logs", summary: "Platform health, integration status and diagnosing what went wrong.", group: "Administration", moduleSlug: null, readMinutes: 5 },
  { slug: "activity-logs", title: "Activity Logs", summary: "The audit trail: who did what, when, and to which record.", group: "Administration", moduleSlug: null, readMinutes: 5 },
  { slug: "api-usage", title: "API Usage", summary: "Programmatic access, keys and consumption against your allowance.", group: "Administration", moduleSlug: "api-usage", readMinutes: 5 },

  // Compliance
  { slug: "aml-ctf", title: "AML / CTF Compliance", summary: "Customer due diligence, risk assessment, monitoring and regulatory reporting.", group: "Compliance", moduleSlug: "aml-ctf", readMinutes: 14 },

  // Help & Usage
  { slug: "billing-usage", title: "Billing & Usage", summary: "Your plan, token consumption, invoices and payment methods.", group: "Help & Usage", moduleSlug: null, readMinutes: 6 },
  { slug: "user-guide", title: "In-App User Guide", summary: "The quick reference inside the dashboard, and how it relates to this documentation.", group: "Help & Usage", moduleSlug: null, readMinutes: 3 },
  { slug: "troubleshooting", title: "Troubleshooting", summary: "Common problems, what causes them, and what to try before raising a ticket.", group: "Help & Usage", moduleSlug: null, readMinutes: 7 },
];

export const PUBLIC_DOCS_GROUPS = [
  "Getting Started",
  "Main Dashboard",
  "Reports & Analysis",
  "Client & CRM",
  "Operations",
  "Intelligence & AI",
  "Portals",
  "Administration",
  "Compliance",
  "Help & Usage",
] as const;

/** Tier badge for the index. Mirrors MODULE_TIERS in the corpus. */
const MODULE_TIERS: Record<string, readonly string[]> = {
  "market-updates": ["growth", "scale"],
  "commercial-industrial": ["scale"],
  "opportunity-marketplace": ["scale"],
  "intelligence-hub": [],
  "report-comparisons": ["growth", "scale"],
  "cashflow-comparisons": ["growth", "scale"],
  "email-copilot": [],
  "call-logs": [],
  "portfolio-analysis": ["scale"],
  "send-portfolio": ["scale"],
  "client-forms": ["launch", "growth", "scale"],
  "borrowing-capacity": ["scale"],
  lenders: [],
  "client-ai": ["scale"],
  agreements: ["scale"],
  marketing: ["scale"],
  "deal-pipeline": ["growth", "scale"],
  "aml-ctf": ["launch", "growth", "scale"],
  "model-hub": ["scale"],
  "finance-portal": ["scale"],
  integrations: [],
  "api-usage": ["scale"],
  "aurixa-agent": [],
};

/** Human-readable availability, for the badge on each index entry. */
export function availabilityLabel(moduleSlug: string | null): string {
  if (!moduleSlug) return "All plans";
  const tiers = MODULE_TIERS[moduleSlug];
  if (!tiers) return "All plans";
  if (tiers.length === 0) return "Add-on";
  if (tiers.length === 3) return "All plans";
  if (tiers.includes("growth")) return "Growth and above";
  if (tiers.includes("scale")) return "Scale";
  return "All plans";
}
