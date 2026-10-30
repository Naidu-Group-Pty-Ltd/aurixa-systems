// Pulls the Mission Control public catalog and upserts it into the local
// mirror tables. Mission Control is the source of truth ("MC always wins").
// Idempotent: every synced row is stamped synced_at=now; rows not refreshed
// this run are pruned, so deactivated/removed items drop out of the storefront.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MC_URL = (Deno.env.get("MISSION_CONTROL_URL") ??
  "https://mission-control.aurixasystems.com.au").replace(/\/+$/, "");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// NOT-NULL jsonb columns: coalesce missing/null values to their empty default
// (e.g. most of Mission Control's add-on rows carry no metadata field; the
// ones it states a fact about — `included_with_aml`, `price_undecided` — do).
const JSONB_DEFAULT: Record<string, unknown> = {
  metadata: {},
  deliverables: [],
  included_in_plans: [],
  permissions: [],
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function pick(row: Record<string, unknown>, keys: string[], now: string) {
  const out: Record<string, unknown> = { synced_at: now };
  for (const k of keys) {
    let v = row[k];
    if (v === undefined || v === null) v = k in JSONB_DEFAULT ? JSONB_DEFAULT[k] : null;
    out[k] = v;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const now = new Date().toISOString();
  const db = admin();
  try {
    const res = await fetch(`${MC_URL}/api/public/storefront/catalog`, {
      headers: { accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      throw new Error(String(body?.error ?? `mc_catalog_${res.status}`));
    }

    const tasks: Array<[string, unknown, string[]]> = [
      ["catalog_plans", body.plans, ["id","slug","name","description","price_cents","currency","seat_limit","device_limit_per_seat","overage_policy","is_default","metadata"]],
      ["catalog_packs", body.packs, ["id","slug","name","tokens","price_cents","currency","expires_after_days","metadata"]],
      ["catalog_setups", body.setups, ["id","slug","name","description","price_min_cents","price_max_cents","currency","deliverables","metadata"]],
      ["catalog_addons", body.addons, ["id","slug","name","description","price_min_cents","price_max_cents","currency","billing_period","category","included_in_plans","metadata"]],
      ["catalog_roles", body.roles, ["id","slug","name","description","price_min_cents","price_max_cents","currency","permissions","metadata"]],
      ["catalog_reports", body.reports, ["id","slug","name","category","description","credit_cost","metadata"]],
    ];

    const counts: Record<string, number> = {};
    for (const [table, rowsRaw, keys] of tasks) {
      const rows = Array.isArray(rowsRaw) ? rowsRaw as Record<string, unknown>[] : [];
      const mapped = rows.map((r) => pick(r, keys, now)).filter((r) => r.id);
      if (mapped.length) {
        const { error } = await db.from(table).upsert(mapped, { onConflict: "id" });
        if (error) throw new Error(`${table}: ${error.message}`);
      }
      // Prune anything not refreshed this run (deactivated/removed upstream).
      await db.from(table).delete().lt("synced_at", now);
      counts[table] = mapped.length;
    }

    await db.from("catalog_sync_state").insert({ status: "ok", counts });
    return new Response(JSON.stringify({ ok: true, counts }), {
      status: 200,
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try { await db.from("catalog_sync_state").insert({ status: "error", error: msg }); } catch { /* ignore */ }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 502,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
