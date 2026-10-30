// Storefront catalog, served from the local mirror (kept fresh by
// catalog-sync). Mirrors Mission Control's /api/public/storefront/catalog
// response shape.
//
// Plans and credit packs are public — they are the published price list.
// Add-on modules, onboarding packages and report economics are NOT: they are
// commercial detail, and they are only included when the caller proves they
// are entitled to see them.
//
// The check happens HERE, before the data is read, rather than in the page
// that renders it. Hiding a section in the browser is not a gate while the
// same JSON is one unauthenticated request away — and this endpoint is a
// plain public URL. Mission Control is the authority; this asks it.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { MC_URL } from "../_shared/mc.ts";

type Access = { granted: boolean; reason: string; label: string | null };

const DENIED: Access = { granted: false, reason: "no_credential", label: null };

/**
 * Ask Mission Control whether this visitor may see the restricted sections.
 *
 * Fails CLOSED on any error. The point of the gate is keeping commercial
 * detail off the open web, so an unreachable Mission Control must cost a
 * customer a section they could have seen rather than hand it to everyone.
 */
async function resolveAccess(h: string | null, uid: string | null, token: string | null): Promise<Access> {
  if (!h && !uid && !token) return DENIED;
  try {
    const res = await fetch(`${MC_URL}/api/public/storefront/access`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ h, uid, access: token }),
    });
    if (!res.ok) return DENIED;
    const body = await res.json();
    return {
      granted: body?.granted === true,
      reason: String(body?.reason ?? "no_credential"),
      label: body?.label ?? null,
    };
  } catch (e) {
    console.warn("[storefront-catalog] access check failed, denying", e);
    return DENIED;
  }
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = admin();
  const url = new URL(req.url);
  const access = await resolveAccess(
    url.searchParams.get("h"),
    url.searchParams.get("uid"),
    url.searchParams.get("access"),
  );
  try {
    const [plans, packs, setups, addons, roles, reports] = await Promise.all([
      db.from("catalog_plans").select("id,slug,name,description,price_cents,currency,seat_limit,metadata").order("price_cents", { ascending: true }),
      db.from("catalog_packs").select("id,slug,name,tokens,price_cents,currency,expires_after_days,metadata").order("tokens", { ascending: true }),
      access.granted
        ? db.from("catalog_setups").select("id,slug,name,description,price_min_cents,price_max_cents,currency,deliverables")
        : Promise.resolve({ data: [] }),
      access.granted
        // `metadata` carries what Mission Control states about a row from its
        // own catalogue: `included_with_aml` for a partner portal AML/CTF
        // brings, `price_undecided` for a module with no price yet.
        ? db.from("catalog_addons").select("id,slug,name,description,price_min_cents,price_max_cents,currency,billing_period,category,included_in_plans,metadata")
        : Promise.resolve({ data: [] }),
      access.granted
        ? db.from("catalog_roles").select("id,slug,name,description,price_min_cents,price_max_cents,currency,permissions")
        : Promise.resolve({ data: [] }),
      access.granted
        ? db.from("catalog_reports").select("id,slug,name,category,description,credit_cost")
        : Promise.resolve({ data: [] }),
    ]);
    return new Response(
      JSON.stringify({
        ok: true,
        // Tells the page WHY a section is missing, so it can show a proper
        // gate rather than an empty list that looks like a loading bug.
        access: { granted: access.granted, reason: access.reason, label: access.label },
        plans: plans.data ?? [],
        packs: packs.data ?? [],
        setups: setups.data ?? [],
        addons: addons.data ?? [],
        roles: roles.data ?? [],
        reports: reports.data ?? [],
      }),
      { headers: { ...cors, "content-type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
