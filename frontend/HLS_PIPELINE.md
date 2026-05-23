# HLS pipeline — cutover plan

## Current state (MVP)

- Creators upload **raw MP4** through `/api/ipfs-upload`.
- Files are pinned via **Pinata** and the CID is stored on-chain in `mozoflix-videos.content-hash`.
- The `<VideoPlayer>` component plays MP4 directly through `<video>`.
- HLS.js is already wired — if `src` ends in `.m3u8`, it auto-attaches.

This works today on every modern browser. **No transcoding needed for the MVP.**

## When you outgrow raw MP4

You'll want HLS once any of these hurt:

1. Mobile users on bad connections (no adaptive bitrate)
2. Long-form videos (slow seek, large initial download)
3. DRM / premium-only content
4. CDN cost optimization (HLS chunks cache better)

## Recommended path: Cloudflare Stream

**Why:** managed, $5/mo for 1k minutes stored + 200k minutes delivered. No
ffmpeg infrastructure to run yourself.

### Cutover steps

1. Sign up at <https://dash.cloudflare.com/?to=/:account/stream>
2. Get an account ID + API token with `Stream:Edit` scope.
3. Add to `.env.local`:
   ```
   CLOUDFLARE_ACCOUNT_ID=...
   CLOUDFLARE_STREAM_TOKEN=...
   ```
4. Replace `lib/ipfs-server.ts` `pinFileToIPFS` call in `/api/ipfs-upload`
   with a Cloudflare Stream upload:

   ```ts
   // POST the video to Cloudflare Stream
   const res = await fetch(
     `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`,
     {
       method: "POST",
       headers: { Authorization: `Bearer ${STREAM_TOKEN}` },
       body: form, // FormData with `file`
     },
   );
   const { result } = await res.json();
   // result.uid is the video ID; result.playback.hls is the .m3u8 URL
   return { cid: result.uid, url: result.playback.hls };
   ```

5. Update `videoMeta.videoFormat` from `"mp4"` to `"hls"` and store the
   `.m3u8` URL (or just the Stream UID and reconstruct the URL on read).

6. The `<VideoPlayer>` doesn't need to change — HLS.js takes over
   automatically when it sees `.m3u8`.

7. (Optional) Pin the original MP4 on IPFS too, in parallel, for permanence.

## Alternative: self-hosted ffmpeg

If you want to avoid SaaS:

- Run an ffmpeg worker (e.g. on Fly.io or a small VPS).
- After IPFS pin completes, kick off a job: download the MP4, run
  `ffmpeg -i input.mp4 -hls_time 6 -hls_playlist_type vod out.m3u8`,
  upload all `.ts` chunks + `.m3u8` back to IPFS.
- Store the playlist CID in `videoMeta.videoCid`.

Drawbacks: GPU-less ffmpeg is slow on long videos; you need queue +
retry infrastructure; cold-start latency on serverless makes this hard
to keep under 60s. Cloudflare Stream is worth the $5.

## Why not transcode in the browser?

WebAssembly ffmpeg works for tiny clips but eats RAM, blocks the main
thread, and takes 5–10× real-time on a laptop. Don't.
