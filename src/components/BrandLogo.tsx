import { Link } from "react-router-dom";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  compact?: boolean;
  /**
   * The header mark is the first thing painted and must not arrive late; the
   * footer mark is well below the fold on every page. Callers say which.
   */
  priority?: boolean;
  /**
   * Router state for the link. Only the footer passes one, to mark its own
   * navigations (see src/lib/footerNavigation.ts); the header mark leaves it
   * unset and behaves exactly as before.
   */
  state?: unknown;
}

export function BrandLogo({ className, imageClassName, compact = false, priority = false, state }: BrandLogoProps) {
  return (
    <Link
      to="/"
      state={state}
      aria-label="Aurixa Systems home"
      className={[
        "block",
        // The compact height tracks the header, which shrinks on short
        // landscape viewports. See --brand-logo-height in index.css.
        compact
          ? "h-[var(--brand-logo-height,5.5rem)] w-[340px] sm:w-[430px] lg:w-[480px]"
          : "h-28 w-[430px] sm:w-[560px]",
        className
      ].filter(Boolean).join(" ")}
    >
      {/* 720x228 WebP with alpha, built by scripts/build-share-assets.py. This
          was the 401 KB build source served straight to browsers — in the
          header and the footer, on every page — to paint a mark that never
          renders wider than 354 CSS px. The source now lives outside public/
          and is not deployed at all. */}
      <img
        src="/brand/aurixa-lockup.webp"
        alt="Aurixa Systems"
        width={compact ? 480 : 560}
        height={compact ? 160 : 187}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        className={["h-full w-full object-contain", imageClassName].filter(Boolean).join(" ")}
      />
    </Link>
  );
}
