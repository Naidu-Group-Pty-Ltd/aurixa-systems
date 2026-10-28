import { useEffect, useRef, useState, type ReactElement } from "react";
import { Check, Facebook, Link2, Linkedin, Mail, MessageCircle, Share2 } from "lucide-react";
import {
  SHARE_CHANNELS,
  canonicalShareUrl,
  shareIntentUrl,
  taggedShareUrl,
  type ShareChannel,
} from "../../lib/videos/share";

/** X's mark, drawn rather than imported: the icon set carries only the old bird. */
function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.46 21H2.39l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.7H5.57l11.1 14.5Z" />
    </svg>
  );
}

const ICONS: Record<ShareChannel, (props: { className?: string }) => ReactElement> = {
  linkedin: (props) => <Linkedin {...props} aria-hidden="true" />,
  x: XMark,
  facebook: (props) => <Facebook {...props} aria-hidden="true" />,
  whatsapp: (props) => <MessageCircle {...props} aria-hidden="true" />,
  email: (props) => <Mail {...props} aria-hidden="true" />,
};

type ShareBarProps = {
  /** Route path of the page being shared. */
  path: string;
  title: string;
  /** `utm_content`: which video, or the hub. */
  content: string;
};

/**
 * Every way out of the page carries the page with it. The share targets are
 * plain links — they work without JavaScript, from the prerendered HTML — and
 * on a phone the system share sheet is offered first, because that is where
 * people actually share from.
 */
export function ShareBar({ path, title, content }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [canShareNatively, setCanShareNatively] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setCanShareNatively(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => window.clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    const url = canonicalShareUrl(path);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard permission (an insecure context, an old browser): fall
      // back to a selection the viewer can copy themselves.
      window.prompt("Copy this link", url);
      return;
    }
    setCopied(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2400);
  };

  const shareNatively = async () => {
    try {
      // The system sheet does not say which app it handed the link to, so the
      // link it shares is the clean one — there is no channel to name.
      await navigator.share({ title: `${title} | Aurixa Systems`, url: canonicalShareUrl(path) });
    } catch {
      // Dismissed, or refused. Nothing to recover.
    }
  };

  return (
    <div className="watch-share">
      <p className="watch-mono watch-share__label" id={`share-${content}`}>
        Share this briefing
      </p>
      <ul className="watch-share__list" aria-labelledby={`share-${content}`}>
        {canShareNatively && (
          <li>
            <button type="button" className="watch-share__button" onClick={shareNatively} aria-label="Share with an app on this device">
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        )}
        {SHARE_CHANNELS.map(({ channel, label }) => {
          const Icon = ICONS[channel];
          const action = channel === "email" ? "Share by email" : `Share on ${label}`;
          return (
            <li key={channel}>
              <a
                className="watch-share__button"
                href={shareIntentUrl(channel, { path, title, content })}
                target={channel === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-label={action}
                title={action}
                data-share-url={taggedShareUrl(path, channel, content)}
              >
                <Icon className="h-4 w-4" />
              </a>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            className={`watch-share__button watch-share__button--copy${copied ? " is-copied" : ""}`}
            onClick={copy}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
            <span>{copied ? "Link copied" : "Copy link"}</span>
          </button>
        </li>
      </ul>
      <p className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </p>
    </div>
  );
}
