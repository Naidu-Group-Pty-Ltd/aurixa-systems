// GET /storefront-docs?h=<uuid>
//
// Serves the Command Center documentation, filtered to what the caller is
// entitled to read. This function exists so the filtering happens on a server:
// the corpus lives under supabase/functions/ and is never bundled into the
// site, so a locked section's body is not merely hidden in the browser — it is
// never sent.
//
// Entitlement comes from the handoff token the dashboard minted, resolved
// server-to-server against Mission Control. The token is the credential; a
// caller cannot assert a plan by editing the URL, because the plan is never
// read from the request.
//
// No token is a valid request. It returns the universal sections in full and
// every priced section locked to title and summary, which is exactly what an
// anonymous visitor to the marketing site should see.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, json, MC_URL } from "../_shared/mc.ts";
import { ANONYMOUS, DOCS_GROUPS, deliverFor, type Viewer } from "../_shared/docsCorpus.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type HandoffResponse = {
  ok?: boolean;
  current_plan_slug?: string | null;
  addon_slugs?: string[] | null;
  /** The workspace agreement's exclusions; null when Mission Control could not read them. */
  excluded_slugs?: string[] | null;
  clone_name?: string | null;
};

/**
 * Resolve a handoff into a viewer.
 *
 * Any failure — malformed token, expired handoff, Mission Control unreachable —
 * degrades to the anonymous viewer rather than erroring. The page still renders
 * with the public sections, and the customer sees a "couldn't confirm your
 * plan" prompt instead of a broken page. Degrading to anonymous is the safe
 * direction here: it shows less, never more.
 */
async function resolveViewer(handoff: string | null): Promise<Viewer> {
  if (!handoff || !UUID.test(handoff)) return ANONYMOUS;
  try {
    const res = await fetch(
      `${MC_URL}/api/public/storefront/handoff?h=${encodeURIComponent(handoff)}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return ANONYMOUS;
    const body = (await res.json()) as HandoffResponse;
    if (!body?.ok) return ANONYMOUS;
    return {
      planSlug: body.current_plan_slug ?? null,
      addonSlugs: Array.isArray(body.addon_slugs) ? body.addon_slugs : [],
      excludedSlugs: Array.isArray(body.excluded_slugs) ? body.excluded_slugs : [],
      identified: true,
    };
  } catch {
    return ANONYMOUS;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const viewer = await resolveViewer(url.searchParams.get("h"));
  const sections = deliverFor(viewer);

  const readable = sections.filter((s) => !s.locked).length;

  return new Response(
    JSON.stringify({
      ok: true,
      viewer: {
        identified: viewer.identified,
        plan_slug: viewer.planSlug,
        addon_slugs: viewer.addonSlugs,
        excluded_slugs: viewer.excludedSlugs,
      },
      groups: DOCS_GROUPS,
      sections,
      counts: { total: sections.length, readable, locked: sections.length - readable },
    }),
    {
      headers: {
        ...CORS,
        "content-type": "application/json",
        // Entitlement-dependent: a shared cache must never hand one workspace's
        // payload to another. Anonymous responses are identical for everyone but
        // are not worth special-casing for the risk it would introduce.
        "cache-control": "private, no-store",
      },
    },
  );
});
