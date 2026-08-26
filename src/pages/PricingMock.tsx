import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Check,
  Copy,
  Layers,
  Package,
  Puzzle,
  Search,
  Wrench,
  Zap,
} from "lucide-react";
import {
  MOCK_CATALOGUE,
  MOCK_EXCLUSIONS,
  MOCK_MODULES,
  MOCK_MODULE_GROUPS,
  MOCK_PACKS,
  MOCK_PRICE_CENTS,
  MOCK_SETUPS,
  MOCK_STRIPE_ACCOUNT,
  MOCK_TIERS,
  billingLabel,
  formatAud,
  type MockLineItem,
} from "../lib/pricing/mockCatalog";
import { useRouteMetadata } from "../lib/pageMetadata";

/**
 * /pricing-mock — the A$1 mirror of the price list, for end-to-end Stripe
 * testing driven from the prime repo.
 *
 * This is a console, not a storefront. /pricing exists to sell; this exists so
 * somebody running a test sweep can find the right checkout in one glance and
 * copy the price id straight into a request. So it shows what a pricing page
 * would never show — Stripe product and price ids, the live price beside the
 * mock one, and an explicit list of what was deliberately not minted — and it
 * leads with a warning rather than a value proposition.
 *
 * The warning is the most important element on the page and is sized
 * accordingly. These links live in the LIVE Stripe account, so a click really
 * charges a real card a real dollar. Everything about the layout is meant to
 * make that impossible to miss on the way to a button.
 *
 * Like /pricing, this page is not linked from the site's public navigation and
 * is reached by direct URL.
 */

const PANEL = "rounded-lg border border-white/10 bg-[#0B162C]/40 backdrop-blur-xl";
const EYEBROW = "font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]";

/** Copies a Stripe id and confirms it in place. */
function CopyId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_200);
    } catch {
      // A clipboard the browser refuses is not worth an error state — the id
      // is rendered in full right here and can be selected by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label}: ${value}`}
      className="group/copy inline-flex max-w-full items-center gap-1.5 rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] text-[#94A3B8] transition-colors hover:border-[#00A8B5]/40 hover:text-white"
    >
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 opacity-50 group-hover/copy:opacity-100" />
      )}
      <span className="truncate">{value}</span>
    </button>
  );
}

/** One purchasable mock: what it stands in for, and the link that charges $1. */
function MockCard({ item }: { item: MockLineItem }) {
  const included = item.includedIn ?? [];

  return (
    <div
      className={`${PANEL} group flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-[#00A8B5]/40 hover:bg-[#0B162C]/60`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-white">
            {item.name}
            {item.period && (
              <span className="ml-2 align-middle font-mono text-[9px] uppercase tracking-wider text-[#5EDDE8]">
                {item.period}
              </span>
            )}
          </h3>
          <p className="mt-1 font-mono text-[10px] text-[#94A3B8]/70">{item.slug}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-black text-[#C89B3C]">
            {formatAud(MOCK_PRICE_CENTS)}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-[#94A3B8]">
            {billingLabel(item.billing)}
          </div>
        </div>
      </div>

      {/* The real figure, kept beside the mock one. A tester reading a Stripe
          dashboard afterwards needs to know which product a $1 charge maps to. */}
      <div className="mt-4 flex items-baseline gap-2 border-t border-white/5 pt-3 text-[11px]">
        <span className={EYEBROW}>live</span>
        <span className="font-semibold text-[#94A3B8]">
          {formatAud(item.livePriceCents)} {billingLabel(item.billing)}
        </span>
      </div>

      {(item.monthlyCredits || item.credits || item.seats) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.seats && (
            <Badge>
              {item.seats[0]}–{item.seats[1]} seats
            </Badge>
          )}
          {item.monthlyCredits != null && (
            <Badge>{item.monthlyCredits.toLocaleString("en-AU")} credits/mo</Badge>
          )}
          {item.credits != null && (
            <Badge>{item.credits.toLocaleString("en-AU")} credits</Badge>
          )}
        </div>
      )}

      {included.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-[#94A3B8]">
          Bundled with{" "}
          <span className="text-[#5EDDE8]">
            {included.map((t) => t[0].toUpperCase() + t.slice(1)).join(", ")}
          </span>
          .
        </p>
      )}

      {item.note && (
        <p className="mt-3 text-[11px] leading-relaxed text-[#94A3B8]/80">{item.note}</p>
      )}

      <div className="mt-auto space-y-2 pt-4">
        <div className="flex flex-col gap-1.5">
          <CopyId label="price id" value={item.priceId} />
          <CopyId label="product id" value={item.productId} />
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-4 py-2 text-[12px] font-bold text-[#C89B3C] transition-colors hover:bg-[#C89B3C]/20"
        >
          Open $1 checkout
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm border border-white/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#94A3B8]">
      {children}
    </span>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-[#00A8B5]">{icon}</span>
        <h2 className="text-xl font-black text-white">{title}</h2>
        <span className={EYEBROW}>{count}</span>
      </div>
      {children}
    </section>
  );
}

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

export default function PricingMock() {
  useRouteMetadata("/pricing-mock");
  const [query, setQuery] = useState("");

  // Filtering is worth having at forty-one items: the common task is "find the
  // deal-pipeline link", and scrolling seven categories to do it is slower than
  // typing four letters. Matched against slug and name, which is what a tester
  // has in hand — they are reading a module slug out of a Mission Control row.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      MOCK_CATALOGUE.filter(
        (i) =>
          i.slug.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.group.toLowerCase().includes(q),
      ).map((i) => i.priceId),
    );
  }, [query]);

  const visible = (items: readonly MockLineItem[]) =>
    matches ? items.filter((i) => matches.has(i.priceId)) : [...items];

  const tiers = visible(MOCK_TIERS);
  const packs = visible(MOCK_PACKS);
  const setups = visible(MOCK_SETUPS);
  const modules = visible(MOCK_MODULES);
  const total = tiers.length + packs.length + setups.length + modules.length;

  return (
    <div className="w-full bg-[#040B16]">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className={EYEBROW}>
          <span className="mr-2 inline-block h-1 w-1 animate-pulse rounded-full bg-[#C89B3C] align-middle" />
          Aurixa · Stripe test fixtures
        </div>

        <h1 className="mt-6 text-4xl font-black leading-none text-white md:text-5xl">
          pricing<span className="text-[#94A3B8]/40">-</span>
          <span className="font-display italic text-[#5EDDE8]">mock</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#94A3B8]">
          Every tier, module, credit pack and onboarding package from the signed-off price
          list, reminted in Stripe at {formatAud(MOCK_PRICE_CENTS)} each so the checkout
          workflow can be driven end to end from the prime repo without moving real money at
          real prices. Each mock bills exactly the way the product it stands in for bills:
          plans recur, packs and onboarding are one-off, and every figure is GST-inclusive.
        </p>

        {/* The warning. Deliberately the loudest thing above the first button. */}
        <div className="mt-8 rounded-lg border border-red-500/40 bg-red-500/[0.07] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="text-sm leading-relaxed text-[#F8C9C9]">
              <p className="font-black uppercase tracking-wide text-red-300">
                These are live Stripe links. A$1.00 is charged for real.
              </p>
              <p className="mt-2 text-[#94A3B8]">
                The mocks were minted in the live Aurixa account (
                <span className="font-mono text-[11px] text-[#94A3B8]">
                  {MOCK_STRIPE_ACCOUNT}
                </span>
                ), not a sandbox, so a test card will not work and a real card will really be
                debited a dollar. Refund from the Stripe dashboard when you are done.
              </p>
              <p className="mt-2 text-[#94A3B8]">
                Nothing is provisioned by paying one. A Payment Link reaches Mission
                Control's webhook without the <code className="font-mono">mode</code> and{" "}
                <code className="font-mono">item_id</code> metadata fulfilment needs, so the
                event is recorded and stops: no plan, no credits, no module. That is also
                how the live add-on links behave.
              </p>
            </div>
          </div>
        </div>

        {/* Counts, so a tester can confirm the set is whole before starting. */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Plans" value={MOCK_TIERS.length} hint="4 tiers, 7 prices" />
          <Stat label="Modules" value={MOCK_MODULES.length} hint="incl. AML / CTF" />
          <Stat label="Credit packs" value={MOCK_PACKS.length} hint="250 → 15,000" />
          <Stat label="Onboarding" value={MOCK_SETUPS.length} hint="one-off packages" />
        </div>

        <div className="relative mt-8">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]/60" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by slug, name or category, e.g. deal-pipeline"
            aria-label="Filter the mock catalogue"
            className={`${PANEL} w-full py-3 pl-11 pr-4 text-sm text-white placeholder:text-[#94A3B8]/50 focus:border-[#00A8B5]/50 focus:outline-none`}
          />
        </div>
        {matches && (
          <p className="mt-3 text-[11px] text-[#94A3B8]">
            {total} of {MOCK_CATALOGUE.length} shown.
          </p>
        )}

        <Section icon={<Layers className="h-5 w-5" />} title="Plans" count={tiers.length}>
          <div className={GRID}>
            {tiers.map((t) => (
              <MockCard key={t.priceId} item={t} />
            ))}
          </div>
          {!matches && (
            <p className="mt-4 text-[11px] leading-relaxed text-[#94A3B8]/80">
              Monthly and annual are separate Stripe prices on one product, mirroring
              Mission Control's <code className="font-mono">seat_plans.stripe_price_id</code>{" "}
              and <code className="font-mono">metadata.annual_stripe_price_id</code>. Every
              tier's live headline already contains the AML / CTF module. That is the $195
              gap between each tier's two published figures.
            </p>
          )}
        </Section>

        <Section
          icon={<Puzzle className="h-5 w-5" />}
          title="Add-on modules"
          count={modules.length}
        >
          <div className="space-y-10">
            {MOCK_MODULE_GROUPS.map((group) => {
              const inGroup = modules.filter((m) => m.group === group);
              if (inGroup.length === 0) return null;
              return (
                <div key={group}>
                  <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[#00A8B5]">
                    {group}
                  </h3>
                  <div className={GRID}>
                    {inGroup.map((m) => (
                      <MockCard key={m.priceId} item={m} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section icon={<Zap className="h-5 w-5" />} title="Top-up credits" count={packs.length}>
          <div className={GRID}>
            {packs.map((p) => (
              <MockCard key={p.priceId} item={p} />
            ))}
          </div>
          {!matches && (
            <p className="mt-4 text-[11px] leading-relaxed text-[#94A3B8]/80">
              One-off prices, as the live packs are. Credits lapse 30 days after they are
              issued, and are spent soonest-to-expire first.
            </p>
          )}
        </Section>

        <Section
          icon={<Wrench className="h-5 w-5" />}
          title="Onboarding packages"
          count={setups.length}
        >
          <div className={GRID}>
            {setups.map((s) => (
              <MockCard key={s.priceId} item={s} />
            ))}
          </div>
        </Section>

        {/* Stated rather than left as a gap, so a missing module is never read
            as a defect in whatever is being tested. */}
        {!matches && MOCK_EXCLUSIONS.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-center gap-3">
              <Ban className="h-5 w-5 text-[#94A3B8]" />
              <h2 className="text-xl font-black text-white">Deliberately not minted</h2>
              <span className={EYEBROW}>{MOCK_EXCLUSIONS.length}</span>
            </div>
            <div className="space-y-3">
              {MOCK_EXCLUSIONS.map((ex) => (
                <div key={ex.slug} className={`${PANEL} p-5`}>
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-sm font-bold text-white">{ex.name}</h3>
                    <span className="font-mono text-[10px] text-[#94A3B8]/70">{ex.slug}</span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-[#94A3B8]">{ex.reason}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!matches && (
          <section className="mt-16">
            <div className="mb-6 flex items-center gap-3">
              <Package className="h-5 w-5 text-[#00A8B5]" />
              <h2 className="text-xl font-black text-white">Retiring these</h2>
            </div>
            <div className={`${PANEL} p-5 text-[12px] leading-relaxed text-[#94A3B8]`}>
              <p>
                Every mock product, price and payment link carries{" "}
                <code className="font-mono text-[#5EDDE8]">aurixa_mock: "true"</code>. Searching
                Stripe for{" "}
                <code className="font-mono text-[#5EDDE8]">
                  metadata['aurixa_mock']:'true'
                </code>{" "}
                returns this set and nothing else, so the whole fixture can be deactivated in
                one pass when testing finishes.
              </p>
              <p className="mt-3">
                None of them use{" "}
                <code className="font-mono">aurixa_tier</code>,{" "}
                <code className="font-mono">aurixa_module</code> or{" "}
                <code className="font-mono">aurixa_pack</code>, the keys Mission Control's
                catalogue, module and pack syncs search on, so no Apply in Mission Control
                can ever adopt a mock as the live product for a real catalogue row.
              </p>
            </div>
          </section>
        )}

        <p className="mt-16 border-t border-white/10 pt-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]/60">
          Test fixtures · not a price list · see /pricing for the real thing
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className={`${PANEL} p-4`}>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-[#5EDDE8]">{label}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#94A3B8]/70">
        {hint}
      </div>
    </div>
  );
}
