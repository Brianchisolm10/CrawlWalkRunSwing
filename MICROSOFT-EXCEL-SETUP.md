# Crawl — Signups into Microsoft Excel

Every email box on the site posts to `/api/lead` on your own domain. That function
appends a row to an Excel workbook in your OneDrive using the Microsoft Graph API.

**Nothing breaks while you set this up.** Until the environment variables exist,
the endpoint accepts signups and logs them (visible in Vercel → your project →
Logs), and the browser keeps its own copy you can download from the footer's
"Export saved signups" link.

---

## One thing to know up front

You have **Microsoft 365 Personal/Family**, which is a *consumer* account. Consumer
OneDrive doesn't support the app-only "service account" flow that business tenants
use. So we authorize **once as you** and store the resulting refresh token — the
function then quietly renews its own access from then on. That's what Steps 3–4 do.
It's a one-time 15-minute annoyance, not an ongoing one.

---

## Step 1 — Create the workbook

1. In OneDrive, make a folder called **Crawl**
2. Inside it create a new Excel workbook named **CrawlSignups.xlsx**
3. In row 1, type these ten headers across A1:J1 — spelling matters:

```
timestamp | email | type | decks | deck_count | value | source | remember_consent | referrer | user_agent
```

4. Select A1:J1 → **Insert → Table** → check "My table has headers"
5. With the table selected, go to **Table Design** and set the table name to
   **Signups** (top-left box). This name is how the API finds it.
6. Close the file so OneDrive syncs it.

## Step 2 — Register the app

1. Go to <https://portal.azure.com> → search **App registrations** → **New registration**
2. Name: `Crawl Signups`
3. Supported account types: **Personal Microsoft accounts only**
4. Redirect URI: choose **Web** and enter `http://localhost:3000/callback`
5. Register, then copy the **Application (client) ID** → this is `MS_CLIENT_ID`
6. Left menu → **Certificates & secrets** → **New client secret** → copy the
   **Value** immediately (it's only shown once) → this is `MS_CLIENT_SECRET`
7. Left menu → **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Delegated permissions** → add **Files.ReadWrite** and **offline_access**

## Step 3 — Authorize once (get a code)

Paste this into your browser, replacing `YOUR_CLIENT_ID`:

```
https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/callback&response_mode=query&scope=https://graph.microsoft.com/Files.ReadWrite%20offline_access
```

Sign in and approve. The browser will fail to load a page — that's expected.
Copy the `code=` value out of the address bar (it's long; grab everything between
`code=` and the next `&`, or to the end).

## Step 4 — Trade the code for a refresh token

In a terminal, replacing the three placeholders:

```bash
curl -X POST https://login.microsoftonline.com/consumers/oauth2/v2.0/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=THE_CODE_YOU_COPIED" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "scope=https://graph.microsoft.com/Files.ReadWrite offline_access"
```

The response JSON contains `refresh_token` → this is `MS_REFRESH_TOKEN`.

## Step 5 — Put the values in Vercel

Vercel → your project → **Settings → Environment Variables**. Add five:

| Name | Value |
|---|---|
| `MS_CLIENT_ID` | from Step 2 |
| `MS_CLIENT_SECRET` | from Step 2 |
| `MS_REFRESH_TOKEN` | from Step 4 |
| `MS_WORKBOOK_PATH` | `Crawl/CrawlSignups.xlsx` |
| `MS_TABLE_NAME` | `Signups` |

Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the function picks them up.

## Step 6 — Test

Reserve a deck on the live site with your own email, then open the workbook.
A row should be there. If it isn't, check Vercel → Logs — the function logs the
exact Graph error and still logs the row itself so nothing is lost.

---

## What you can do once data is in Excel

- **Pivot by `decks`** — the single most important number you have: which deck to film first
- **Pivot by `referrer`** — which channel actually converts, not which one gets likes
- **Sum `value`** — total reserved demand in dollars
- **Average `deck_count`** — whether bundles are worth building
- **Filter `type`** — buyers vs. newsletter readers, tracked separately
- Point **Claude for Excel** at the sheet and ask it directly: which deck leads, which week spiked, what changed after a post

## Security notes

- The client secret and refresh token live only in Vercel's environment variables —
  never in the repo, never in the browser.
- Client secrets **expire** (6, 12, or 24 months depending on what you chose).
  Put a calendar reminder a month before, or the endpoint will silently start
  falling back to logs.
- The endpoint validates email format, caps field lengths, and includes a honeypot
  field to absorb bots. If you ever get spammed harder, add a rate limit or
  a Cloudflare Turnstile check.
- **Before you email this list:** every message needs an unsubscribe link and a
  physical mailing address — CAN-SPAM requires both, and penalties are per email.

## If you'd rather not do Azure at all

Two fallbacks, both fine:

1. **Power Automate** — an "When an HTTP request is received" flow into "Add a row
   into a table." No code, but the HTTP trigger requires Power Automate Premium
   (about $15/month).
2. **Google Apps Script → Google Sheet** (see `google-apps-script-setup.md`),
   then open or link that sheet in Excel. Free and 10 minutes, at the cost of
   living in Google first.
