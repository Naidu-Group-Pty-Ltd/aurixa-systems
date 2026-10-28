// POST /briefing-upload-sign — signed upload URLs for one Briefing Room video,
// on the say-so of Mission Control.
//
// Mission Control is where a video listing is written (Website → Videos), but
// the video lives here, in the public `marketing-media` bucket, and Mission
// Control holds no key to this project. So an upload is a grant: Mission
// Control mints a single-use token for one listing's next version folder
// (videos/<slug>/v<n>/) and the files it will hold, and the operator's browser
// brings that token here. This function asks Mission Control whether the token
// is live and covers these paths, and only then signs them — create-only, so
// nothing already published can be replaced — for the browser to upload to
// directly. No secret is shared between the two systems: possession of the
// token is the authority, exactly as a storefront handoff is.
//
// Body: { token: string, paths: string[] }   (paths relative to the version folder)
// 200:  { ok: true, prefix, uploads: [{ path, url } | { path, exists: true }] }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, MC_URL, json } from "../_shared/mc.ts";

const BUCKET = "marketing-media";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** What `npm run video:encode` writes: files at the root or one rendition folder deep. */
const RELATIVE_PATH = /^(?:[a-z0-9][a-z0-9-]*\/)?[a-z0-9][a-z0-9.-]*\.(?:m3u8|m4s|mp4|jpg|jpeg|webp|vtt)$/;
/** The only folder shape a grant may name. */
const PREFIX = /^videos\/[a-z0-9]+(?:-[a-z0-9]+)*\/v\d+\/$/;
const MAX_PATHS = 200;
const SIGN_CONCURRENCY = 16;

type Signed = { path: string; url: string } | { path: string; exists: true } | { path: string; error: string };

async function sign(prefix: string, path: string): Promise<Signed> {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${prefix}${path}`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    },
  );
  const body = await response.json().catch(() => ({}));
  if (response.ok && typeof body?.url === "string") {
    return { path, url: `${SUPABASE_URL}/storage/v1${body.url}` };
  }
  // Signing refuses a path that already holds an object. That is a file a
  // previous attempt already uploaded, and the browser skips it.
  const said = `${body?.error ?? ""} ${body?.message ?? ""}`;
  if (/already exists|duplicate/i.test(said)) return { path, exists: true };
  return { path, error: `HTTP ${response.status}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: "not_configured" }, 503);

  let token: unknown;
  let paths: unknown;
  try {
    ({ token, paths } = await req.json());
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    return json({ ok: false, error: "bad_token" }, 400);
  }
  if (
    !Array.isArray(paths) ||
    paths.length === 0 ||
    paths.length > MAX_PATHS ||
    !paths.every((p) => typeof p === "string" && RELATIVE_PATH.test(p))
  ) {
    return json({ ok: false, error: "bad_paths" }, 400);
  }

  // Mission Control decides whether the token is live and covers these paths.
  let grant: { ok?: boolean; prefix?: string; error?: string } = {};
  try {
    const response = await fetch(`${MC_URL}/api/public/storefront/briefing-upload-grant`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ token, paths }),
    });
    grant = await response.json().catch(() => ({}));
    if (!response.ok || grant.ok !== true) {
      return json({ ok: false, error: grant.error ?? "grant_refused" }, response.status === 429 ? 429 : 403);
    }
  } catch {
    return json({ ok: false, error: "mission_control_unreachable" }, 502);
  }
  const prefix = grant.prefix ?? "";
  if (!PREFIX.test(prefix)) return json({ ok: false, error: "grant_refused" }, 403);

  const uploads: Signed[] = [];
  for (let i = 0; i < paths.length; i += SIGN_CONCURRENCY) {
    uploads.push(...(await Promise.all((paths as string[]).slice(i, i + SIGN_CONCURRENCY).map((p) => sign(prefix, p)))));
  }
  return json({ ok: true, prefix, uploads });
});
