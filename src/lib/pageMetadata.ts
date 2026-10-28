import { useEffect } from "react";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
  ogImageUrl,
  routeMetadata,
  type RouteMetadata,
} from "./routeMetadata";

/**
 * One implementation of "this page has its own title, description and social
 * card", replacing three near-identical hand-rolled effects that had drifted
 * apart (`LegalDocumentLayout`, `Questionnaire`, `ScheduleStrategicReview`).
 *
 * Two things here are not obvious and are the reason this is centralised:
 *
 * 1. **Cleanup is keyed on identity, not on order.** The naive version each of
 *    the three used — snapshot the old title, restore it on unmount — assumes
 *    the outgoing route's cleanup runs before the incoming route's effect. That
 *    is the usual order, but it is not guaranteed under StrictMode's double
 *    invocation or a concurrent transition, and when it inverts the outgoing
 *    page overwrites the title the incoming page just set. So every restore
 *    below first checks that the value still in the DOM is the one this hook
 *    wrote. If somebody else has moved on, we leave it alone.
 *
 * 2. **We only ever remove tags we created.** Managed elements are stamped with
 *    `data-page-meta`. The base `og:*` and description tags in `index.html` are
 *    updated in place and restored to their original content, never removed —
 *    otherwise the first client-side navigation would strip the document of the
 *    defaults that every subsequent page falls back to.
 */

export type PageMetadata = {
  title: string;
  description: string;
  /** Route path used for the canonical URL. Query strings are deliberately dropped. */
  canonicalPath: string;
  /** e.g. `"noindex, nofollow"`. Omitted entirely on indexable pages. */
  robots?: string;
  /**
   * Absolute path under `public/`, or an absolute `https:` URL for a card held
   * in media storage. Defaults to the sitewide card.
   */
  ogImage?: string;
  ogType?: string;
};

/** A single tag this hook took responsibility for, and how to put it back. */
type ManagedTag = {
  element: HTMLElement;
  attribute: "content" | "href";
  /** What we wrote. Cleanup is a no-op unless this is still the current value. */
  wrote: string;
  /** `undefined` means the element did not exist before us and should be removed. */
  prior: string | undefined;
};

function upsert(
  selector: string,
  create: () => HTMLElement,
  attribute: "content" | "href",
  value: string,
): ManagedTag {
  const existing = document.head.querySelector<HTMLElement>(selector);
  const prior = existing?.getAttribute(attribute) ?? undefined;
  const element = existing ?? document.head.appendChild(create());
  if (!existing) element.setAttribute("data-page-meta", "");
  element.setAttribute(attribute, value);
  return { element, attribute, wrote: value, prior };
}

function meta(name: string, value: string): ManagedTag {
  return upsert(
    `meta[name="${name}"]`,
    () => {
      const el = document.createElement("meta");
      el.setAttribute("name", name);
      return el;
    },
    "content",
    value,
  );
}

function property(prop: string, value: string): ManagedTag {
  return upsert(
    `meta[property="${prop}"]`,
    () => {
      const el = document.createElement("meta");
      el.setAttribute("property", prop);
      return el;
    },
    "content",
    value,
  );
}

function canonicalLink(href: string): ManagedTag {
  return upsert(
    'link[rel="canonical"]',
    () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    },
    "href",
    href,
  );
}

function revert(tag: ManagedTag): void {
  // Somebody else owns this value now — most likely the page we navigated to.
  if (tag.element.getAttribute(tag.attribute) !== tag.wrote) return;
  if (tag.prior === undefined) tag.element.remove();
  else tag.element.setAttribute(tag.attribute, tag.prior);
}

/**
 * Apply page metadata for as long as the calling component is mounted.
 *
 * Intended to be reached through {@link useRouteMetadata} for anything in the
 * route registry; call this directly only where the values are not a fixed
 * property of the path (the legal layout, the 404 page).
 */
export function usePageMetadata({
  title,
  description,
  canonicalPath,
  robots,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
}: PageMetadata): void {
  useEffect(() => {
    const priorTitle = document.title;
    document.title = title;

    const url = absoluteUrl(canonicalPath);
    const image = ogImageUrl(ogImage);

    const managed: ManagedTag[] = [
      meta("description", description),
      canonicalLink(url),
      property("og:title", title),
      property("og:description", description),
      property("og:url", url),
      property("og:image", image),
      property("og:type", ogType),
      property("og:site_name", SITE_NAME),
      meta("twitter:title", title),
      meta("twitter:description", description),
      meta("twitter:image", image),
    ];

    // Only present on pages that must not be indexed, so that an indexable page
    // never carries an empty or stale directive.
    if (robots) managed.push(meta("robots", robots));

    return () => {
      if (document.title === title) document.title = priorTitle;
      // Reverse order so that, if two tags somehow alias, the first write wins
      // back its original — same reasoning as unwinding a stack.
      for (let i = managed.length - 1; i >= 0; i -= 1) revert(managed[i]);
    };
  }, [title, description, canonicalPath, robots, ogImage, ogType]);
}

/**
 * Apply the metadata registered for a route in `routeMetadata.ts`.
 *
 * `indexable: false` is what produces the `noindex, nofollow` directive, so a
 * page cannot be listed in the sitemap and simultaneously ask not to be indexed
 * — the two answers come from the same field.
 */
export function useRouteMetadata(path: string): void {
  const entry: RouteMetadata | undefined = routeMetadata(path);
  if (!entry && import.meta.env.DEV) {
    // Loud in development, silent in production: a missing entry means the
    // sitemap and the X-Robots-Tag list do not know about this route either.
    console.warn(`[pageMetadata] no route metadata registered for "${path}"`);
  }
  usePageMetadata({
    title: entry?.title ?? SITE_NAME,
    description: entry?.description ?? "",
    canonicalPath: entry?.path ?? path,
    robots: entry && !entry.indexable ? "noindex, nofollow" : undefined,
    ogImage: entry?.ogImage,
    ogType: entry?.ogType,
  });
}
