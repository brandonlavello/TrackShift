# Analytics setup (maintainers)

The hosted demo at GitHub Pages optionally loads [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) via a build-time beacon token. Self-hosted or local builds skip analytics unless you set `VITE_CF_BEACON_TOKEN`.

Cloudflare collects anonymous traffic metrics (page views, referrers, country). It does **not** receive FIT/GPX files or correction settings.

## Enable on GitHub Pages

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com/) (free account).
2. Open **Web Analytics** (search the dashboard if it is not in the sidebar).
3. **Add a site** → hostname: `brandonlavello.github.io`
4. Copy the **token** from the install snippet (`"token": "..."` inside `data-cf-beacon`).
5. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `CF_WEB_ANALYTICS_TOKEN`
   - Value: your token
6. Push to `main` or re-run **Deploy to GitHub Pages**.

In Cloudflare, choose **Enable with JS Snippet installation** (manual) on the site — the app injects the snippet in production.

View metrics under **Web Analytics** in Cloudflare. Data may take a short time to appear after deploy.

## Local / self-hosted

Optional `.env` (see `.env.example`):

```bash
VITE_CF_BEACON_TOKEN=your_token_here
```

Without this variable, `initCloudflareAnalytics()` is a no-op.
