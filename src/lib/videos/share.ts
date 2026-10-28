/**
 * Share links for a briefing.
 *
 * The Briefing Room exists so Aurixa's videos travel under Aurixa's own
 * domain. When they travel, Mission Control needs to know where from: its
 * lead classifier (`leadChannel.pure.ts` in the Mission Control repository)
 * reads `utm_source` and `utm_medium` off the landing page a waitlist lead
 * arrived on, so each share target below carries the tags that classifier
 * already understands. `src/lib/attribution.ts` keeps them for the session,
 * and the Briefing Room records them on arrival, so a viewer who watches first
 * and applies later is still credited to the channel that sent them.
 *
 * The tags, and what Mission Control makes of them:
 *
 *   linkedin  utm_source=linkedin  → LinkedIn
 *   facebook  utm_source=facebook  → Meta (Facebook & Instagram)
 *   email     utm_source=email     → Email
 *   x         utm_source=x         → Other (named, rather than left Unknown)
 *   whatsapp  utm_source=whatsapp  → Other
 *
 * A copied link is deliberately left clean: it is pasted somewhere we cannot
 * name, and a made-up source would be a guess dressed as evidence.
 */

import { absoluteUrl } from "../routeMetadata";

export type ShareChannel = "linkedin" | "x" | "facebook" | "whatsapp" | "email";

export const SHARE_CHANNELS: { channel: ShareChannel; label: string }[] = [
  { channel: "linkedin", label: "LinkedIn" },
  { channel: "x", label: "X" },
  { channel: "facebook", label: "Facebook" },
  { channel: "whatsapp", label: "WhatsApp" },
  { channel: "email", label: "Email" },
];

const UTM: Record<ShareChannel, { source: string; medium: string }> = {
  linkedin: { source: "linkedin", medium: "social" },
  x: { source: "x", medium: "social" },
  facebook: { source: "facebook", medium: "social" },
  whatsapp: { source: "whatsapp", medium: "social" },
  email: { source: "email", medium: "email" },
};

/** Campaign name every Briefing Room share carries; `utm_content` names the video. */
export const SHARE_CAMPAIGN = "briefing-room";

/** The canonical page URL, untagged — what "Copy link" puts on the clipboard. */
export function canonicalShareUrl(path: string): string {
  return absoluteUrl(path);
}

/** The page URL tagged for one share channel. */
export function taggedShareUrl(path: string, channel: ShareChannel, content: string): string {
  const url = new URL(absoluteUrl(path));
  url.searchParams.set("utm_source", UTM[channel].source);
  url.searchParams.set("utm_medium", UTM[channel].medium);
  url.searchParams.set("utm_campaign", SHARE_CAMPAIGN);
  url.searchParams.set("utm_content", content);
  return url.toString();
}

/** The address that opens each platform's own share dialog, pre-filled. */
export function shareIntentUrl(
  channel: ShareChannel,
  { path, title, content }: { path: string; title: string; content: string },
): string {
  const link = taggedShareUrl(path, channel, content);
  const text = `${title} | Aurixa Systems`;
  const q = encodeURIComponent;
  switch (channel) {
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${q(link)}`;
    case "x":
      return `https://x.com/intent/post?text=${q(text)}&url=${q(link)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${q(link)}`;
    case "whatsapp":
      return `https://wa.me/?text=${q(`${text} ${link}`)}`;
    case "email":
      return `mailto:?subject=${q(text)}&body=${q(`I thought this was worth a look:\n\n${title}\n${link}`)}`;
  }
}
