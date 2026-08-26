import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { fetchSessionReceipt, formatMoney, type SessionReceipt } from "../lib/billing";
import { useRouteMetadata } from "../lib/pageMetadata";

const POLL_INTERVAL_MS = 2_500;
const POLL_MAX_MS = 60_000;

const MODE_LABEL: Record<string, string> = {
  topup: "Token top-up",
  seat_plan: "Seat plan",
  setup_package: "Setup package",
};

/**
 * /pricing/success — post-Stripe receipt (user-attributed pricing workflow,
 * Revision 2). Authorised by the (session_id, h) pair Stripe put in the
 * redirect URL; polls fulfilment until credits/seats/setup are live and
 * offers the validated way back into the purchaser's command center.
 */
export default function PricingSuccess() {
  useRouteMetadata("/pricing/success");
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const h = params.get("h");
  const uid = params.get("uid");
  const credential = h ? { h } : uid ? { uid } : null;

  const [receipt, setReceipt] = useState<SessionReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!sessionId || !credential) return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const r = await fetchSessionReceipt(sessionId, credential);
        if (cancelled) return;
        setReceipt(r);
        if (!r.fulfilled && !r.webhookError && Date.now() - startedAt.current < POLL_MAX_MS) {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lookup failed");
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
    // credential is derived from these two primitives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, h, uid]);

  const timedOut =
    !!receipt && !receipt.fulfilled && !receipt.webhookError &&
    Date.now() - startedAt.current >= POLL_MAX_MS;

  return (
    <div className="w-full pt-[100px]">
      <div className="mx-auto max-w-xl px-4 py-16 md:px-6">
        <div className="rounded-lg border border-emerald-500/30 bg-[#0B162C] p-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-black text-white">Payment received</h1>
              {receipt?.mode && (
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                  {MODE_LABEL[receipt.mode] ?? receipt.mode}
                  {receipt.amountTotal != null &&
                    ` · ${formatMoney(receipt.amountTotal, receipt.currency ?? "AUD")}`}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            {receipt?.cloneName && (
              <Row label="Billed to">{receipt.cloneName}</Row>
            )}
            {receipt?.originUsername && (
              <Row label="Purchased by">{receipt.originUsername}</Row>
            )}
            {receipt?.itemSlug && (
              <Row label="Item">
                <span className="font-mono">{receipt.itemSlug}</span>
              </Row>
            )}

            {!error && receipt && !receipt.fulfilled && !receipt.webhookError && !timedOut && (
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#040B16] px-3 py-2 text-xs text-[#94A3B8]">
                <Loader2 className="h-4 w-4 animate-spin" /> Finalising your purchase…
              </div>
            )}
            {receipt?.fulfilled && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Fulfilment complete: credits / seats / setup
                are live in your workspace.
              </div>
            )}
            {(receipt?.webhookError || timedOut || error) && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error
                  ? "We couldn't load this receipt, but your payment is safe. Check your dashboard in a minute."
                  : "Still finalising. Your payment is safe. It will appear in your dashboard shortly."}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {receipt?.returnUrl && (
              <a
                href={receipt.returnUrl}
                className="rounded-sm bg-[#00A8B5] px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-transform hover:scale-105"
              >
                Return to {receipt.cloneName ?? "your dashboard"}
              </a>
            )}
            <Link
              to="/pricing"
              className="rounded-sm border border-[#00A8B5]/40 px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:border-[#00A8B5]"
            >
              Back to pricing
            </Link>
          </div>

          {sessionId && (
            <p className="mt-6 break-all font-mono text-[10px] text-[#94A3B8]/60">
              Session: {sessionId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-md border border-white/10 bg-[#040B16] px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
        {label}
      </span>
      <span className="text-right text-white">{children}</span>
    </div>
  );
}
