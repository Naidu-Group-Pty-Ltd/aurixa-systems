import { Link, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { useRouteMetadata } from "../lib/pageMetadata";

/**
 * /pricing/cancel — checkout abandoned (user-attributed pricing workflow,
 * Revision 2). The handoff token was single-use and is consumed by now, so
 * the way to retry is back through the command center's purchase CTA.
 */
export default function PricingCancel() {
  useRouteMetadata("/pricing/cancel");
  const [params] = useSearchParams();
  const h = params.get("h");
  const uid = params.get("uid");
  // A uid link is stable and reusable, so we can send the buyer straight back
  // into their pricing page to retry. A handoff is single-use and already
  // spent, so retry means a fresh link from the dashboard.
  const backToPricing = uid ? `/pricing?uid=${encodeURIComponent(uid)}` : "/pricing";

  return (
    <div className="w-full pt-[100px]">
      <div className="mx-auto max-w-xl px-4 py-16 md:px-6">
        <div className="rounded-lg border border-white/10 bg-[#0B162C] p-8">
          <div className="flex items-center gap-3">
            <XCircle className="h-9 w-9 text-[#94A3B8]" />
            <h1 className="text-2xl font-black text-white">Checkout canceled</h1>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
            No charge was made.{" "}
            {uid
              ? "Your checkout link is still valid. Head back to pricing to pick it up again."
              : h
                ? "To pick the purchase back up, head back to your dashboard and start it again. That refreshes your secure checkout link."
                : "You can come back to pricing any time."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={backToPricing}
              className="rounded-sm bg-[#00A8B5] px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-transform hover:scale-105"
            >
              Back to pricing
            </Link>
            <Link
              to="/contact"
              className="rounded-sm border border-[#00A8B5]/40 px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:border-[#00A8B5]"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
