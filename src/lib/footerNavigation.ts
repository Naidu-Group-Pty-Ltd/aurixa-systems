/**
 * Scrolling for navigations that start in the site footer.
 *
 * The site uses a declarative `<BrowserRouter>`, which never scrolls to a
 * `#fragment`: React Router only does that inside a data router's
 * `<ScrollRestoration>`. `ScrollToTop` owns route-change scrolling for every
 * page and deliberately leaves fragment URLs alone, so on its own a footer
 * link to `/platform#serviceability` lands wherever the previous page happened
 * to be scrolled, and a footer link to the page already open does nothing.
 *
 * The fix is scoped to the footer rather than changed for the whole site.
 * Every footer link stamps its navigation with `FOOTER_NAVIGATION_STATE`, and
 * the footer acts only on PUSH and REPLACE navigations carrying that stamp.
 * POP (Back, Forward, a first load, a refresh) stays with the browser's own
 * scroll restoration, and links anywhere else on the site behave as before.
 *
 * Kept free of React and the DOM so the decision can be tested on its own.
 */

/** Namespaced so it cannot be mistaken for any other history state. */
export const FOOTER_NAVIGATION_STATE = { aurixaNavigationSource: "footer" } as const;

export function isFooterNavigationState(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    (state as Record<string, unknown>).aurixaNavigationSource === FOOTER_NAVIGATION_STATE.aurixaNavigationSource
  );
}

export type FooterScrollAction =
  | { kind: "ignore" }
  | { kind: "section"; id: string }
  | { kind: "top" };

/**
 * What the footer should do after a navigation lands.
 *
 * `navigationType` is React Router's `useNavigationType()`. A fragment that
 * cannot be decoded falls back to the page top rather than throwing; so does a
 * fragment whose element is missing, which the caller checks against the DOM.
 */
export function resolveFooterNavigation({
  navigationType,
  state,
  hash,
}: {
  navigationType: string;
  state: unknown;
  hash: string;
}): FooterScrollAction {
  if (navigationType !== "PUSH" && navigationType !== "REPLACE") return { kind: "ignore" };
  if (!isFooterNavigationState(state)) return { kind: "ignore" };

  const fragment = hash.replace(/^#/, "");
  if (!fragment) return { kind: "top" };

  try {
    const id = decodeURIComponent(fragment);
    return id ? { kind: "section", id } : { kind: "top" };
  } catch {
    return { kind: "top" };
  }
}
