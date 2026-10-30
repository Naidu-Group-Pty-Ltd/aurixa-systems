/**
 * Client for the gated documentation endpoint.
 *
 * The browser never decides what it may read. It passes the handoff token it
 * was given (if any) and renders whatever comes back — bodies for the sections
 * the server judged this viewer entitled to, titles only for the rest. There is
 * no client-side filtering step to bypass, because there is no unfiltered
 * payload in the browser to begin with.
 */

const STOREFRONT_BASE = (() => {
  const explicit = import.meta.env.VITE_STOREFRONT_API_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, "");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl) return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`;
  return "https://moeyytuduycrvvncdtme.supabase.co/functions/v1";
})();

export type DocsBlock =
  | { kind: "prose"; text: string }
  | { kind: "steps"; title?: string; items: string[] }
  | { kind: "list"; title?: string; items: string[] }
  | { kind: "fields"; title?: string; rows: Array<{ name: string; detail: string }> }
  | { kind: "note"; tone: "tip" | "warning" | "compliance"; text: string }
  | { kind: "subsection"; title: string; blocks: DocsBlock[] };

export type DeliveredSection = {
  slug: string;
  title: string;
  summary: string;
  group: string;
  moduleSlug: string | null;
  readMinutes: number;
  locked: boolean;
  unlockedBy?: string | null;
  /** A partner portal any plan with AML/CTF Compliance includes (29 Oct 2026). */
  includedWithAml?: boolean;
  /** Locked because the workspace's agreement excludes the module. */
  excludedByAgreement?: boolean;
  guideSectionId?: string;
  blocks: DocsBlock[];
};

export type DocsPayload = {
  ok: boolean;
  viewer: {
    identified: boolean;
    plan_slug: string | null;
    addon_slugs: string[];
    excluded_slugs?: string[];
  };
  groups: Array<{ heading: string; blurb: string }>;
  sections: DeliveredSection[];
  counts: { total: number; readable: number; locked: number };
};

/**
 * Fetch the documentation for this viewer.
 *
 * Returns null on failure. The page falls back to the public index, so a
 * backend outage degrades to the anonymous experience rather than a blank
 * screen — the same direction the server takes when it cannot resolve a token.
 */
export async function fetchDocs(handoff: string | null): Promise<DocsPayload | null> {
  const qs = handoff ? `?h=${encodeURIComponent(handoff)}` : "";
  try {
    const res = await fetch(`${STOREFRONT_BASE}/storefront-docs${qs}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as DocsPayload;
    return body?.ok ? body : null;
  } catch {
    return null;
  }
}

/**
 * Remember a resolved handoff for the tab.
 *
 * Handoffs expire after thirty minutes, which is shorter than someone reads
 * documentation for. Keeping the token in sessionStorage means a refresh or a
 * follow-up visit within the tab keeps working; it is a convenience only —
 * every request is still resolved server-side, and a stale token simply
 * degrades the reader to the anonymous view rather than granting anything.
 */
const KEY = "aurixa_docs_handoff";

export function rememberHandoff(handoff: string | null): void {
  if (!handoff) return;
  try {
    sessionStorage.setItem(KEY, handoff);
  } catch {
    /* private browsing — the URL token still works for this page load */
  }
}

export function recallHandoff(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export const PLAN_LABELS: Record<string, string> = {
  launch: "Launch",
  growth: "Growth",
  scale: "Scale",
};
