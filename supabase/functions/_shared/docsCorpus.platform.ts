// Intelligence & AI, Portals, Administration, Compliance, Help & Usage.
import type { DocsSection } from "./docsTypes.ts";

export const PLATFORM_SECTIONS: DocsSection[] = [
  // ────────────────────────── Intelligence & AI ──────────────────────────────
  {
    slug: "ai-agent",
    title: "Aurixa Agent",
    summary: "The conversational assistant that can read the workspace and act inside it.",
    group: "Intelligence & AI",
    moduleSlug: "aurixa-agent",
    guideSectionId: "ai-agent",
    readMinutes: 12,
    blocks: [
      {
        kind: "prose",
        text:
          "The Aurixa Agent is a conversational layer over the whole workspace. It can answer questions about your data, produce analysis, and perform actions on your behalf — creating reminders, updating records, drafting follow-ups, scheduling work. It is the difference between knowing the platform holds an answer and having to remember which screen holds it.",
      },
      {
        kind: "subsection",
        title: "What it can do",
        blocks: [
          {
            kind: "list",
            items: [
              "Answer questions across clients, deals, reports, calls and calendar",
              "Run calculations — stamp duty, LMI, repayments, yield, equity position",
              "Create and update records: reminders, notes, deals, appointments, game plans",
              "Draft follow-ups and client communication with the relevant context loaded",
              "Produce summaries — a client's position before a meeting, a weekly digest, pipeline health",
              "Search semantically across uploaded documents and stored knowledge",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Confirmation and safety",
        blocks: [
          {
            kind: "prose",
            text:
              "Anything destructive or bulk requires explicit confirmation before it runs. The Agent proposes the action, shows you precisely what it will do, and waits. Reading is immediate; changing is deliberate.",
          },
          {
            kind: "note",
            tone: "compliance",
            text:
              "The Agent operates strictly within your own permissions. It cannot read a module you lack access to, cannot touch a client you are not entitled to, and cannot perform an action your role forbids — it is an interface to your access, never an escalation of it. Every tool call is logged with the actor, the action and the decision.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "Memory and skills",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "Memory", detail: "Facts and preferences the Agent retains across conversations, scoped to you. Reviewable and removable." },
              { name: "Skills", detail: "Named capability sets that shape how the Agent behaves for a particular kind of work, installable from a marketplace." },
              { name: "Playbooks", detail: "Sequences of steps you define once and run repeatedly." },
              { name: "Scheduled tasks", detail: "Work the Agent performs on a schedule — a Monday pipeline summary, a weekly stale-deal sweep." },
              { name: "Plans", detail: "Long-horizon multi-step work, drafted by the Agent, approved step by step by you." },
              { name: "Conversations", detail: "History, shareable with colleagues where you choose." },
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Working with it well",
        blocks: [
          {
            kind: "steps",
            items: [
              "Be specific about scope. 'Clients with settlement in the next 30 days' beats 'my urgent clients'.",
              "Ask it to show its working on anything numeric. It will cite the records it used.",
              "Use it to prepare rather than to decide — a briefing before a client call is where it pays back fastest.",
              "Review proposed actions properly before confirming. The confirmation step exists to be used, not clicked through.",
            ],
          },
          {
            kind: "note",
            tone: "warning",
            text:
              "The Agent can be wrong, particularly where your data is incomplete. Treat its output as a well-informed colleague's first draft, not as a verified result.",
          },
        ],
      },
    ],
  },
  {
    slug: "report-qa",
    title: "Report Q&A and Intelligence Hub",
    summary: "Asking questions of your documents and reports in natural language.",
    group: "Intelligence & AI",
    moduleSlug: "intelligence-hub",
    guideSectionId: "report-qa",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "Report Q&A lets you interrogate documents rather than read them. Reports, uploaded files and generated analysis are indexed so you can ask what a document says and get an answer with the passage it came from.",
      },
      {
        kind: "list",
        title: "What it covers",
        items: [
          "Generated reports and their underlying data",
          "Uploaded client documents where indexing is enabled",
          "Market data and commentary",
          "Cross-document questions — asking the same thing across a set of reports",
        ],
      },
      {
        kind: "prose",
        text:
          "Answers cite their sources. Where a claim comes from a specific report or page, the citation is a link, so you can verify rather than trust. Conversations are retained and can be shared with colleagues who have access to the same underlying material.",
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Quality of answers tracks quality of indexing. A scanned document with no text layer cannot be searched; the PDF Import module handles extraction for those.",
      },
    ],
  },
  {
    slug: "pdf-import",
    title: "PDF Import & Document Extraction",
    summary: "Turning uploaded documents into structured data on the client record.",
    group: "Intelligence & AI",
    moduleSlug: "intelligence-hub",
    guideSectionId: "pdf-import",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "Clients arrive with documents, not data. PDF Import reads statements, payslips, rates notices, contracts and existing reports, extracts the values that matter, and proposes them as updates to the client record.",
      },
      {
        kind: "steps",
        title: "The extraction flow",
        items: [
          "Upload the document against the client, or drop a batch.",
          "The extractor identifies the document type and pulls the fields it recognises.",
          "Review the proposed values. Each is shown alongside the passage it was taken from, with a confidence indication.",
          "Accept, correct or reject field by field. Nothing is written to the record until you accept it.",
          "Accepted values update the client record and are recorded in the audit trail as having come from an import.",
        ],
      },
      {
        kind: "fields",
        title: "Documents commonly handled",
        rows: [
          { name: "Payslips and income statements", detail: "Gross and net income, employer, pay frequency and year-to-date." },
          { name: "Bank and loan statements", detail: "Balances, limits, repayments and lender." },
          { name: "Rates and land tax notices", detail: "Property identity, valuation and annual charge." },
          { name: "Rental statements", detail: "Rent received, management fees and outgoings." },
          { name: "Contracts and schedules", detail: "Purchase price, dates and parties." },
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "Extraction is assistive, and a human accepts every value. This is deliberate — an OCR misread on an income figure would otherwise flow silently into a borrowing calculation and out into advice.",
      },
    ],
  },
  {
    slug: "model-hub",
    title: "Model Hub",
    summary: "Which AI model powers each feature, and controlling that per capability.",
    group: "Intelligence & AI",
    moduleSlug: "model-hub",
    guideSectionId: "model-hub",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Model Hub makes the AI layer explicit. Every AI-backed capability in the platform has an assigned model, and this is where you see and change those assignments rather than accepting an opaque default.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Assignment", detail: "The model each capability uses, with its category and description." },
          { name: "Fallback chain", detail: "Ordered alternatives used if the primary is unavailable, so a provider outage degrades rather than breaks." },
          { name: "Parameters", detail: "Temperature, token ceiling and reasoning effort per capability." },
          { name: "Locked assignments", detail: "Capabilities where the model is fixed because correctness depends on it." },
          { name: "Testing", detail: "Fire a minimal request through an assignment to confirm it is reachable before relying on it." },
          { name: "Last used", detail: "When each assignment last ran, which is how you find capabilities nobody actually uses." },
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Cheaper models suit high-volume, low-stakes work such as summarisation. Keep the strongest model where the output reaches a client. The per-capability assignment exists precisely so that trade-off is yours.",
      },
    ],
  },

  // ──────────────────────────────── Portals ──────────────────────────────────
  {
    slug: "client-portal",
    title: "Client Portal",
    summary: "The client-facing login — what they see, what they can do, and how to control it.",
    group: "Portals",
    moduleSlug: null,
    guideSectionId: "client-portal",
    readMinutes: 8,
    blocks: [
      {
        kind: "prose",
        text:
          "The Client Portal gives your clients their own branded login showing their reports, documents, portfolio position and a message thread to you. It removes the 'can you resend that report' email while giving you visibility of whether they actually opened it.",
      },
      {
        kind: "subsection",
        title: "What the client sees",
        blocks: [
          {
            kind: "list",
            items: [
              "Reports you have published to them, with the ability to download",
              "Their property portfolio and current position",
              "Documents you have shared, and a route to upload their own",
              "Client forms awaiting completion",
              "A message thread with your team",
              "Appointment detail where calendar sharing is enabled",
            ],
          },
          {
            kind: "note",
            tone: "warning",
            text:
              "The portal shows only what you publish. A report generated internally is not visible to the client until it is explicitly sent — there is no accidental exposure of draft analysis.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "Administering it",
        blocks: [
          {
            kind: "steps",
            items: [
              "Configure the portal under Portal Configuration — branding, which surfaces are enabled, and the welcome content.",
              "Invite a client from their record. They set their own password; you never hold it.",
              "Use View As Client to check exactly what they will see before you invite them.",
              "Revoke access from the same place if the relationship ends. Revocation is immediate.",
            ],
          },
        ],
      },
      {
        kind: "prose",
        text:
          "Portal activity is recorded — logins, report opens, downloads and messages — and surfaces on the client record and in Client Tracker, which is often the earliest signal that a client has gone quiet.",
      },
    ],
  },
  {
    slug: "finance-portal",
    title: "Finance Portal",
    summary: "The broker-facing surface for finance referrals, documents and messaging.",
    group: "Portals",
    moduleSlug: "finance-portal",
    guideSectionId: "finance-portal",
    readMinutes: 9,
    blocks: [
      {
        kind: "prose",
        text:
          "The Finance Portal is a separate login for the finance professionals you work with. When a client needs finance, you send the referral through the portal rather than by email, and the broker works the case in a controlled surface with only the client detail they need.",
      },
      {
        kind: "subsection",
        title: "The referral flow",
        blocks: [
          {
            kind: "steps",
            items: [
              "Open the client and use Send To Finance.",
              "Select the finance partner and confirm what is shared. Sharing is explicit and scoped — the broker sees the financial position relevant to the application, not the whole client record.",
              "The partner receives access in their portal and can request further documents through it.",
              "Correspondence runs through Finance Messages, threaded on the client record so your team sees the state of play.",
              "Status updates from the broker flow back and are visible against the client and any linked deal.",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Partner administration",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "Partner users", detail: "Individual logins per broker, with their own permissions rather than a shared account." },
              { name: "Client assignments", detail: "Which clients each partner can see. Assignment is the access control." },
              { name: "Default permissions", detail: "The baseline a new partner user receives." },
              { name: "Documents", detail: "Shared both ways, with an audit record of what was exchanged and when." },
              { name: "Branding", detail: "Partner-facing presentation, so the portal reflects your business." },
              { name: "Activity log", detail: "Every partner action, retained." },
            ],
          },
          {
            kind: "note",
            tone: "compliance",
            text:
              "Finance partners are external parties handling client financial data. Access is per-client and revocable, and every document exchange is logged — which is what you would need to evidence in a privacy review.",
          },
        ],
      },
    ],
  },
  {
    slug: "solicitor-portal",
    title: "Solicitor Portal",
    summary: "The legal-partner surface for conveyancing and matter management.",
    group: "Portals",
    moduleSlug: "finance-portal",
    guideSectionId: "solicitor-portal",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "The Solicitor Portal is the equivalent surface for legal partners handling conveyancing on your clients' transactions. Matters are visible to the assigned firm, documents are exchanged inside the platform, and progress reflects back into the deal.",
      },
      {
        kind: "list",
        title: "What it covers",
        items: [
          "Matter records linked to the client and deal",
          "Document exchange with an audit trail",
          "Conflict checks recorded against a matter",
          "Milestone and status updates that flow back to the deal's critical dates",
          "Compliance exports where the firm requires them",
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Legal matter data is sensitive and access is scoped to the assigned firm. Matter audit events are retained and are not editable after the fact.",
      },
    ],
  },
  {
    slug: "accountant-portal",
    title: "Accountant Portal",
    summary: "The client's accountant, working beside the broker and the solicitor on a purchase.",
    group: "Portals",
    moduleSlug: "finance-portal",
    guideSectionId: "accountant-portal",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "The accountant is the fourth professional on a purchase, and owns the fact the others most need: the purchasing entity the contract and the loan are written in. The Accountant Portal gives them a place to record it, alongside income evidence and the depreciation position, where the broker, the solicitor and your team can see it.",
      },
      {
        kind: "steps",
        title: "Adding an accountant",
        items: [
          "Start from the Portal users tab, from a practice's row, or from the Accountant card on a client",
          "Enter the practice, the person and the clients they will work on — the practice does not need to exist first",
          "Send the invitation; the accountant sets a password and accepts the portal agreement",
          "Their allocated clients appear in their portal straight away",
        ],
      },
      {
        kind: "list",
        title: "What the accountant works on",
        items: [
          "The purchasing entity: individual, joint, company, trust or SMSF",
          "Whether income evidence is ready for the broker",
          "The depreciation position",
          "A client-facing summary, and a separate team note the client never sees",
          "Requests to the client for documents or information, and a message thread with your team",
          "The client's purchases, read from the deal pipeline",
        ],
      },
      {
        kind: "fields",
        title: "Allocations",
        rows: [
          {
            name: "Active",
            detail: "The accountant can read and update the client within the permissions set for them.",
          },
          {
            name: "Paused",
            detail: "The client stays on the accountant's list, read-only.",
          },
          {
            name: "Ended",
            detail: "The client leaves the accountant's list.",
          },
          {
            name: "Permissions",
            detail:
              "Set per client, with defaults for the accountant and for the practice. A permission not set at any of those levels uses the standard setting.",
          },
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "When the accountant confirms the purchasing entity, the client's buyer's agent is told, because the contract and the loan are written in that entity.",
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "An accountant reaches a client only through an allocation your team makes. A Compliance Passport is a separate disclosure: it is shared from the client's AML case, not by allocating the client.",
      },
    ],
  },
  {
    slug: "builder-portal",
    title: "Builder Portal",
    summary: "The builder-facing surface for construction progress and invoicing.",
    group: "Portals",
    moduleSlug: "finance-portal",
    guideSectionId: "builder-portal",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "For construction transactions, the Builder Portal lets the builder report progress and submit invoices directly, replacing the email chain that otherwise sits between a completed stage and a progress payment.",
      },
      {
        kind: "list",
        items: [
          "Progress updates against the payment schedule",
          "Invoice submission per stage",
          "Photo and document upload as evidence of completion",
          "Status flowing back to the deal, updating build milestones",
          "Notification to your team when a stage is claimed",
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "A claimed stage is a claim, not an approval. Progress payments still require your verification — the portal shortens the loop, it does not remove the control.",
      },
    ],
  },
  {
    slug: "partner-network",
    title: "Partner Network",
    summary: "Managing the referral partners around your business and the agreements with them.",
    group: "Portals",
    moduleSlug: "finance-portal",
    guideSectionId: "partner-network",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Partner Network holds the professional relationships around your business — referrers, brokers, accountants, legal firms — with their agreements, referral history and any commission arrangements.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Partner record", detail: "Organisation, contacts and the services they provide." },
          { name: "Agreements", detail: "Referral and commission terms, versioned and executed like any other agreement." },
          { name: "Referrals", detail: "Sent and received, with outcome tracking through to settled business." },
          { name: "Consent and privacy", detail: "What client data may be shared with the partner, recorded explicitly." },
          { name: "Compliance events", detail: "Audit record of partner-related compliance actions." },
        ],
      },
    ],
  },

  // ───────────────────────────── Administration ──────────────────────────────
  {
    slug: "settings",
    title: "Settings",
    summary: "Workspace configuration — the settings that shape everything else.",
    group: "Administration",
    moduleSlug: null,
    guideSectionId: "settings",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "Settings is the workspace's configuration surface. Most of it is set once during onboarding and revisited rarely, but the values here propagate everywhere — into reports, agreements, portals and calculations.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Business details", detail: "Trading name, ABN, licence numbers and contact details. These appear on generated documents." },
          { name: "Global report settings", detail: "Contact block and professional disclaimer applied to every report. Set here, not per report." },
          { name: "Integrations", detail: "Calendar, mail, CRM, messaging and e-signature connections." },
          { name: "Notification defaults", detail: "Workspace-level defaults that users can narrow but not widen." },
          { name: "Regional settings", detail: "State-specific defaults for duty, land tax and lending assumptions." },
          { name: "Security", detail: "Session policy, multi-factor requirements and password rules." },
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "Global report settings apply to documents generated after the change. Reports already produced keep the disclaimer that was current when they were sent — which is correct, and is why the version history matters.",
      },
    ],
  },
  {
    slug: "user-management",
    title: "User Management & Permissions",
    summary: "Users, roles and the per-module permission model that governs everything.",
    group: "Administration",
    moduleSlug: null,
    guideSectionId: "admin",
    readMinutes: 10,
    blocks: [
      {
        kind: "prose",
        text:
          "User Management is where access is granted and removed. The permission model is deliberately explicit: rather than a handful of coarse roles, each user is granted view, edit and delete on each module their plan includes.",
      },
      {
        kind: "subsection",
        title: "The model",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "View", detail: "Can open the module and read its data." },
              { name: "Edit", detail: "Can create and modify records within it." },
              { name: "Delete", detail: "Can remove or archive records. Granted sparingly." },
              { name: "Administrator", detail: "Can manage users and workspace settings." },
              { name: "Superadmin", detail: "Full access including permission administration. Kept to as few people as the business can tolerate." },
            ],
          },
          {
            kind: "prose",
            text:
              "Permissions are enforced everywhere, not just in the interface. The sidebar hides what you cannot access, but the same check runs on the server for every request, in the database for direct data access, and inside the Aurixa Agent for every tool it calls. There is no route to data that skips the check.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "Administering users",
        blocks: [
          {
            kind: "steps",
            items: [
              "Create the user and set their role.",
              "Grant module permissions. Start from least privilege and add what the job requires; copying an existing user's permission set is available where roles genuinely match.",
              "Invite them. They set their own password on first sign-in.",
              "Review periodically. Permission sets accumulate as people change roles, and the review is what stops that becoming a problem.",
              "Deactivate rather than delete when someone leaves — their historical actions must remain attributable.",
            ],
          },
          {
            kind: "note",
            tone: "compliance",
            text:
              "Every permission change is recorded with who made it, when, and what changed. This is the record a security review will ask for.",
          },
        ],
      },
    ],
  },
  {
    slug: "white-label",
    title: "Branding & White Label",
    summary: "Making the platform and its output look like your business.",
    group: "Administration",
    moduleSlug: null,
    guideSectionId: "white-label",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Branding controls how the workspace and everything it produces appears — to your staff, to your clients in the portal, and on every document that leaves the building.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Logos", detail: "Primary, sign-in and report variants, so each surface gets an appropriately sized asset." },
          { name: "Colours", detail: "Brand palette applied across the interface, portals and generated documents." },
          { name: "Typography", detail: "Brand fonts where licensing permits." },
          { name: "Report presentation", detail: "Cover pages, headers, footers and overlays." },
          { name: "Portal branding", detail: "How the client, finance, solicitor and builder portals present." },
          { name: "Email templates", detail: "Branding on outbound mail from the platform." },
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Set branding before inviting a single client to the portal. Rebranding later is straightforward, but clients who saw the unbranded version will have formed an impression.",
      },
    ],
  },
  {
    slug: "templates",
    title: "Templates",
    summary: "Report and document templates, the builder, and the approval workflow.",
    group: "Administration",
    moduleSlug: null,
    guideSectionId: "templates",
    readMinutes: 9,
    blocks: [
      {
        kind: "prose",
        text:
          "Templates define what your documents look like and what they say. The template library covers report layouts, agreement wording, email templates and reusable components, with a builder for editing them and an approval flow for controlling what reaches clients.",
      },
      {
        kind: "subsection",
        title: "The builder",
        blocks: [
          {
            kind: "list",
            items: [
              "Component-based layout with a reusable component library",
              "Merge fields that pull live client, property and market data",
              "Conditional sections that appear only when relevant",
              "Cover pages and overlays",
              "Preview against a real client record before publishing",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Approval and versioning",
        blocks: [
          {
            kind: "prose",
            text:
              "Template changes go through approval where your workspace requires it. Every version is retained, comments are threaded on the template, and an audit log records who changed what. Reports keep a reference to the template version that produced them, so a document can always be explained.",
          },
          {
            kind: "note",
            tone: "compliance",
            text:
              "Where a template carries required disclosures, the approval workflow is the control that stops an edit removing them silently. Use it rather than granting broad template-edit rights.",
          },
        ],
      },
    ],
  },
  {
    slug: "data-import",
    title: "Data Import",
    summary: "Bringing existing clients and records into the workspace.",
    group: "Administration",
    moduleSlug: null,
    guideSectionId: "data-import",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "Data Import handles migration from whatever you were using before, and ongoing bulk updates. It is deliberately a staged process with a review step rather than a direct write, because an import that silently creates six hundred duplicates is expensive to unpick.",
      },
      {
        kind: "steps",
        items: [
          "Upload the source file and choose the record type.",
          "Map columns to fields. Mappings are saved, so a recurring import is configured once.",
          "Validate. The importer reports malformed values, missing required fields and probable duplicates before anything is written.",
          "Review the proposed changes — creations, updates and skips, itemised.",
          "Commit. The job runs in the background with progress, and every created record is tagged with the import that produced it.",
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "Because imported records are tagged, a bad import can be identified and reversed. Run a small sample first regardless — validating twenty rows takes a minute and reveals mapping errors that a full run would multiply.",
      },
    ],
  },
  {
    slug: "sources",
    title: "Data Sources",
    summary: "The external data feeding the platform, and its freshness.",
    group: "Administration",
    moduleSlug: null,
    guideSectionId: "sources",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Sources is the register of external data the platform depends on — property data, market statistics, lending rates, geocoding and enrichment services — with the state of each connection.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Connection status", detail: "Whether the source is reachable and authenticated." },
          { name: "Last refresh", detail: "When data was last pulled, and whether that is on schedule." },
          { name: "Coverage", detail: "What the source provides and where it applies." },
          { name: "Usage", detail: "Call volume, relevant where a source is metered." },
          { name: "Provenance", detail: "Which source a given value came from, retained on the record." },
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "When a figure looks wrong, provenance is the fastest route to the answer: it tells you which source supplied it and when, which usually resolves the question without a support ticket.",
      },
    ],
  },
  {
    slug: "integrations",
    title: "Integrations",
    summary: "Connecting calendar, mail, CRM, messaging and e-signature services.",
    group: "Administration",
    moduleSlug: "integrations",
    guideSectionId: "integrations",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "Integrations connect the platform to the tools already in your business. Each connection is authorised explicitly, requests the narrowest scope that supports the feature, and can be revoked without affecting data already synchronised.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Calendar", detail: "Two-way appointment sync and availability lookup." },
          { name: "Email", detail: "Mailbox connection for Email Copilot." },
          { name: "CRM and marketing", detail: "Contact and opportunity sync with your existing CRM." },
          { name: "Messaging", detail: "Conversational channels surfaced under Conversations." },
          { name: "E-signature", detail: "Sending agreements for signature and receiving execution events." },
          { name: "Telephony", detail: "Call capture and transcription for Call Logs." },
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Connections are held per workspace with credentials stored as secrets, never in readable configuration. Revoking a connection stops future sync immediately; historical data already imported is retained unless you remove it explicitly.",
      },
    ],
  },
  {
    slug: "monitoring",
    title: "Monitoring & Error Logs",
    summary: "Platform health, integration status and diagnosing what went wrong.",
    group: "Administration",
    moduleSlug: null,
    guideSectionId: "monitoring",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Monitoring surfaces the platform's own operational state — integration health, background job outcomes, error rates and API responsiveness — so a problem is visible before a user reports it.",
      },
      {
        kind: "list",
        items: [
          "Integration connection health and last successful sync",
          "Background job status, including failures with their reason",
          "Error logs with correlation identifiers for support",
          "API usage and response times",
          "Cache statistics where relevant to performance",
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "When raising a support request, the correlation identifier from the error log turns a vague description into a precise one and materially shortens the investigation.",
      },
    ],
  },
  {
    slug: "activity-logs",
    title: "Activity Logs",
    summary: "The audit trail — who did what, when, and to which record.",
    group: "Administration",
    moduleSlug: null,
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Activity Logs is the workspace's audit trail. Record changes, permission changes, document access, exports and administrative actions are recorded with actor, action, target and timestamp.",
      },
      {
        kind: "list",
        title: "What is captured",
        items: [
          "Client and deal record changes, with before and after",
          "Report generation and distribution",
          "Document access and download",
          "Permission and role changes",
          "Portal access grants and revocations",
          "Data imports and bulk operations",
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Audit entries are append-only. They cannot be edited or removed from within the application, which is what makes them worth keeping.",
      },
    ],
  },
  {
    slug: "api-usage",
    title: "API Usage",
    summary: "Programmatic access, keys and consumption against your allowance.",
    group: "Administration",
    moduleSlug: "api-usage",
    guideSectionId: "api-usage",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "API Usage covers programmatic access to the workspace and the visibility that goes with it — which keys exist, what they are permitted to do, and what they have consumed.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Keys", detail: "Issued per integration with scoped permissions, revocable individually." },
          { name: "Scopes", detail: "What each key may do. Least privilege applies here as everywhere else." },
          { name: "Consumption", detail: "Calls by key and endpoint over time." },
          { name: "Rate limits", detail: "Applied per key, with headers reporting remaining allowance." },
          { name: "Errors", detail: "Failed calls with reason, for debugging an integration." },
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "An API key is a credential with the permissions you grant it. Rotate on staff change, scope narrowly, and revoke immediately when an integration is retired.",
      },
    ],
  },

  // ──────────────────────────────── Compliance ───────────────────────────────
  {
    slug: "aml-ctf",
    title: "AML / CTF Compliance",
    summary: "Customer due diligence, risk assessment, monitoring and regulatory reporting.",
    group: "Compliance",
    moduleSlug: "aml-ctf",
    guideSectionId: "aml-ctf",
    readMinutes: 14,
    blocks: [
      {
        kind: "prose",
        text:
          "The AML/CTF module supports your anti-money-laundering and counter-terrorism-financing obligations. It is included on every plan because the obligations do not scale with your subscription tier. It structures customer due diligence, risk assessment, ongoing monitoring and reporting, and — critically — records the evidence behind every decision.",
      },
      {
        kind: "subsection",
        title: "Customer due diligence",
        blocks: [
          {
            kind: "steps",
            items: [
              "A case is opened for a client at the point of an activation event, confirmed by a person. Marketing leads and unconverted enquiries do not generate cases.",
              "Identify the customer and any connected parties — beneficial owners, controllers, and other persons the relationship reaches.",
              "Verify identity through the configured verification provider, or record manual verification with the evidence attached.",
              "Assess risk against your risk model, producing a rating with the factors that drove it recorded.",
              "Apply the due diligence appropriate to the rating — standard, simplified or enhanced.",
              "Record the decision with its approver. The decision, the evidence and the approver are stored together and hash-chained so the record cannot be quietly revised.",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "The five workspaces",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "Compliance Home", detail: "The current state — what needs attention, what is overdue, where risk is concentrated." },
              { name: "Customer Compliance", detail: "Case management, identity verification, risk assessment and due diligence." },
              { name: "Transaction Compliance", detail: "Transaction monitoring, thresholds and the alerts they generate." },
              { name: "Regulatory & Assurance", detail: "Reporting obligations, assurance activity and the audit record." },
              { name: "Platform Administration", detail: "Risk model configuration, program version, providers and thresholds." },
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Ongoing monitoring",
        blocks: [
          {
            kind: "list",
            items: [
              "Transaction monitoring against configured thresholds and patterns",
              "Periodic review cycles driven by risk rating, so high-risk relationships are revisited more often",
              "Sanctions and politically-exposed-person screening on a schedule as well as at onboarding",
              "Change detection on customer records that alters a risk position",
              "Alerts routed to a compliance queue rather than to a general inbox",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Reporting",
        blocks: [
          {
            kind: "prose",
            text:
              "Where an obligation to report arises, the module supports preparing and recording the submission. Reports cannot be marked submitted without submission evidence attached — the record exists to be relied on, and an unevidenced 'submitted' flag would defeat that.",
          },
          {
            kind: "note",
            tone: "compliance",
            text:
              "Tipping-off protections apply. Restricted matters do not appear in general client views, portal surfaces, or counts visible to staff without the corresponding capability. Restricted capabilities require step-up confirmation and those sessions are short-lived and per-capability.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "What the module is not",
        blocks: [
          {
            kind: "note",
            tone: "warning",
            text:
              "This is tooling that supports a compliance program; it is not the program itself and it is not legal advice. Your risk model, thresholds, escalation policy and program version are yours to set and to defend. The platform's job is to apply them consistently and to make the evidence retrievable.",
          },
        ],
      },
    ],
  },

  // ─────────────────────────────── Help & Usage ──────────────────────────────
  {
    slug: "billing-usage",
    title: "Billing & Usage",
    summary: "Your plan, token consumption, invoices and payment methods.",
    group: "Help & Usage",
    moduleSlug: null,
    guideSectionId: "billing-usage",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Billing & Usage shows what you are on, what you have consumed, and what you have been charged. AI-backed features consume tokens from a workspace allowance, and this is where that consumption is visible before it becomes a surprise.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Current plan", detail: "Your tier and any add-on modules, with what each includes." },
          { name: "Token balance", detail: "Remaining allowance and consumption trend." },
          { name: "Usage breakdown", detail: "Which features consumed what, so heavy usage can be attributed rather than guessed at." },
          { name: "Top-ups", detail: "Purchasing additional allowance when needed." },
          { name: "Invoices", detail: "Billing history, downloadable." },
          { name: "Payment methods", detail: "Stored cards, managed through the payment provider's secure page." },
        ],
      },
      {
        kind: "prose",
        text:
          "Plan changes take effect through the pricing page and reconcile automatically: upgrading enables the modules the new tier includes, and add-on purchases enable that module regardless of tier. Documentation access — including this page — follows the same entitlement.",
      },
    ],
  },
  {
    slug: "user-guide",
    title: "In-App User Guide",
    summary: "The quick reference inside the dashboard, and how it relates to this documentation.",
    group: "Help & Usage",
    moduleSlug: null,
    readMinutes: 3,
    blocks: [
      {
        kind: "prose",
        text:
          "The Command Center carries its own user guide, reachable from the sidebar. It is the quick reference — short sections, task-oriented, with an AI assistant that answers questions about the workspace you are actually in.",
      },
      {
        kind: "prose",
        text:
          "This documentation is the long form. Where the guide tells you which button to press, the documentation explains the model underneath, the edge cases, and why the product behaves as it does. Each guide section links here, and both are gated by the same entitlement — you see documentation for the modules your workspace holds.",
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    summary: "Common problems, what causes them, and what to try before raising a ticket.",
    group: "Help & Usage",
    moduleSlug: null,
    guideSectionId: "troubleshooting",
    readMinutes: 7,
    blocks: [
      {
        kind: "fields",
        title: "Frequent causes",
        rows: [
          {
            name: "A module is missing from the sidebar",
            detail:
              "Either your plan does not include it or your permissions do not grant view. An administrator can tell you which in seconds under User Management, and only one of the two is fixed by upgrading.",
          },
          {
            name: "A report fails to generate",
            detail:
              "Usually a gap in the client record. Run Review on the client — it names the missing field. The failed generation is retained with its reason attached.",
          },
          {
            name: "A number looks wrong",
            detail:
              "Check provenance under Sources for the value's origin and freshness, and check the assumptions recorded on the report. Assumptions that were changed are shown rather than hidden.",
          },
          {
            name: "Calendar or mail is not syncing",
            detail:
              "Check the connection under Monitoring. Provider tokens expire and reauthorisation is usually the fix.",
          },
          {
            name: "A client cannot access the portal",
            detail:
              "Confirm access is granted and not revoked, then use View As Client. Invitations expire, and reissuing is immediate.",
          },
          {
            name: "The Agent refuses an action",
            detail:
              "It operates strictly inside your permissions. A refusal means your role does not allow the action — which is the control working, not a fault.",
          },
        ],
      },
      {
        kind: "steps",
        title: "Before raising a ticket",
        items: [
          "Note the correlation identifier from the error log if one was shown.",
          "Record what you did, what you expected and what happened instead.",
          "Check whether a colleague with the same permissions sees the same thing — it distinguishes a data problem from an access one.",
          "Include the client or report identifier where relevant, never a screenshot containing another client's details.",
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "The in-app assistant resolves a good proportion of questions immediately, and it knows which modules your workspace actually has — so its answers do not describe features you cannot use.",
      },
    ],
  },
];
