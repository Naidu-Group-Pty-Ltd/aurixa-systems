import { Link } from "react-router-dom";
import { ArrowRight, Check, Play } from "lucide-react";
import { Artwork } from "./Artwork";
import {
  SERIES_LABELS,
  briefingPath,
  formatDuration,
  isPortrait,
  isPublished,
  mediaUrl,
  spokenDuration,
  type Briefing,
} from "../../lib/videos/catalog";

type BriefingCardProps = {
  briefing: Briefing;
  code: string;
  /** This is the briefing in the theatre right now. */
  current?: boolean;
  /** 0–1 of the running time this viewer has watched, read from their device. */
  watched?: number;
};

/**
 * One library entry. A watchable briefing is a link to its own page; a
 * premiere is an article with no link at all, because there is no page to go
 * to yet and a link to a 404 is worse than none.
 */
export function BriefingCard({ briefing, code, current = false, watched = 0 }: BriefingCardProps) {
  const published = isPublished(briefing);
  const poster = mediaUrl(briefing.media?.poster);
  const complete = watched >= 1;

  const thumbnail = (
    <div className="watch-card__thumb">
      <Artwork
        src={poster ?? briefing.artwork}
        portrait={Boolean(poster) && isPortrait(briefing)}
        className={`watch-card__image${poster ? "" : " watch-card__image--artwork"}`}
        objectPosition={poster ? "center" : briefing.artworkPosition ?? "center"}
      />
      <div className="watch-card__tint" aria-hidden="true" />
      <div className="watch-card__wash" aria-hidden="true" />

      <span className="watch-card__code watch-mono">{code}</span>
      {published ? (
        <span className="watch-card__duration watch-mono">
          <span className="sr-only">Running time </span>
          {formatDuration(briefing.durationSeconds)}
        </span>
      ) : (
        <span className="watch-card__duration watch-card__duration--soon watch-mono">Premiering</span>
      )}

      {current ? (
        <span className="watch-card__now watch-mono">
          <span className="watch-eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Now playing
        </span>
      ) : (
        published && (
          <span className="watch-card__glyph" aria-hidden="true">
            <Play style={{ stroke: "url(#icon-gold-gradient)", fill: "url(#icon-gold-gradient)", strokeWidth: 1.5 }} />
          </span>
        )
      )}

      {published && watched > 0 && (
        <span className="watch-card__progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.min(1, watched)})` }} />
        </span>
      )}
    </div>
  );

  const body = (
    <div className="watch-card__body">
      <p className="watch-card__series watch-mono">{SERIES_LABELS[briefing.series]}</p>
      <h3 className="watch-card__title">{briefing.title}</h3>
      <p className="watch-card__kicker">{briefing.kicker}</p>
      <p className="watch-card__cta watch-mono">
        {published ? (
          complete ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Watched · play again
            </>
          ) : watched > 0 ? (
            <>
              Continue watching <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              Watch the briefing <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )
        ) : (
          "Premiering soon"
        )}
      </p>
      <span className="watch-card__rule" aria-hidden="true">
        <span />
      </span>
    </div>
  );

  if (!published) {
    return (
      <article className="watch-card watch-card--premiere" aria-label={`${briefing.title}, premiering soon`}>
        {thumbnail}
        {body}
      </article>
    );
  }

  return (
    <Link
      to={briefingPath(briefing.slug)}
      className={`watch-card${current ? " watch-card--current" : ""}`}
      aria-current={current ? "page" : undefined}
      aria-label={`${briefing.title}, ${spokenDuration(briefing.durationSeconds)}${complete ? ", watched" : ""}`}
    >
      {thumbnail}
      {body}
    </Link>
  );
}
