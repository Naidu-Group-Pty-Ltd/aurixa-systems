#!/usr/bin/env bash
#
# Publishes one encoded briefing to the `marketing-media` bucket, with cache
# headers that let the CDN and the browser do their job.
#
# Usage:
#   SUPABASE_SERVICE_ROLE_KEY=<key> npm run video:upload -- <slug> [version]
#
#   Reads   media-build/<slug>/             (written by npm run video:encode)
#   Writes  marketing-media/videos/<slug>/<version>/   (version defaults to v1)
#
# SUPABASE_URL defaults to the Aurixa Systems project; set it to publish
# elsewhere. The service-role key is read from the environment only — never
# pass it as an argument, where it would land in shell history.
#
# Carried across from the NPC Services VSL pipeline, where the deployed ladder
# served every media segment `cache-control: no-cache` — Supabase Storage's
# default — so every replay, backwards seek and repeat visit re-fetched from
# origin. Segment names are written once per encode, so they are safe to mark
# immutable.
#
# Existing objects are never overwritten. A re-run after an interrupted upload
# skips what already landed and sends the rest; a re-encode of a live video
# goes up under a new version (v2, v3 …) and the catalogue entry moves to it,
# so no viewer is ever handed half of one ladder and half of another.
#
set -euo pipefail

SLUG="${1:?usage: npm run video:upload -- <slug> [version]}"
VERSION="${2:-v1}"
BUCKET="${BUCKET:-marketing-media}"
SUPABASE_URL="${SUPABASE_URL:-https://moeyytuduycrvvncdtme.supabase.co}"
SOURCE_DIR="media-build/${SLUG}"
PREFIX="videos/${SLUG}/${VERSION}"

: "${SUPABASE_SERVICE_ROLE_KEY:?set SUPABASE_SERVICE_ROLE_KEY in the environment}"

if [[ ! "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "slug must be lowercase words joined by hyphens: $SLUG" >&2
  exit 1
fi
if [[ ! "$VERSION" =~ ^v[0-9]+$ ]]; then
  echo "version must look like v1, v2 …: $VERSION" >&2
  exit 1
fi
if [[ ! -f "${SOURCE_DIR}/master.m3u8" ]]; then
  echo "no ${SOURCE_DIR}/master.m3u8 — run npm run video:encode first" >&2
  exit 1
fi

# Segments, init fragments and images never change once published.
IMMUTABLE_CACHE="public, max-age=31536000, immutable"
# Playlists and captions may be corrected in place, so they get a short TTL and
# are revalidated rather than pinned.
REVALIDATED_CACHE="public, max-age=300, stale-while-revalidate=86400"

content_type_for() {
  case "$1" in
    *.m3u8) echo "application/vnd.apple.mpegurl" ;;
    *.m4s)  echo "video/iso.segment" ;;
    *.mp4)  echo "video/mp4" ;;
    *.ts)   echo "video/mp2t" ;;
    *.vtt)  echo "text/vtt" ;;
    *.jpg|*.jpeg) echo "image/jpeg" ;;
    *.webp) echo "image/webp" ;;
    *)      echo "application/octet-stream" ;;
  esac
}

cache_for() {
  case "$1" in
    *.m3u8|*.vtt) echo "$REVALIDATED_CACHE" ;;
    *)            echo "$IMMUTABLE_CACHE" ;;
  esac
}

uploaded=0
skipped=0
failed=0
response_body="$(mktemp)"
trap 'rm -f "$response_body"' EXIT

while IFS= read -r -d '' file; do
  # Always build the remote path with forward slashes. Packaging on Windows is
  # what produced the `v0\playlist.m3u8` references in the NPC manifest.
  relative="${file#"$SOURCE_DIR"/}"
  relative="${relative//\\//}"
  target="${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PREFIX}/${relative}"

  # Emptied first: curl leaves the file untouched when no response arrives, and
  # a body left over from an earlier "Duplicate" would read as a skip.
  : > "$response_body"
  status=$(curl -sS -o "$response_body" -w '%{http_code}' \
    -X POST "$target" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: $(content_type_for "$file")" \
    -H "Cache-Control: $(cache_for "$file")" \
    -H "x-upsert: false" \
    --data-binary "@${file}") || status="000"

  if [[ "$status" == "200" || "$status" == "201" ]]; then
    uploaded=$((uploaded + 1))
    printf '  ok   %s\n' "$relative"
  elif [[ "$status" == "400" || "$status" == "409" ]] && grep -qiE 'duplicate|already exists' "$response_body"; then
    skipped=$((skipped + 1))
    printf '  skip %s (already published)\n' "$relative"
  else
    failed=$((failed + 1))
    printf '  FAIL %s (HTTP %s)\n' "$relative" "$status"
  fi
done < <(find "$SOURCE_DIR" -type f -print0 | sort -z)

printf '\n%d uploaded, %d already there, %d failed\n' "$uploaded" "$skipped" "$failed"

if [[ "$failed" -gt 0 ]]; then
  exit 1
fi

printf '\nVerify with:\n  npm run video:verify -- %s/storage/v1/object/public/%s/%s/master.m3u8\n' \
  "$SUPABASE_URL" "$BUCKET" "$PREFIX"
