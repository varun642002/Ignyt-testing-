# Deployment guide

From this directory to a live site on your own domain.

---

## 0. Before you start

Confirm the build is green locally. If it is not, deploying will not fix it.

```bash
npm ci && npm run lint && npm run typecheck && npm run build
```

You should see every route prerendered as `○ (Static)` or `● (SSG)`. Nothing
should be marked `ƒ (Dynamic)` — this site has no reason to render per request.

---

## 1. Push to GitHub

This project is self-contained, so it becomes its own repository:

```bash
git init -b main
git add .
git commit -m "Initial commit: official IGNYT website"
gh repo create IGNYTfit --public --source=. --remote=origin --push
```

Without the GitHub CLI, create an empty `IGNYTfit` repo in the GitHub UI (no
README, no `.gitignore`, no licence) and then:

```bash
git remote add origin https://github.com/<your-username>/IGNYTfit.git
git push -u origin main
```

CI runs on every push and pull request: lint, typecheck, build, plus a check
that `sitemap.xml` and `robots.txt` were actually generated.

---

## 2. Deploy to Vercel

1. Open <https://vercel.com/new> and import the `IGNYTfit` repository.
2. Vercel detects Next.js. Leave every build setting at its default —
   Build `npm run build`, Output `.next`, Install `npm install`.
3. Add one environment variable, **scoped to Production only**:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |

   Leave it unset for Preview. Preview builds then fall back to their own
   `VERCEL_URL`, so a preview never advertises itself as the canonical site,
   and `robots.txt` serves `Disallow: /` on every non-production deployment.

4. Deploy.

From the command line instead:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SITE_URL production
vercel --prod
```

After the first deploy, every push to `main` ships to production and every
pull request gets its own preview URL.

### Deploying somewhere other than Vercel

Nothing here is Vercel-specific except the security headers, which are set in
`next.config.ts` and applied by the Next.js server. If you deploy to a static
host that serves the `out/` directory instead, you must reproduce those
headers at the CDN or reverse proxy — otherwise the CSP, HSTS and
`X-Frame-Options` protections silently disappear.

---

## 3. Custom domain

1. In Vercel: **Project → Settings → Domains → Add**, and enter your domain.
2. At your DNS provider, add the records Vercel displays — typically an `A`
   record for the apex and a `CNAME` for `www`. Use the values shown in the
   dashboard rather than any written here; they change.
3. Pick one canonical host. Vercel redirects the other automatically once both
   are added.
4. **Update `NEXT_PUBLIC_SITE_URL` to the canonical origin and redeploy.** Do
   not skip this — canonical tags, the sitemap, JSON-LD and Open Graph URLs
   are all generated from it, and a stale value points search engines at the
   wrong host.
5. HTTPS is provisioned automatically.

---

## 4. After the first production deploy

Verify, in this order:

```bash
curl -I https://your-domain.com | grep -i "content-security-policy\|strict-transport"
curl -s https://your-domain.com/robots.txt
curl -s https://your-domain.com/sitemap.xml | head -20
```

Then:

- Submit `https://your-domain.com/sitemap.xml` in Google Search Console.
- Test structured data at <https://search.google.com/test/rich-results>.
- Check the social card with Facebook's sharing debugger and X's card
  validator. Both cache aggressively — re-scrape after any change.
- Run Lighthouse against the **production URL**, not the dev server. Dev-mode
  scores are meaningless: unminified bundles, HMR overhead and React's
  development build all distort them.

---

## 5. Wiring up the contact form

The form works with no backend — it composes a pre-filled email in the
visitor's mail client. To route submissions to a real inbox instead, set:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | Any endpoint accepting a JSON POST |

The payload is `{ name, email, subject, message }`. Formspree, Formspark or a
small Vercel function all work. Redeploy after adding it.

---

## 6. Google submissions

Once the domain is live, these URLs are what Google's reviews ask for:

| Purpose | URL |
| --- | --- |
| OAuth consent screen — homepage | `/` |
| OAuth consent screen — privacy policy | `/privacy` |
| Play listing — privacy policy | `/privacy` |
| Play — account and data deletion | `/data-deletion` |
| Play — Health Connect declaration support | `/health-data` |
| Play — terms | `/terms` |

The OAuth branding review requires the homepage and privacy policy to sit on
the **same verified domain**, be reachable without logging in, and show the
app name and logo. All three hold here — but the domain must be verified in
Google Search Console under the same account as the Cloud project.

---

## Rollback

Vercel keeps every deployment. **Deployments → the previous one →  Promote to
Production** reverts in seconds without a git operation. Fix forward
afterwards; do not leave production pinned to an old commit, or the next merge
to `main` will silently re-deploy the broken build.
