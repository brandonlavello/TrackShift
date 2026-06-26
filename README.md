# TrackShift

**Correct GPS tracks recorded on a moving ship.**

Browser-based FIT/GPX corrector for runs on cruise ships (and other moving platforms). Export a Strava-friendly GPX with ship motion removed. Everything runs **in your browser** — files are never uploaded to a server.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live demo:** [brandonlavello.github.io/TrackShift](https://brandonlavello.github.io/TrackShift/)

## Why this exists

GPS watches record your position relative to the ground. On a ship, the ground is moving. A 5-mile deck run can look like 6+ miles on Strava because the track includes the ship’s motion.

TrackShift estimates that ship motion from standing-still time before and after your run, subtracts it from the GPS track, and exports corrected coordinates.

## Ideal use case

**Promenade or jogging-track runs on a cruise ship** are the sweet spot: you lap the deck while the ship moves underneath you, and your watch records both motions in one file.

The same approach can help on other **steady moving platforms** (ferry, train), but cruise deck runs are what the tool is built around.

## Recording on a cruise ship

The app estimates ship speed and heading from GPS drift while you are **barely moving** at the start and end of the activity. Give it enough trim data and the estimate is much more reliable.

### Recommended workflow

| Step | What to do |
|------|------------|
| 1 | **Start your watch** on the open promenade (clear sky helps GPS). |
| 2 | **Stand or walk slowly ~30 seconds** before you run. |
| 3 | **Run your laps** as usual. |
| 4 | **Walk or stand ~30 seconds** before you stop the watch. |
| 5 | **Upload the `.fit` file** to TrackShift and export corrected GPX. |

**Minimum:** about **20 seconds** of low-activity trim data at the edges. **30+ seconds** before and after is the habit that usually reaches **Good** confidence.

You do not need to stand perfectly still — slow walking counts. Garmin **FIT** files (with device speed) work best; the app uses low-speed samples to find trim windows.

### When correction is weaker

- Stopping the watch immediately when you finish (no cool-down)
- Ship **turning hard** or changing speed a lot during the run
- **Poor GPS** under cover, between decks, or in port
- **Very short runs** with little lead-in or trail-out
- Assuming **constant** ship motion — the model is a straight-line velocity, not navigation-grade physics

Manual **speed**, **heading**, and **strength** sliders can salvage a Fair estimate when you know the ship’s course.

## Using the app

1. **Upload** a `.fit` or `.gpx` activity (or try the built-in demo).
2. **Review trim** — grey dashed segments on the raw map are lead-in/trail-out; green/red mark run start and end. Adjust the timeline sliders or use **Auto-trim run** if needed.
3. **Check raw vs corrected** — the corrected preview should look like a tight deck loop, not a smear across the ocean.
4. **Read Quality Metrics** — confidence, alignment, and loop closure hint at trustworthiness.
5. **Fine-tune** ship motion in Correction Controls if needed.
6. **Export corrected GPX** and upload to Strava (or elsewhere).

### About the track previews

The maps are **schematic**, not geographic basemaps. They show **shape** (lap closure, trim regions) scaled to fit the panel — not coastlines or “you are here.” On open water, a tile map would mostly show ocean anyway. A real map layer could be added later as an optional toggle.

## How it works (technical)

1. Parse FIT or GPX entirely in the browser.
2. Detect the run window from FIT speed when available; trim standing-still edges.
3. Fit a constant ship velocity through low-activity GPS samples in the trimmed lead-in/trail-out.
4. Subtract that vector from run GPS points (with adjustable strength).
5. Write a corrected GPX for the selected run segment.

## Features

- **FIT-first parsing** with GPX fallback (`fit-file-parser`)
- **Auto-detect run window** from FIT speed + standing-still edge trim
- **Ship motion estimate** from trimmed lead-in / trail-out (linear regression on GPS drift)
- **Manual fine-tuning** — speed, heading, and correction strength sliders
- **Raw vs corrected** map preview, timeline, and stats (mi / km)
- **Export corrected GPX** for the selected run segment
- **Demo track** — synthetic ~10 mi deck loop for trying the tool without a file

## Privacy

- No backend, accounts, or analytics in this repo
- Parsing, correction, and export are 100% client-side
- Your activity file is not uploaded to a server when you use the hosted app

## Quick start (developers)

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

### Tests & lint

```bash
npm test
npm run lint
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
