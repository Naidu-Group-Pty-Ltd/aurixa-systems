// Getting Started, Main Dashboard, and Reports & Analysis.
import type { DocsSection } from "./docsTypes.ts";

export const FOUNDATION_SECTIONS: DocsSection[] = [
  // ───────────────────────────── Getting Started ─────────────────────────────
  {
    slug: "getting-started",
    title: "Getting Started",
    summary: "Signing in, the shape of the workspace, and the concepts everything else assumes.",
    group: "Getting Started",
    moduleSlug: null,
    guideSectionId: "getting-started",
    readMinutes: 8,
    blocks: [
      {
        kind: "prose",
        text:
          "The Command Center is the control surface for a property advisory business. It holds your clients and their financial position, produces the investment analysis you send them, tracks the deals that result, and keeps the compliance record underneath all of it. Everything in this documentation describes one workspace — your own installation, with your branding, your users and your data.",
      },
      {
        kind: "prose",
        text:
          "Two ideas run through the whole product, and almost every question about 'why can't I see this?' resolves to one of them. The first is your PLAN: Launch, Growth or Scale, plus any add-on modules purchased separately. The plan decides which modules exist in your workspace at all. The second is your USER PERMISSIONS: within the modules your plan includes, each user is granted view, edit and delete rights per module. Both have to say yes. A feature you cannot see is either not in your plan or not in your permissions, and the difference matters because only one of them is fixed by an upgrade.",
      },
      {
        kind: "steps",
        title: "Signing in for the first time",
        items: [
          "Open your workspace URL. Your administrator will have sent this; it is unique to your business and is not a shared Aurixa login.",
          "Enter the username and password from your invitation. Passwords are set by you on first sign-in, not chosen by an administrator.",
          "If your workspace requires it, complete the second factor. Sessions are tab-scoped and expire; closing the tab ends the session rather than leaving it open on a shared machine.",
          "You land on the Overview. What appears there depends on your plan and your permissions — an administrator sees more tiles than a user scoped to one module.",
        ],
      },
      {
        kind: "fields",
        title: "The persistent furniture",
        rows: [
          {
            name: "Sidebar",
            detail:
              "Every module your plan includes and your permissions allow. Modules outside your plan are absent rather than greyed out — the sidebar is a truthful list of what exists for you.",
          },
          {
            name: "Global search",
            detail:
              "Searches clients, properties, reports and deals from anywhere. Keyboard shortcut is documented under Keyboard Shortcuts.",
          },
          {
            name: "Notification bell",
            detail:
              "Appointment reminders, report completions, deal date warnings, call alerts and portal messages. Covered in Notifications.",
          },
          {
            name: "User menu",
            detail:
              "Profile, theme, sign-out, and — for administrators — the route into Settings and User Management.",
          },
          {
            name: "Aurixa Agent launcher",
            detail:
              "Present when your plan includes the Agent. Opens the conversational assistant over whatever screen you are on.",
          },
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "If a colleague can see a screen you cannot, check permissions before assuming a fault. An administrator can compare both users under User Management → Permissions in a few seconds.",
      },
      {
        kind: "prose",
        text:
          "One more concept worth internalising early: almost nothing in the Command Center is deleted outright. Clients are archived, deals are closed, reports are versioned, and compliance records are immutable by design. When you are looking for something that has 'disappeared', the filter is usually the answer rather than the recycle bin.",
      },
    ],
  },
  {
    slug: "navigation-and-search",
    title: "Navigation, Search and Keyboard Shortcuts",
    summary: "Moving quickly — global search, command palette, and the shortcuts worth learning.",
    group: "Getting Started",
    moduleSlug: null,
    guideSectionId: "keyboard-shortcuts",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "The Command Center is a keyboard-first product for the people who live in it all day. If you are opening client records by clicking through three screens, there is a faster route.",
      },
      {
        kind: "fields",
        title: "Shortcuts",
        rows: [
          { name: "Global search", detail: "Focus the search field from anywhere without touching the mouse." },
          { name: "Escape", detail: "Close the topmost dialog, drawer or popover. Never submits." },
          { name: "Calendar navigation", detail: "Arrow keys move between days and weeks; the calendar accepts keyboard navigation throughout." },
          { name: "Save", detail: "Standard save shortcut works inside record editors and template builders." },
          { name: "Agent", detail: "Open the Aurixa Agent chat over the current screen where your plan includes it." },
        ],
      },
      {
        kind: "prose",
        text:
          "Global search is scoped by your permissions. It will not surface a client from a module you cannot view, which means search results are always safe to share on a screen — you cannot accidentally reveal a record the viewer is not entitled to.",
      },
      {
        kind: "list",
        title: "What search covers",
        items: [
          "Clients by name, email, phone and address",
          "Properties by address and suburb",
          "Reports by title, client and address",
          "Deals by client and stage",
          "Uploaded files by filename where indexing is enabled",
        ],
      },
    ],
  },
  {
    slug: "notifications",
    title: "Notifications",
    summary: "What the platform tells you about, where it appears, and how to tune the noise.",
    group: "Getting Started",
    moduleSlug: null,
    guideSectionId: "notifications",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Notifications are the platform's way of surfacing time-sensitive events without requiring you to poll every screen. They appear in the bell in the top bar, and depending on your settings can also reach you by email.",
      },
      {
        kind: "fields",
        title: "Notification sources",
        rows: [
          { name: "Appointments", detail: "Upcoming meetings from the connected calendar, with configurable lead time." },
          { name: "Deal dates", detail: "Finance clauses, cooling-off expiries, settlement dates and build milestones approaching or overdue." },
          { name: "Client reminders", detail: "Reminders you or a colleague set against a client record." },
          { name: "Report generation", detail: "Completion or failure of a long-running report or bulk generation job." },
          { name: "Calls", detail: "Missed calls, flagged calls and alert rules where Call Logs is enabled." },
          { name: "Portal messages", detail: "New messages from clients through the Client Portal." },
          { name: "Agreements", detail: "Signature progress and completion on documents sent for signing." },
        ],
      },
      {
        kind: "prose",
        text:
          "Notifications addressed to you personally are private; broadcast notifications (those with no specific recipient) are visible to everyone in the workspace and are used for workspace-wide events such as a completed bulk job. Every notification records who or what created it.",
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "If the bell is noisy, the fix is usually upstream: tighten the alert rules in Call Logs, or adjust the lead time on deal-date warnings, rather than ignoring the bell entirely.",
      },
    ],
  },

  // ───────────────────────────── Main Dashboard ──────────────────────────────
  {
    slug: "overview",
    title: "Overview",
    summary: "The landing dashboard — pipeline health, activity and what needs attention today.",
    group: "Main Dashboard",
    moduleSlug: null,
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Overview is the first screen after sign-in and is designed to answer one question: what needs me today. It aggregates across modules you have access to, so two users in the same workspace can legitimately see different Overviews.",
      },
      {
        kind: "list",
        title: "Typical tiles",
        items: [
          "Client counts and recent additions, with movement since last period",
          "Pipeline value and stage distribution where Deal Pipeline is included",
          "Reports generated recently and any still processing",
          "Overdue reminders and follow-ups assigned to you",
          "Upcoming appointments from the connected calendar",
          "Token balance and usage trend where relevant to your role",
          "Compliance attention items where AML/CTF is enabled",
        ],
      },
      {
        kind: "prose",
        text:
          "Tiles are not merely decorative counters — each is a link into the filtered view behind it. Clicking 'overdue reminders' takes you to the reminder list already filtered to overdue and assigned to you, which is faster than navigating and re-filtering.",
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Numbers on Overview respect the same permission scoping as the modules they summarise. A pipeline figure you can see is a pipeline figure you are entitled to see.",
      },
    ],
  },
  {
    slug: "calendar",
    title: "Calendar",
    summary: "Appointments, availability and the two-way sync with your connected calendar.",
    group: "Main Dashboard",
    moduleSlug: null,
    guideSectionId: "calendar",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "The Calendar module shows your appointments alongside the client context they belong to, which is the part a generic calendar cannot do. An appointment opened here shows the client record, their current deals and the last few interactions without leaving the screen.",
      },
      {
        kind: "subsection",
        title: "Connecting a calendar",
        blocks: [
          {
            kind: "steps",
            items: [
              "Open Settings → Integrations and choose your calendar provider.",
              "Authorise the connection. The platform requests the narrowest scope that supports two-way sync.",
              "Select which calendars to surface. Personal calendars can be connected for availability without exposing event detail.",
              "Confirm the sync direction. Two-way is the default; one-way import is available where your organisation prefers the platform not to write.",
            ],
          },
          {
            kind: "note",
            tone: "warning",
            text:
              "Disconnecting a calendar stops the sync but does not delete appointments already imported. Remove them explicitly if that is what you intend.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "Working in the calendar",
        blocks: [
          {
            kind: "list",
            items: [
              "Day, week and month views, with keyboard navigation throughout",
              "Creating an appointment against a client links it to their record automatically",
              "Free-slot lookup for proposing times without leaving the client conversation",
              "Preparation blocks — time reserved before a meeting, created automatically where configured",
              "Team availability, so you can find a slot that works for more than one advisor",
            ],
          },
        ],
      },
      {
        kind: "prose",
        text:
          "Appointments created from a client record, from the Aurixa Agent, or from the calendar itself all end up in the same place and sync outward identically. There is no separate 'platform-only' appointment type to keep track of.",
      },
    ],
  },
  {
    slug: "client-tracker",
    title: "Client Tracker",
    summary: "A live board of where every client sits, independent of formal deal stages.",
    group: "Main Dashboard",
    moduleSlug: null,
    readMinutes: 4,
    blocks: [
      {
        kind: "prose",
        text:
          "Client Tracker answers 'who is warming up and who has gone quiet'. It is deliberately lighter than the Deal Pipeline: not every client relationship is a deal, and forcing early-stage conversations into pipeline stages produces a misleading forecast.",
      },
      {
        kind: "list",
        title: "What it surfaces",
        items: [
          "Engagement recency — when you last had meaningful contact",
          "Outstanding actions against the client",
          "Report activity, including reports sent but not opened",
          "Portal activity where the client has portal access",
          "Follow-up dates that have passed without contact",
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Use Client Tracker for the weekly sweep and Deal Pipeline for the forecast. Trying to do both jobs in one board is how forecasts drift.",
      },
    ],
  },
  {
    slug: "market-updates",
    title: "Market Updates",
    summary: "Curated market intelligence, suburb movements and the data behind your advice.",
    group: "Main Dashboard",
    moduleSlug: "market-updates",
    guideSectionId: "market-updates",
    readMinutes: 9,
    blocks: [
      {
        kind: "prose",
        text:
          "Market Updates brings external market data into the workspace so the advice you give is anchored to current conditions rather than to whatever you last read. It combines official statistics, lending indicators and curated commentary into a single reviewed feed.",
      },
      {
        kind: "subsection",
        title: "What feeds it",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "Official statistics", detail: "Census and demographic data at suburb level, including population, income and household composition." },
              { name: "Median values and rents", detail: "Sale and rental medians by suburb and property type, with movement over time." },
              { name: "Lending indicators", detail: "Reserve Bank cash rate movements and bank lending rate changes, tracked as they are announced." },
              { name: "Economic series", detail: "The broader economic indicators that shape borrowing capacity and sentiment." },
              { name: "Local context", detail: "Schools, transport, crime statistics and climate risk where available for a suburb." },
              { name: "Curated commentary", detail: "Editorial layered on top of the raw series, reviewed before publication rather than generated and shipped unchecked." },
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Using it in client work",
        blocks: [
          {
            kind: "steps",
            items: [
              "Open Market Updates and filter to the suburbs or regions relevant to your client.",
              "Review the movement summary — what has changed since your last conversation, rather than the absolute figures you already know.",
              "Pull the relevant series into a report. Market data referenced in a generated report is captured at generation time, so the report remains accurate to the date it was produced.",
              "Where a claim matters, follow the source link. Every series records where it came from and when it was last refreshed.",
            ],
          },
          {
            kind: "note",
            tone: "compliance",
            text:
              "Market commentary is general information, not personal advice. Where your obligations require a disclaimer, set it once under Templates → Global Report Settings and it will appear on every generated document.",
          },
        ],
      },
      {
        kind: "prose",
        text:
          "Data freshness is visible rather than assumed: each series shows when it was last refreshed and flags when a source has not updated on schedule. A stale series is marked as stale rather than quietly shown as current, because advice given on data you believed was fresh is the failure mode worth engineering against.",
      },
    ],
  },
  {
    slug: "commercial-industrial",
    title: "Commercial & Industrial",
    summary: "Commercial and industrial modelling — leases, capex, DCF and financing.",
    group: "Main Dashboard",
    moduleSlug: "commercial-industrial",
    guideSectionId: "commercial-industrial",
    readMinutes: 12,
    blocks: [
      {
        kind: "prose",
        text:
          "Residential analysis assumptions do not survive contact with a commercial asset. Commercial & Industrial is a separate modelling surface built around the things that actually drive a commercial return: the lease, the outgoings, the capital expenditure profile and the debt structure.",
      },
      {
        kind: "subsection",
        title: "Property and lease records",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "Property record", detail: "Asset class, land and building area, zoning, tenancy configuration and acquisition detail." },
              { name: "Leases", detail: "One record per tenancy: term, commencement and expiry, review mechanism, incentives, outgoings recovery and options." },
              { name: "Rent reviews", detail: "Fixed, CPI or market review structures modelled through the term rather than assumed flat." },
              { name: "Outgoings", detail: "Recoverable and non-recoverable, so net income reflects what actually reaches the owner." },
              { name: "Vacancy and downtime", detail: "Expected letting-up periods and incentive costs on expiry, rather than an optimistic full-occupancy assumption." },
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Capital expenditure",
        blocks: [
          {
            kind: "prose",
            text:
              "Capex is modelled as scheduled items across the hold period — roof, plant, compliance upgrades, make-good — rather than as a single percentage allowance. This is what separates a credible commercial model from a residential one with bigger numbers.",
          },
          {
            kind: "list",
            items: [
              "Item-level capex with timing and amount",
              "Recoverable versus owner-borne treatment",
              "Impact carried through to net cash flow and the DCF",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Discounted cash flow",
        blocks: [
          {
            kind: "prose",
            text:
              "The DCF runs the modelled income, outgoings, capex and terminal value across the hold period at your chosen discount rate, producing net present value, internal rate of return and equity multiple. Every run is stored, so you can show a client how the numbers moved between two conversations.",
          },
          {
            kind: "fields",
            rows: [
              { name: "Discount rate", detail: "Set per run. Sensitivity across a range is available rather than a single point estimate." },
              { name: "Terminal value", detail: "Exit cap rate or explicit terminal assumption, stated rather than buried." },
              { name: "Hold period", detail: "Modelled in years, aligned to lease expiries where that is the realistic exit." },
              { name: "Outputs", detail: "NPV, IRR, equity multiple, peak equity requirement and year-by-year cash flow." },
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Financing and metrics",
        blocks: [
          {
            kind: "list",
            items: [
              "Debt sizing against both loan-to-value and interest-cover constraints",
              "Interest-only and principal-and-interest structures across the term",
              "Debt service cover ratio tracked per year, not just at acquisition",
              "Occupancy cost ratio and effective rent for tenant-side conversations",
              "GST treatment, including going-concern considerations",
            ],
          },
          {
            kind: "note",
            tone: "warning",
            text:
              "Debt sizing that satisfies LVR but fails interest cover is the common trap. The model reports both and sizes to the binding constraint rather than the flattering one.",
          },
        ],
      },
      {
        kind: "prose",
        text:
          "Industrial assets share the modelling engine but carry their own record type, reflecting the different drivers — clear height, hardstand, power supply and access are captured where they matter to value.",
      },
    ],
  },
  {
    slug: "opportunity-marketplace",
    title: "Property Marketplace",
    summary: "Sourced opportunities, listing intelligence and matching stock to client mandates.",
    group: "Main Dashboard",
    moduleSlug: "opportunity-marketplace",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "The marketplace is where sourced stock meets client mandates. Rather than keeping opportunities in a spreadsheet and matching them from memory, listings live in the workspace with their analysis attached and can be matched against the clients whose criteria they fit.",
      },
      {
        kind: "list",
        title: "What a listing carries",
        items: [
          "Address, price guide and agent or source",
          "Geocoded location, so proximity and suburb context resolve automatically",
          "Indicative yield, cash flow and depreciation position",
          "Supporting documents and imagery",
          "Status through the sourcing lifecycle, from identified to secured or passed",
        ],
      },
      {
        kind: "steps",
        title: "Matching stock to clients",
        items: [
          "Open the listing and review its computed position — yield, cash flow and entry cost.",
          "Run the match against active client mandates. Criteria include budget, borrowing capacity, location preference and strategy.",
          "Review the shortlist. Matches are ranked, and the reason for each match is shown rather than left implicit.",
          "Send the opportunity to the client directly, or generate a full report against it first.",
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Borrowing capacity is the constraint that most often eliminates a match. Keeping capacity current on client records makes the matching materially more useful.",
      },
    ],
  },

  // ─────────────────────────── Reports & Analysis ────────────────────────────
  {
    slug: "reports-analytics",
    title: "Reports & Analytics",
    summary: "The reporting engine — what it produces, how generation works, and where output lands.",
    group: "Reports & Analysis",
    moduleSlug: null,
    guideSectionId: "reports-analytics",
    readMinutes: 10,
    blocks: [
      {
        kind: "prose",
        text:
          "Reporting is the output the rest of the platform exists to feed. A report pulls the client's financial position, the property data, current market context and your branding into a document you can put in front of a client without editing it afterwards.",
      },
      {
        kind: "subsection",
        title: "Generating a report",
        blocks: [
          {
            kind: "steps",
            items: [
              "Open the client and choose the report type. The available types depend on your plan.",
              "Select the property or scenario the report is about.",
              "Review the inputs the engine has resolved — income, expenses, existing portfolio, borrowing position and the market data for the location.",
              "Adjust assumptions where the default does not fit this client. Changed assumptions are recorded on the report, not silently applied.",
              "Generate. Long reports process in the background; you are notified on completion and can keep working.",
              "Review the output, then send it through the portal, by email, or download it.",
            ],
          },
          {
            kind: "note",
            tone: "warning",
            text:
              "A report is a point-in-time artefact. Regenerating after the client's position changes produces a new version rather than mutating the one you already sent — which is what makes the audit trail trustworthy.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "Versions and history",
        blocks: [
          {
            kind: "prose",
            text:
              "Every generation is versioned. You can see what a client was sent in March even after their circumstances changed in June, compare two versions side by side, and show exactly which assumption moved a number.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "Distribution",
        blocks: [
          {
            kind: "list",
            items: [
              "Client Portal — the client sees it in their own login, and you can see whether they opened it",
              "Email — sent with your branding, tracked against the client record",
              "Download — PDF for attaching elsewhere, watermarked where configured",
              "Bulk generation — the same report across a set of clients or properties in one run",
            ],
          },
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Disclaimers, licence numbers and professional statements belong in Global Report Settings so they apply to every document automatically. A disclaimer added by hand to one report is a disclaimer missing from the next one.",
      },
    ],
  },
  {
    slug: "generated-reports",
    title: "Generated Reports",
    summary: "The investment report library, its lifecycle, and bulk generation.",
    group: "Reports & Analysis",
    moduleSlug: null,
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Generated Reports is the library of everything the engine has produced: what was made, for whom, by whom, when, and what happened to it afterwards. It is both a working list and the record you would rely on if a client questioned what they were told.",
      },
      {
        kind: "fields",
        title: "Report record",
        rows: [
          { name: "Type and title", detail: "The report class and the title the client sees." },
          { name: "Client and property", detail: "What the analysis is about, linked to the live records." },
          { name: "Status", detail: "Processing, complete, failed, or superseded by a newer version." },
          { name: "Generated by", detail: "The user or automation that produced it." },
          { name: "Distribution", detail: "Whether it was sent, through which channel, and whether it was opened." },
          { name: "Version", detail: "Which generation this is, and what changed from the previous one." },
        ],
      },
      {
        kind: "prose",
        text:
          "Investment reports are included on every plan. Report comparisons — putting two or more properties or scenarios against each other in a single document — are a Growth-tier capability and are documented separately.",
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Failed generations are kept rather than discarded, with the reason attached. A failure pattern across several clients usually points at a data gap rather than at the engine.",
      },
    ],
  },
  {
    slug: "report-comparisons",
    title: "Report Comparisons",
    summary: "Putting properties or scenarios side by side in a single client-ready document.",
    group: "Reports & Analysis",
    moduleSlug: "report-comparisons",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Clients rarely decide from a single report. Comparisons produce one document that puts two or more options against each other on identical assumptions, which is the only way a comparison is honest — different assumptions across options is how a preferred outcome gets manufactured.",
      },
      {
        kind: "steps",
        title: "Building a comparison",
        items: [
          "Select the properties or scenarios to compare. Two to four reads well; beyond that the document becomes a table nobody finishes.",
          "Confirm the shared assumption set. The engine holds these constant across every option by design.",
          "Choose which metrics lead — cash flow, yield, total return, or entry cost — depending on what this client actually optimises for.",
          "Generate. The output shows each option in parallel with the differences called out rather than left for the reader to spot.",
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "If you need different assumptions per option — different loan structures, say — say so explicitly in the document. A comparison that silently varies two things at once cannot support a conclusion.",
      },
    ],
  },
  {
    slug: "cash-flow-analysis",
    title: "Cash Flow Analysis",
    summary: "Ten-year cash flow modelling, holding costs and the year-by-year position.",
    group: "Reports & Analysis",
    moduleSlug: null,
    guideSectionId: "cash-flow-analysis",
    readMinutes: 9,
    blocks: [
      {
        kind: "prose",
        text:
          "Cash Flow Analysis answers the question clients actually ask: what will this cost me to hold, and when does it stop costing me. It models the position year by year across a ten-year horizon rather than quoting a single first-year figure that stops being true immediately.",
      },
      {
        kind: "fields",
        title: "What the model includes",
        rows: [
          { name: "Rental income", detail: "With vacancy allowance and rent growth assumptions stated rather than buried." },
          { name: "Loan repayments", detail: "Interest-only and principal-and-interest, including the transition when an interest-only period ends." },
          { name: "Holding costs", detail: "Rates, insurance, strata, management fees, maintenance and land tax." },
          { name: "Land tax", detail: "Calculated on the applicable state thresholds, including surcharges and quarterly instalment treatment where relevant." },
          { name: "Depreciation", detail: "Capital works and plant, feeding the tax position rather than shown as a decorative figure." },
          { name: "Tax position", detail: "The after-tax cash flow at the client's marginal rate, which is the number that reflects reality." },
        ],
      },
      {
        kind: "prose",
        text:
          "The output shows pre-tax and after-tax cash flow per year, the cumulative position, and the year the property turns cash-flow positive on current assumptions. Sensitivity to interest-rate movement is available, because a model that only works at today's rate is not a plan.",
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Tax outcomes depend on the client's circumstances. The model computes a position on the inputs given; it does not constitute tax advice, and your standard disclaimer should say so.",
      },
    ],
  },
  {
    slug: "cashflow-comparisons",
    title: "Cash Flow Comparisons",
    summary: "Comparing the holding position across properties or structures side by side.",
    group: "Reports & Analysis",
    moduleSlug: "cashflow-comparisons",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "The comparison view puts several cash flow models next to each other, holding the shared assumptions constant so the differences that appear are real differences between the properties or structures rather than artefacts of inconsistent inputs.",
      },
      {
        kind: "list",
        title: "Typical uses",
        items: [
          "Two properties at different price points and yields",
          "The same property under different loan structures",
          "Interest-only versus principal-and-interest over the full horizon",
          "Ownership structures with different marginal tax positions",
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "The most persuasive comparison is usually cumulative position at year ten, not year-one cash flow. Year one flatters the wrong property surprisingly often.",
      },
    ],
  },
  {
    slug: "quantitative-reports",
    title: "Quantitative Reports",
    summary: "Data-led analysis across the portfolio and market, beyond single-property reporting.",
    group: "Reports & Analysis",
    moduleSlug: null,
    guideSectionId: "quantitative-reports",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Where standard reports answer questions about one property for one client, quantitative reports answer questions about sets — how a portfolio behaves, how a cohort of suburbs compares, how a strategy would have performed against alternatives.",
      },
      {
        kind: "list",
        title: "What it supports",
        items: [
          "Portfolio-level aggregation across a client's holdings",
          "Cross-suburb comparison on consistent metrics",
          "Scenario modelling with explicit variable ranges",
          "Output suitable for a sophisticated client or an internal investment committee",
        ],
      },
    ],
  },
  {
    slug: "report-requests",
    title: "Report Requests",
    summary: "Requests coming in from clients and staff, and how they are triaged.",
    group: "Reports & Analysis",
    moduleSlug: null,
    readMinutes: 4,
    blocks: [
      {
        kind: "prose",
        text:
          "Report Requests is the inbound queue. Clients can request analysis through the portal and staff can raise requests internally; both land here rather than in somebody's inbox, which is what stops them being lost.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Requester", detail: "The client or staff member who raised it." },
          { name: "Subject", detail: "The property or question the request is about." },
          { name: "Status", detail: "New, in progress, completed or declined, with a reason where declined." },
          { name: "Assignee", detail: "Who owns delivering it." },
          { name: "Linked output", detail: "The generated report that satisfied the request, once produced." },
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Closing a request by linking the report that answered it keeps the client-facing history coherent — the client can see the request and its answer together in the portal.",
      },
    ],
  },
  {
    slug: "depreciation",
    title: "Depreciation",
    summary: "Depreciation estimation, comparable data and how schedules feed the cash flow model.",
    group: "Reports & Analysis",
    moduleSlug: null,
    guideSectionId: "depreciation",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Depreciation materially changes after-tax cash flow, and clients consistently underestimate it. The platform estimates capital works and plant depreciation from property characteristics and a library of comparable data, then feeds the result straight into the cash flow model rather than leaving it as a separate number to reconcile.",
      },
      {
        kind: "fields",
        title: "Inputs that drive the estimate",
        rows: [
          { name: "Construction date", detail: "Determines capital works eligibility and rate." },
          { name: "Property type and size", detail: "Drives the building cost base the estimate works from." },
          { name: "Condition and fit-out", detail: "Plant and equipment value varies widely with fit-out standard." },
          { name: "Purchase date", detail: "Sets the first claimable year and applies the relevant legislative treatment." },
          { name: "Comparables", detail: "A reference library of like properties, used to sanity-check the estimate rather than to replace a quantity surveyor's schedule." },
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "An estimate supports a conversation; a quantity surveyor's schedule supports a tax return. The platform is explicit about which one it is producing, and your report disclaimer should be too.",
      },
    ],
  },
  {
    slug: "charts",
    title: "Charts & Visualisation",
    summary: "The chart library behind reports, and building saved visualisations.",
    group: "Reports & Analysis",
    moduleSlug: null,
    readMinutes: 4,
    blocks: [
      {
        kind: "prose",
        text:
          "Charts generated for reports are stored rather than discarded, which means a visualisation you liked can be reused, and a chart in a report a client is querying can be reproduced exactly as it was sent.",
      },
      {
        kind: "list",
        items: [
          "Cash flow and cumulative position over the modelled horizon",
          "Yield and growth comparisons across properties or suburbs",
          "Portfolio composition and concentration",
          "Market series pulled from Market Updates",
          "Saved charts, searchable and reusable across reports",
        ],
      },
    ],
  },
];
