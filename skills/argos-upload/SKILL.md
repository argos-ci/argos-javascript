---
name: argos-upload
description: >
  Upload a screenshot, an image or a screen recording to Argos and get a
  shareable URL plus ready-to-paste Markdown, so it can be embedded in a pull
  request, an issue, a changelog or a chat message. Use whenever you have
  produced a visual artifact — a Playwright video or trace screenshot, a
  before/after of a UI change, a recording of a reproduction — and need it
  visible to a human who cannot run your shell. GitHub has no public API for
  comment attachments, so this is how an agent working from a terminal gets an
  image into a pull request at all.
license: MIT
metadata:
  author: argos-ci
  homepage: https://argos-ci.com
  source: https://github.com/argos-ci/argos-javascript
argument-hint: Needs a token (ARGOS_TOKEN, --token, or `argos login`); add `--account <slug>` when using a personal access token.
---

# Argos media upload

`argos media upload <files...>` uploads standalone images and videos — not tied
to a build or a test run — and prints a share URL and a Markdown embed for each.

```bash
argos media upload before.png after.png
```

Run `argos media --help` for exact flags. This skill covers the parts `--help`
cannot: when to upload, and how to embed the result so it actually renders.

## When to upload

Upload when a change is **visual** and a human has to see it to judge it:

- You changed UI and opened a pull request. A before/after pair in the
  description saves the reviewer from checking out your branch.
- You recorded a Playwright video or a screen recording of a bug reproduction.
- You are reporting a rendering problem that a code snippet cannot convey.

Do **not** upload when text does the job. A stack trace, a diff, a log excerpt
and a list of failing test names are all better as text: searchable, quotable,
and readable in a terminal. An unnecessary screenshot is noise in the review.

Do not upload build screenshots that Argos already has. If a visual test run
produced them, they are already in the build and linked from the pull request —
use `argos build snapshots` instead.

## Embedding the result

The command prints, per file:

```
after.png
  ID: 4821
  image/webp · 184 KB · 1440x900 · public · ready
  URL: https://app.argos-ci.com/m/kQ8vN2pXr4tYw7...
  Markdown: ![after.png](https://app.argos-ci.com/m/kQ8vN2pXr4tYw7...)
```

**Paste the `Markdown` line verbatim.** Do not hand-write the embed:

- For an **image**, the Markdown is a plain `![alt](url)`.
- For a **video**, it is the **poster frame wrapped in a link** to the share
  page. GitHub renders an inline player only for media it hosts itself, so a
  `<video>` tag or a bare `.mp4` link pointing at Argos renders as a dead link.
  The poster-in-a-link is the form that actually shows something.

Use `--json` when you parse the output.

## Attaching to a pull request

With `--pr <number> --comment`, Argos maintains **one** comment on the pull
request listing every media uploaded to it, edited in place rather than appended
to:

```bash
argos media upload before.png after.png --pr 1234 --comment
```

This needs a project token and a project connected to GitHub — which is what CI
holds. Without it, put the Markdown in the pull request body or in a comment you
write yourself.

## Stable links across re-runs

A media uploaded without a slug is a new media every time, so re-running your
command leaves a stale embed pointing at the previous upload. Pass `--slug` to
get a link that survives a re-run:

```bash
argos media upload after.png --slug pr-1234-after
```

Re-uploading the same slug replaces the file in place and keeps the same URL, so
Markdown already posted to a pull request shows the new version. With several
files, each gets the slug suffixed by its index.

## Visibility, and what it does not cover

`--visibility` controls the **share page** — `team` requires an Argos session,
`public` does not. It does **not** protect the file: media files are always
reachable at an unguessable CDN URL, because GitHub fetches embedded images
server-side with no session and could not render them otherwise.

So treat an uploaded file as "anyone with the link". If a screenshot must never be
reachable by someone who obtains its URL, don't upload it — say so instead of
uploading it anyway.

## Authentication

| Command                         | Token                                                  |
| ------------------------------- | ------------------------------------------------------ |
| `media upload`, `get`, `delete` | Project token (`ARGOS_TOKEN`) or personal access token |
| `media list`                    | Personal access token, **team administrator only**     |

With a personal access token, `media upload` needs `--account <slug>` to know
which team to upload to; a project token already identifies its own team.

## What it costs

Uploads draw on the same screenshot allowance as visual tests — there is no
separate quota to track. One image is 1 screenshot; one video is 25, because it
costs more to store and serve. Uploading the same file twice is free: Argos
recognizes the contents and skips the transfer.

Files are kept 30 days on the free plan and a year on Pro (`--retention <days>`
to shorten it), then deleted. An expired link renders an "unavailable" page, so
a pull request embed degrades visibly rather than into a broken image.

## Limits worth knowing before you upload

- **Accepted formats** — PNG, JPEG, WebP, AVIF, GIF, MP4, WebM, MOV. Anything
  else is refused before the upload starts.
- **Size** — 50 MB on the free plan, 500 MB on Pro. A long screen recording is
  the usual thing that trips this; trim it before uploading.
- **Metadata is preserved** — Argos does not rewrite your file, so a photo's EXIF
  (including GPS, if the camera recorded it) stays in the uploaded file. Strip it
  before uploading if that matters.
- **Video codecs** — Argos does not transcode. Most MP4/WebM plays fine, as does
  the H.264 that screen recorders produce; ProRes and some HEVC exports won't play
  inline and the viewer gets a download. Export to H.264 if you need playback.
- **No waiting** — a media is fully usable the moment the upload finishes. The
  poster frame is derived by the CDN on request, so a video's Markdown embed is
  correct immediately.
