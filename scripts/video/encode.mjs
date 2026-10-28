#!/usr/bin/env node
/**
 * Packages one Briefing Room video into a CMAF/HLS ladder, a progressive
 * fallback, a poster and a social card, then prints the catalogue entry that
 * publishes it.
 *
 * Usage:
 *   npm run video:encode -- <source-video> --slug <slug> [--tune animation]
 *                            [--version v1] [--jobs 2] [--preset slow]
 *                            [--poster-at 43.5] [--draft]
 *
 *   --slug     The catalogue slug (src/lib/videos/catalog.ts). Output lands in
 *              media-build/<slug>/, which `npm run video:upload` reads.
 *   --tune     x264 tune: film (default) for camera footage, animation for
 *              motion graphics and interface captures.
 *   --version  The folder the upload publishes under, videos/<slug>/<version>.
 *              Bump it to re-publish a video; never overwrite a live ladder.
 *   --jobs     Renditions encoded concurrently. `veryslow` is CPU-bound, so
 *              match this to cores rather than raising it blindly.
 *   --preset   x264 preset, `veryslow` by default. `slow` costs a few percent
 *              more bitrate at the same quality and encodes about three times
 *              faster; anything quicker than `medium` is for drafts.
 *   --poster-at
 *              Seconds into the video to take the poster and social card
 *              from. Defaults to a few seconds in; pick a frame that reads on
 *              its own, with no caption caught half-animated.
 *   --draft    `-preset veryfast`: a quick look at the cut, never a
 *              publishable encode.
 *
 * Vertical sources (9:16 reels) get a portrait ladder, a portrait poster and
 * a 1200×630 card that frames the reel over a blurred fill of itself, and the
 * catalogue snippet says `orientation: "portrait"`.
 *
 * Requires ffmpeg and ffprobe on PATH, built with libx264. Carried across from
 * the NPC Services VSL pipeline (see docs/video-briefings.md) with three
 * additions: a 1200×630 social card, a source with no audio track, and the
 * catalogue entry printed at the end.
 *
 * Output layout (all URIs in the manifests use forward slashes, always):
 *
 *   media-build/<slug>/master.m3u8
 *   media-build/<slug>/v240/playlist.m3u8, init.mp4, seg-00000.m4s ...
 *   media-build/<slug>/aud-hi/playlist.m3u8, init.mp4, seg-00000.m4s ...
 *   media-build/<slug>/fallback-720p.mp4
 *   media-build/<slug>/poster.jpg     1920×1080, the frame before playback
 *   media-build/<slug>/card.jpg       1200×630, the link-preview image
 */

import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  AUDIO_RENDITIONS,
  PRESETS,
  PROGRESSIVE_FALLBACK,
  SEGMENT_SECONDS,
  TUNES,
  renditionsFor,
  x264Params,
} from "./ladder.mjs";

function parseArgs(argv) {
  const args = {
    source: null,
    slug: null,
    out: null,
    version: "v1",
    tune: "film",
    preset: "veryslow",
    posterAt: null,
    jobs: 2,
    draft: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--slug") args.slug = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--version") args.version = argv[++i];
    else if (arg === "--tune") args.tune = argv[++i];
    else if (arg === "--jobs") args.jobs = Math.max(1, Number(argv[++i]) || 1);
    else if (arg === "--preset") args.preset = argv[++i];
    else if (arg === "--poster-at") args.posterAt = Number(argv[++i]);
    else if (arg === "--draft") args.draft = true;
    else if (!arg.startsWith("--")) args.source = arg;
  }
  return args;
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stdout.on("data", () => {});
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}\n${stderr.slice(-4000)}`));
    });
  });
}

async function probe(sourcePath) {
  const output = await new Promise((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-print_format", "json",
      "-show_streams",
      "-show_format",
      sourcePath,
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`ffprobe failed: ${stderr}`)),
    );
  });

  const parsed = JSON.parse(output);
  const video = parsed.streams.find((s) => s.codec_type === "video");
  if (!video) throw new Error("Source has no video stream");

  const [num, den] = String(video.r_frame_rate || "25/1").split("/").map(Number);
  const fps = den ? num / den : num;

  return {
    fps,
    width: Number(video.width),
    height: Number(video.height),
    duration: Number(parsed.format?.duration ?? 0),
    // Motion-graphics explainers are sometimes delivered silent, with music
    // added in the edit or not at all. A silent source gets no audio group.
    hasAudio: parsed.streams.some((s) => s.codec_type === "audio"),
  };
}

/**
 * Each rendition starts from an empty directory. ffmpeg overwrites the
 * segments it writes but never removes the ones it does not, so re-encoding a
 * shorter cut into the same folder would leave the old tail behind — counted
 * by `measureRendition` (inflating BANDWIDTH, so players under-select) and
 * published by upload.sh. Only rendition folders are cleared; captions placed
 * beside them survive.
 */
async function freshDirectory(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

/**
 * Segments must be a whole number of GOPs, and the GOP must be a whole number
 * of frames, or the rungs drift out of alignment over the runtime.
 */
function gopFrames(fps) {
  return Math.max(1, Math.round(fps * SEGMENT_SECONDS));
}

async function encodeVideoRendition(sourcePath, outDir, rendition, sourceInfo, options) {
  const dir = path.join(outDir, rendition.id);
  await freshDirectory(dir);

  const gop = gopFrames(sourceInfo.fps);
  const maxrate = `${rendition.maxrateKbps}k`;
  // Two seconds of VBV buffer. Large enough that a busy shot is not clipped,
  // small enough that the player's bandwidth estimate stays meaningful.
  const bufsize = `${rendition.maxrateKbps * 2}k`;

  await run("ffmpeg", [
    "-nostdin", "-y",
    "-i", sourcePath,

    "-an",
    "-map", "0:v:0",

    // Lanczos with accurate rounding; the default bilinear downscale is a
    // meaningful quality loss on text and fine detail — and an explainer's
    // interface captures and on-screen type are exactly that.
    "-vf",
    `scale=${rendition.width}:${rendition.height}:flags=lanczos+accurate_rnd:force_original_aspect_ratio=decrease,` +
      `pad=${rendition.width}:${rendition.height}:-1:-1:color=black,setsar=1`,

    "-c:v", "libx264",
    "-preset", options.preset,
    "-tune", options.tune,
    "-profile:v", rendition.avcProfile,
    "-level:v", rendition.avcLevel,
    "-crf", String(rendition.crf),
    "-maxrate", maxrate,
    "-bufsize", bufsize,
    "-x264-params", x264Params(gop),

    "-pix_fmt", "yuv420p",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-colorspace", "bt709",

    // Constant frame rate keeps segment durations exact across every rung.
    "-r", String(sourceInfo.fps),

    "-f", "hls",
    "-hls_time", String(SEGMENT_SECONDS),
    "-hls_playlist_type", "vod",
    "-hls_segment_type", "fmp4",
    "-hls_flags", "independent_segments",
    "-hls_fmp4_init_filename", "init.mp4",
    "-hls_segment_filename", path.join(dir, "seg-%05d.m4s"),
    "-hls_list_size", "0",
    path.join(dir, "playlist.m3u8"),
  ]);
}

async function encodeAudioRendition(sourcePath, outDir, rendition) {
  const dir = path.join(outDir, rendition.id);
  await freshDirectory(dir);

  await run("ffmpeg", [
    "-nostdin", "-y",
    "-i", sourcePath,

    "-vn",
    "-map", "0:a:0",
    "-c:a", "aac",
    "-profile:a", "aac_low",
    "-ac", String(rendition.channels),
    "-b:a", `${rendition.bitrateKbps}k`,
    "-ar", "48000",

    "-f", "hls",
    "-hls_time", String(SEGMENT_SECONDS),
    "-hls_playlist_type", "vod",
    "-hls_segment_type", "fmp4",
    "-hls_flags", "independent_segments",
    "-hls_fmp4_init_filename", "init.mp4",
    "-hls_segment_filename", path.join(dir, "seg-%05d.m4s"),
    "-hls_list_size", "0",
    path.join(dir, "playlist.m3u8"),
  ]);
}

/** The fallback's frame, in the source's orientation (720p either way). */
function fallbackFrame(sourceInfo) {
  const { width, height } = PROGRESSIVE_FALLBACK;
  return isPortrait(sourceInfo) ? [height, width] : [width, height];
}

async function encodeProgressiveFallback(sourcePath, outDir, sourceInfo, options) {
  const target = path.join(outDir, `${PROGRESSIVE_FALLBACK.id}.mp4`);
  const gop = gopFrames(sourceInfo.fps);
  const [w, h] = fallbackFrame(sourceInfo);

  await run("ffmpeg", [
    "-nostdin", "-y",
    "-i", sourcePath,
    "-vf",
    `scale=${w}:${h}:flags=lanczos+accurate_rnd:` +
      `force_original_aspect_ratio=decrease,pad=${w}:${h}:-1:-1:color=black,setsar=1`,
    "-c:v", "libx264",
    "-preset", options.preset,
    "-tune", options.tune,
    "-profile:v", "high",
    "-crf", String(PROGRESSIVE_FALLBACK.crf),
    "-maxrate", `${PROGRESSIVE_FALLBACK.maxrateKbps}k`,
    "-bufsize", `${PROGRESSIVE_FALLBACK.maxrateKbps * 2}k`,
    "-x264-params", x264Params(gop),
    "-pix_fmt", "yuv420p",
    ...(sourceInfo.hasAudio
      ? ["-c:a", "aac", "-b:a", `${PROGRESSIVE_FALLBACK.audioBitrateKbps}k`, "-ac", "2"]
      : ["-an"]),
    // Without faststart the moov atom lands at the end of the file and the
    // browser must download the whole thing before it can show a frame.
    "-movflags", "+faststart",
    target,
  ]);

  return target;
}

/** The chosen frame, else a few seconds in, so neither image is a fade-from-black. */
function stillAt(sourceInfo, chosen) {
  if (Number.isFinite(chosen) && chosen >= 0) return Math.min(chosen, Math.max(0, sourceInfo.duration - 0.1));
  return Math.min(6, Math.max(1, sourceInfo.duration * 0.02));
}

function isPortrait(sourceInfo) {
  return sourceInfo.height > sourceInfo.width;
}

async function extractPoster(sourcePath, outDir, sourceInfo, at) {
  const target = path.join(outDir, "poster.jpg");
  // Full size in the video's own orientation: the theatre is ~1200 CSS px wide
  // on desktop (a vertical reel's frame, ~760 px tall), so anything smaller is
  // upscaled on every 2× display.
  const [w, h] = isPortrait(sourceInfo) ? [1080, 1920] : [1920, 1080];
  await run("ffmpeg", [
    "-nostdin", "-y",
    "-ss", String(at),
    "-i", sourcePath,
    "-frames:v", "1",
    "-vf", `scale=${w}:${h}:flags=lanczos:force_original_aspect_ratio=decrease,pad=${w}:${h}:-1:-1:color=black`,
    "-q:v", "3",
    target,
  ]);
  return target;
}

/**
 * The link-preview image: exactly the 1200×630 that `index.html` declares in
 * `og:image:width`/`height`. A landscape frame is cropped from the centre
 * rather than letterboxed, because a preview card with black bars reads as
 * broken. A vertical reel cannot be cropped to 1200×630 without losing nearly
 * all of it, so the whole frame stands in the middle of a fill drawn from its
 * own colours. The fill averages each of eight horizontal bands across the
 * frame's full width: a blurred close-up of the frame, which is the obvious
 * fill, turns any bright panel near its edge into a smear beside the reel.
 */
async function extractCard(sourcePath, outDir, sourceInfo, at) {
  const target = path.join(outDir, "card.jpg");
  const filter = isPortrait(sourceInfo)
    ? [
        "-filter_complex",
        "[0:v]split=2[fill][frame];" +
          "[fill]scale=1:8:flags=area,scale=1200:630:flags=bicubic," +
          "eq=brightness=-0.08:saturation=1.2,vignette=angle=PI/3.2[bg];" +
          "[frame]scale=-2:630:flags=lanczos[fg];" +
          "[bg][fg]overlay=(W-w)/2:0",
      ]
    : ["-vf", "scale=1200:630:flags=lanczos:force_original_aspect_ratio=increase,crop=1200:630"];
  await run("ffmpeg", [
    "-nostdin", "-y",
    "-ss", String(at),
    "-i", sourcePath,
    "-frames:v", "1",
    ...filter,
    "-q:v", "3",
    target,
  ]);
  return target;
}

/**
 * Measures what each rendition actually costs, rather than trusting the
 * requested ceiling. `BANDWIDTH` must be the peak a client needs to sustain and
 * `AVERAGE-BANDWIDTH` the mean; getting these wrong is what makes an ABR
 * controller systematically over- or under-select a rung.
 */
async function measureRendition(outDir, renditionId) {
  const dir = path.join(outDir, renditionId);
  const playlist = await readFile(path.join(dir, "playlist.m3u8"), "utf8");

  const durations = [];
  for (const line of playlist.split("\n")) {
    const match = /^#EXTINF:([\d.]+)/.exec(line.trim());
    if (match) durations.push(Number(match[1]));
  }

  const files = (await readdir(dir)).filter((name) => name.endsWith(".m4s")).sort();
  const sizes = await Promise.all(
    files.map(async (name) => (await stat(path.join(dir, name))).size),
  );

  const initSize = (await stat(path.join(dir, "init.mp4"))).size;
  const totalBytes = sizes.reduce((sum, size) => sum + size, 0) + initSize;
  const totalSeconds = durations.reduce((sum, value) => sum + value, 0);

  // Peak is the worst single segment, which is what a client must be able to
  // fund in real time to avoid draining its buffer.
  let peakBps = 0;
  for (let i = 0; i < sizes.length; i += 1) {
    const seconds = durations[i] || SEGMENT_SECONDS;
    if (seconds <= 0) continue;
    peakBps = Math.max(peakBps, (sizes[i] * 8) / seconds);
  }

  return {
    averageBps: totalSeconds > 0 ? Math.round((totalBytes * 8) / totalSeconds) : 0,
    peakBps: Math.round(peakBps),
    totalBytes,
    totalSeconds,
    segments: sizes.length,
  };
}

const SILENT = { averageBps: 0, peakBps: 0 };

function buildMaster(measurements, fps, hasAudio, ladder) {
  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:7",
    // Declares that every segment can be decoded without the one before it,
    // which is what makes mid-stream rung switching safe.
    "#EXT-X-INDEPENDENT-SEGMENTS",
    "",
  ];

  if (hasAudio) {
    const usedGroups = new Set(ladder.map((r) => r.audioGroup));
    for (const audio of AUDIO_RENDITIONS) {
      if (!usedGroups.has(audio.groupId)) continue;
      lines.push(
        "#EXT-X-MEDIA:TYPE=AUDIO," +
          `GROUP-ID="${audio.groupId}",` +
          `NAME="${audio.name}",` +
          "LANGUAGE=\"en\"," +
          "DEFAULT=YES," +
          "AUTOSELECT=YES," +
          `CHANNELS="${audio.channels}",` +
          // Forward slash, unconditionally. The NPC manifest this pipeline
          // replaced was packaged on Windows and shipped `v0\playlist.m3u8`,
          // which every RFC 3986 parser resolves to a 400.
          `URI="${audio.id}/playlist.m3u8"`,
      );
    }
    lines.push("");
  }

  for (const rendition of ladder) {
    const video = measurements.get(rendition.id);
    const audio = AUDIO_RENDITIONS.find((a) => a.groupId === rendition.audioGroup);
    const audioMeasurement = hasAudio ? measurements.get(audio.id) : SILENT;
    if (!video || !audioMeasurement) continue;

    // A client streaming this rung pays for the video and the audio together.
    const bandwidth = video.peakBps + audioMeasurement.peakBps;
    const averageBandwidth = video.averageBps + audioMeasurement.averageBps;
    const codecs = hasAudio ? `${rendition.codec},${audio.codec}` : rendition.codec;

    lines.push(
      "#EXT-X-STREAM-INF:" +
        `BANDWIDTH=${bandwidth},` +
        `AVERAGE-BANDWIDTH=${averageBandwidth},` +
        `RESOLUTION=${rendition.width}x${rendition.height},` +
        `FRAME-RATE=${fps.toFixed(3)},` +
        `CODECS="${codecs}",` +
        (hasAudio ? `AUDIO="${rendition.audioGroup}",` : "") +
        "CLOSED-CAPTIONS=NONE",
    );
    lines.push(`${rendition.id}/playlist.m3u8`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatMbps(bps) {
  return `${(bps / 1_000_000).toFixed(2)} Mbps`;
}

function formatMb(bytes) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function pump() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, pump));
  return results;
}

/** What to paste into the catalogue entry. Chapters are the editor's call. */
function catalogueSnippet(slug, version, source, captions) {
  const prefix = `videos/${slug}/${version}`;
  const today = new Date().toISOString().slice(0, 10);
  return [
    ...(isPortrait(source) ? [`    orientation: "portrait",`] : []),
    `    media: {`,
    `      hls: "${prefix}/master.m3u8",`,
    `      mp4: "${prefix}/fallback-720p.mp4",`,
    `      poster: "${prefix}/poster.jpg",`,
    `      card: "${prefix}/card.jpg",`,
    captions ? `      captions: "${prefix}/captions.en.vtt",` : `      // captions: "${prefix}/captions.en.vtt",`,
    `    },`,
    `    durationSeconds: ${Math.round(source.duration)},`,
    `    publishedOn: "${today}",`,
    `    chapters: [`,
    `      { at: 0, label: "…" },`,
    `    ],`,
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.source || !args.slug) {
    console.error(
      "Usage: npm run video:encode -- <source-video> --slug <slug> [--tune film|animation] [--version v1] [--jobs n] [--preset slow] [--poster-at seconds] [--draft]",
    );
    process.exit(1);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.slug)) {
    console.error(`--slug must be lowercase words joined by hyphens, as in catalog.ts: ${args.slug}`);
    process.exit(1);
  }
  if (!/^v\d+$/.test(args.version)) {
    console.error(`--version must look like v1, v2 …: ${args.version}`);
    process.exit(1);
  }
  if (!TUNES.includes(args.tune)) {
    console.error(`--tune must be one of ${TUNES.join(", ")}`);
    process.exit(1);
  }

  if (!PRESETS.includes(args.preset)) {
    console.error(`--preset must be one of ${PRESETS.join(", ")}`);
    process.exit(1);
  }
  if (args.posterAt !== null && !(Number.isFinite(args.posterAt) && args.posterAt >= 0)) {
    console.error("--poster-at must be a number of seconds");
    process.exit(1);
  }

  const options = { preset: args.draft ? "veryfast" : args.preset, tune: args.tune };
  const outDir = path.resolve(args.out ?? path.join("media-build", args.slug));
  await mkdir(outDir, { recursive: true });

  const source = await probe(args.source);
  console.log(
    `Source: ${source.width}x${source.height} @ ${source.fps.toFixed(3)} fps, ` +
      `${source.duration.toFixed(1)}s, ${source.hasAudio ? "with audio" : "silent"}`,
  );
  console.log(
    `Segment length: ${SEGMENT_SECONDS}s (GOP ${gopFrames(source.fps)} frames), ` +
      `preset ${options.preset}, tune ${options.tune}${args.draft ? "  — DRAFT, do not publish" : ""}\n`,
  );

  // A silent re-encode must not leave an earlier cut's audio folders behind
  // for upload.sh to publish.
  if (!source.hasAudio) {
    await Promise.all(AUDIO_RENDITIONS.map((rendition) => rm(path.join(outDir, rendition.id), { recursive: true, force: true })));
  }

  const audioJobs = source.hasAudio
    ? AUDIO_RENDITIONS.map((rendition) => ({
        id: rendition.id,
        label: `${rendition.id} (${rendition.bitrateKbps} kbps, ${rendition.channels}ch)`,
        run: () => encodeAudioRendition(args.source, outDir, rendition),
      }))
    : [];
  const ladder = renditionsFor(source);
  const videoJobs = ladder.map((rendition) => ({
    id: rendition.id,
    label: `${rendition.id} (${rendition.width}x${rendition.height}, CRF ${rendition.crf}, cap ${rendition.maxrateKbps} kbps)`,
    run: () => encodeVideoRendition(args.source, outDir, rendition, source, options),
  }));
  const jobs = [...audioJobs, ...videoJobs];

  await mapWithConcurrency(jobs, args.jobs, async (job) => {
    const startedAt = Date.now();
    console.log(`  encoding ${job.label} ...`);
    await job.run();
    console.log(`  done     ${job.id} in ${((Date.now() - startedAt) / 1000).toFixed(0)}s`);
  });

  const measurements = new Map();
  for (const job of jobs) {
    measurements.set(job.id, await measureRendition(outDir, job.id));
  }

  const master = buildMaster(measurements, source.fps, source.hasAudio, ladder);
  await writeFile(path.join(outDir, "master.m3u8"), master, "utf8");

  console.log("\n  encoding progressive fallback ...");
  const fallback = await encodeProgressiveFallback(args.source, outDir, source, options);
  const still = stillAt(source, args.posterAt ?? undefined);
  await extractPoster(args.source, outDir, source, still);
  await extractCard(args.source, outDir, source, still);

  console.log(`\nLadder (${isPortrait(source) ? "portrait" : "landscape"}):`);
  for (const rendition of ladder) {
    const video = measurements.get(rendition.id);
    const audio = AUDIO_RENDITIONS.find((a) => a.groupId === rendition.audioGroup);
    const audioMeasurement = source.hasAudio ? measurements.get(audio.id) : SILENT;
    console.log(
      `  ${rendition.id.padEnd(7)} ${String(rendition.width + "x" + rendition.height).padEnd(10)} ` +
        `avg ${formatMbps(video.averageBps + audioMeasurement.averageBps).padStart(9)}  ` +
        `peak ${formatMbps(video.peakBps + audioMeasurement.peakBps).padStart(9)}  ` +
        `${formatMb(video.totalBytes).padStart(9)}`,
    );
  }

  const fallbackSize = (await stat(fallback)).size;
  const [fw, fh] = fallbackFrame(source);
  console.log(`  fallback ${`${fw}x${fh}`.padEnd(10)} ${formatMb(fallbackSize).padStart(30)}`);
  console.log(`  poster and card from ${still.toFixed(1)}s`);
  console.log(`\nWrote ${outDir}`);

  const captions = await stat(path.join(outDir, "captions.en.vtt")).then(() => true, () => false);
  console.log(
    `\nNext:\n` +
      `  1. ${captions ? "Captions found." : `Add captions as ${path.join(outDir, "captions.en.vtt")} (WebVTT) if you have them.`}\n` +
      `  2. npm run video:upload -- ${args.slug} ${args.version}\n` +
      `  3. Add this to the "${args.slug}" entry in src/lib/videos/catalog.ts:\n\n` +
      catalogueSnippet(args.slug, args.version, source, captions),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
