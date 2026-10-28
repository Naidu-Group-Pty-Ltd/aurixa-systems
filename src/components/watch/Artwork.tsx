type ArtworkProps = {
  src: string;
  /** The image is a vertical 9:16 frame being shown in a landscape slot. */
  portrait?: boolean;
  /**
   * Applied to a landscape image only. A portrait frame is laid out by its
   * own classes — a slot's cover-and-fill rules would undo the framing.
   */
  className?: string;
  objectPosition?: string;
  loading?: "lazy" | "eager";
};

/**
 * A poster or thumbnail in a 16:9 slot, whatever shape the video is.
 *
 * A landscape image simply covers the slot. A vertical reel cannot: cropped
 * to 16:9 it loses two-thirds of the frame, and letterboxed it floats in black
 * bars. So it stands whole in the middle of a blurred, darkened fill of
 * itself — the presentation the social platforms use for the same videos, so
 * a reel looks like a reel. Both layers are the same URL, fetched once.
 */
export function Artwork({ src, portrait = false, className, objectPosition, loading = "lazy" }: ArtworkProps) {
  if (!portrait) {
    return (
      <img
        src={src}
        alt=""
        loading={loading}
        decoding="async"
        className={className}
        style={objectPosition ? { objectPosition } : undefined}
      />
    );
  }
  return (
    <span className="watch-art" aria-hidden="true">
      <img src={src} alt="" loading={loading} decoding="async" className="watch-art__fill" />
      <img src={src} alt="" loading={loading} decoding="async" className="watch-art__frame" />
    </span>
  );
}
