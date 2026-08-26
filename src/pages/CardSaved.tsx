import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CreditCard, Loader2, AlertTriangle } from "lucide-react";
import { fetchWalletStatus, type WalletStatus } from "../lib/billing";
import { useRouteMetadata } from "../lib/pageMetadata";

const POLL_INTERVAL_MS = 2_500;
const POLL_MAX_MS = 60_000;

const ROLE_LABEL: Record<number, string> = {
  1: "Primary card",
  2: "Secondary card",
  3: "Backup card",
};

/**
 * /pricing/card-saved — post-Stripe receipt for the wallet (save-card) flow.
 * Authorised by the (session_id, credential) pair Stripe put in the redirect
 * URL; polls until the webhook has persisted the card reference, then shows
 * the saved card (brand + last4 only — full details never leave Stripe).
 */
export default function CardSaved() {
  useRouteMetadata("/pricing/card-saved");
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const h = params.get("h");
  const uid = params.get("uid");
  const credential = h ? { h } : uid ? { uid } : null;

  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!sessionId || !credential) return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const s = await fetchWalletStatus(sessionId, credential);
        if (cancelled) return;
        setStatus(s);
        if (!s.saved && Date.now() - startedAt.current < POLL_MAX_MS) {
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

  const timedOut = !!status && !status.saved && Date.now() - startedAt.current >= POLL_MAX_MS;

  return (
    <div className="w-full pt-[100px]">
      <div className="mx-auto max-w-xl px-4 py-16 md:px-6">
        <div className="rounded-lg border border-emerald-500/30 bg-[#0B162C] p-8">
          <div className="flex items-center gap-3">
            {status?.saved ? (
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            ) : (
              <CreditCard className="h-9 w-9 text-[#00A8B5]" />
            )}
            <div>
              <h1 className="text-2xl font-black text-white">
                {status?.saved ? "Card saved" : "Saving your card…"}
              </h1>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                Secure wallet · powered by Stripe
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            {status?.saved && (
              <>
                <Row label="Card">
                  <span className="capitalize">
                    {status.brand ?? "Card"} •••• {status.last4 ?? "????"}
                  </span>
                </Row>
                {status.priority != null && (
                  <Row label="Role">{ROLE_LABEL[status.priority] ?? `Slot ${status.priority}`}</Row>
                )}
              </>
            )}

            {!error && status && !status.saved && !timedOut && (
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#040B16] px-3 py-2 text-xs text-[#94A3B8]">
                <Loader2 className="h-4 w-4 animate-spin" /> Confirming with Stripe…
              </div>
            )}
            {status?.saved && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> This card is now available on your
                workspace's Billing &amp; Usage page. Only the brand, last four digits and expiry
                are stored. The card itself stays with Stripe.
              </div>
            )}
            {(timedOut || error) && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error
                  ? "We couldn't confirm the save just yet. If you completed the Stripe form, the card will appear on your billing page shortly."
                  : "Still confirming. If you completed the Stripe form, the card will appear on your billing page shortly."}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {status?.returnUrl && (
              <a
                href={status.returnUrl}
                className="rounded-sm bg-[#00A8B5] px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-transform hover:scale-105"
              >
                Return to your dashboard
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
