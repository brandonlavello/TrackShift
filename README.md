# TrackShift

**Correct GPS tracks recorded on a moving ship.**

Browser-based FIT/GPX corrector for runs on cruise ships (and other moving platforms). Export a Strava-friendly GPX with ship motion removed. Everything runs **in your browser** — files are never uploaded to a server.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live demo:** [brandonlavello.github.io/TrackShift](https://brandonlavello.github.io/TrackShift/)

## Why this exists

GPS watches record your position relative to the ground. On a ship, the ground is moving. A 5-mile deck run can look like 6+ miles on Strava because the track includes the ship’s motion.

TrackShift estimates that ship motion from standing-still time before and after your run, subtracts it from the GPS track, and exports corrected coordinates.

## Features

- **FIT-first parsing** with GPX fallback (`fit-file-parser`)
- **Auto-detect run window** from FIT speed + standing-still edge trim
- **Ship motion estimate** from trimmed lead-in / trail-out (linear regression on GPS drift)
- **Manual fine-tuning** — speed, heading, and correction strength sliders
- **Raw vs corrected** map preview, timeline, and stats (mi / km)
- **Export corrected GPX** for the selected run segment
- **Demo track** — synthetic ~10 mi deck loop for trying the tool without a file

## How it works (short version)

1. Upload a `.fit` or `.gpx` activity.
2. The app finds your run and trims standing/walking time at the edges.
3. While you’re barely moving, GPS drift ≈ ship motion. The tool fits a straight-line velocity through those samples.
4. That constant ship vector is subtracted from your run GPS points.
5. Export the corrected GPX.

Works best with **~20–30 seconds of standing or slow walking** after you finish (and ideally before you start). If you hit record and immediately run, estimation relies on your cool-down.

## Privacy

- No backend, accounts, or analytics in this repo
- Parsing, correction, and export are 100% client-side
- Your activity never leaves your device

## Quick start

**Requirements:** Node.js 20+ (see `.nvmrc`)

```bash
git clone https://github.com/brandonlavello/TrackShift.git
cd TrackShift
npm install
npm run dev
```

Open [http://localhost:5175](http://localhost:5175).

### Production build

```bash
npm run build
npm run preview
```

## Deploy as a live tool

Because the app is static, you can host it for free:

| Host | Notes |
|------|--------|
| **GitHub Pages** | `npm run build:pages` then deploy `dist/` (see below) |
| **Netlify / Cloudflare Pages** | Connect repo, build `npm run build`, publish `dist` |
| **Any static host** | Upload `dist/` after `npm run build` |

### GitHub Pages

If your site URL is `https://<user>.github.io/TrackShift/`:

```bash
npm run build:pages
```

A GitHub Actions workflow (`.github/workflows/pages.yml`) deploys automatically on push to `main`.

For a **custom domain** at the root (`https://yourdomain.com/`), use `npm run build` instead (default base path `/`).

## Project structure

```
src/
  components/     # UI panels
  stores/         # Pinia session state
  lib/            # FIT/GPX parse, correction, metrics, export
  data/           # Synthetic deck demo generator
scripts/          # Local dev helpers (optional)
```

## Disclaimer

- **Not affiliated with** Garmin, Strava, or any cruise line.
- Ship motion estimates are **approximate**. Results depend on GPS quality, trim quality, and assumptions (constant ship speed/heading).
- **Not for navigation or safety.** Use at your own risk.
- FIT is a Garmin-related format; this project uses community parsers to read files you already own.

## Contributing

Personal project, but issues and PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — Copyright (c) 2026 Brandon Lavello
