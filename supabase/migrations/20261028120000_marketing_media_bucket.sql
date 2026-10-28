-- The Briefing Room's media bucket: the storage half of Aurixa's own video
-- channel at /watch. See docs/video-briefings.md.
--
-- Public for reading, because a video page must stream to anyone who opens
-- it: every object is served from
--   /storage/v1/object/public/marketing-media/videos/<slug>/<version>/…
-- with the CORS headers the player, the sidecar captions and the social-card
-- scrapers need.
--
-- Not public for writing. storage.objects carries row level security and this
-- migration adds no policy, so the only writer is the service role, which is
-- what scripts/video/upload.sh authenticates as. Nothing in the browser can
-- upload, overwrite or delete a briefing.
--
-- The allow-list is exactly what scripts/video/encode.mjs emits, as upload.sh
-- labels it. The size cap covers the largest single file — the progressive
-- 720p fallback, about 12 MB a minute — for briefings up to roughly twenty
-- minutes; segments are a few megabytes at most.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-media',
  'marketing-media',
  true,
  262144000,
  array[
    'application/vnd.apple.mpegurl',
    'application/x-mpegurl',
    'video/iso.segment',
    'video/mp4',
    'video/mp2t',
    'text/vtt',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
