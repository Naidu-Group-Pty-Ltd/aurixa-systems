/**
 * The AML/CTF Compliance Passport, drawn as the bound document it is.
 *
 * This is a faithful reproduction of the front board the platform actually
 * issues — the navy leather field, the double gold frame, the engraved halo
 * behind the delta, the wordmark rhythm and the gold clasp all carry the same
 * measurements as the product's own `BookletCover`. The marketing page shows
 * the real artefact rather than an impression of one, which is the entire
 * point of putting it in the hero: a reader should recognise the cover when
 * they later see it inside the Command Centre.
 *
 * ## Why the board is scaled rather than laid out fluidly
 *
 * Every inset, rule and letterspace below is authored against a 470×648 box —
 * the design size. Letting flexbox squeeze that box is what turns 11px type
 * and a 46px clasp into something illegible inside a 210px board on a phone:
 * the text reflows, the frame rules crowd the emblem, and the composition
 * stops being the document. So the board is drawn at its design size and put
 * under one uniform `transform: scale()`, which holds every internal
 * proportion exactly as designed at any viewport.
 *
 * ## Why the slot width and the scale are one number
 *
 * They are derived together from a single unitless custom property,
 * `--passport-cover-w` (see `index.css`): the slot is
 * `calc(var(--passport-cover-w) * 1px)` and the scale is
 * `calc(var(--passport-cover-w) / 470)`. Two values that must agree must not
 * be settable in two places — a slot sized by CSS and a scale computed
 * anywhere else disagree eventually (before a layout effect, in the SSR pass
 * that prerenders this page, on a hidden tab), and a board drawn at one size
 * inside a box of another loses its clasp to `overflow: hidden`. Deriving both
 * from one property makes that impossible, and keeps JavaScript out of the
 * path entirely — which matters here because this page is prerendered.
 */

type PassportCoverProps = {
  /** Extra classes for the outer book. Sizing is done with `--passport-cover-w`. */
  className?: string;
};

export function PassportCover({ className }: PassportCoverProps) {
  return (
    <div
      className={["passport-book", className].filter(Boolean).join(" ")}
      role="img"
      aria-label="Illustration of the Aurixa Systems AML/CTF Compliance Passport: a bound navy document with the gold Aurixa emblem, wordmark and a gold clasp on its cover."
    >
      <span aria-hidden="true" className="passport-book__spine" />
      <span aria-hidden="true" className="passport-book__edge" />

      {/* The slot clips; the board inside it is drawn at design size and scaled. */}
      <span className="passport-cover-slot">
        <span aria-hidden="true" className="passport-cover-art">
          <span className="passport-cover-board">
            <span className="passport-cover__frame" />
            <span className="passport-cover__frame-inner" />

            {/* The mark is given the upper third to itself, inside its own
                engraved halo — concentric rings and radial ticks, masked to a
                ring so it reads as engraving rather than as a disc. */}
            <span className="passport-cover__crest">
              <span className="passport-cover__halo" />
              {/* The 192px symbol already shipped for this site, not the 482 KB
                  emblem the dashboard uses: it is the same mark, and the board
                  never draws it above ~110 CSS px. */}
              <img
                src="/brand/aurixa-symbol-192.webp"
                alt=""
                width={192}
                height={192}
                decoding="async"
                className="passport-cover__emblem"
              />
            </span>

            {/* Divs, not headings. The board is decoration inside a hero that
                already owns the page's h1, and a stray h2 here would put the
                document's own wordmark into the page outline. */}
            <span className="passport-cover__wordmark">Aurixa</span>
            <span className="passport-cover__systems">Systems</span>

            <span className="passport-cover__diamond">
              <span className="passport-cover__diamond-rule" />
              <span className="passport-cover__diamond-mark">◆</span>
              <span className="passport-cover__diamond-rule" />
            </span>

            <span className="passport-cover__title">
              AML/CTF
              <br />
              Compliance Passport
            </span>

            <span className="passport-cover__clasp" />
          </span>
        </span>
      </span>
    </div>
  );
}
