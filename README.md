# Crawl Walk Run Swing

A growing line of movement training card decks. Each deck: 52 drill cards across
four suits (Balance ◆, Reaction ●, Body Control ▲, Feel ■), every drill filmed at
four levels, with a QR on each card face that opens the film instantly. No app,
no gym, no subscription.

## The line

| Deck | For |
|---|---|
| **Crawl** | Athletes — youth to college and beyond |
| **Rebuild** | Strength after weight loss — keeping the muscle that matters |
| **Pump** | Fast, visible work in twenty minutes |
| **Carry** | New parents — carrying, lifting, and the floor |
| **Prime** | Strength that lasts — bone, muscle, and grip |

More decks in development. One deck donated to a DMV youth program per ten sold.

## Repo structure

```
index.html                    the entire site (HTML, CSS, JS in one file)
api/
  lead.js                     POST /api/lead — signups → Excel via Microsoft Graph
  research.js                 GET  /api/research — approved reading links
  research-suggest.js         weekly cron — Perplexity → Excel review queue
  _msgraph.js                 shared Microsoft Graph helpers
vercel.json                   cron schedule
lab-module.html               archived: quizzes, calculators, polls (not live)
beyond-deck-modules.html      archived: camps + gear pages with pricing (not live)
```

## Setup docs

- `MICROSOFT-EXCEL-SETUP.md` — connect signups to an Excel workbook in OneDrive
- `RESEARCH-QUEUE-SETUP.md` — weekly Perplexity suggestions you approve in Excel
- `google-apps-script-setup.md` — alternative: Google Sheets instead of Excel

## Deploy

Import into Vercel. No build step — `index.html` is served as-is and everything
in `api/` becomes a serverless function automatically.

Environment variables required for the API routes (set in Vercel, never in this repo):
`MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_REFRESH_TOKEN`, `MS_WORKBOOK_PATH`,
`MS_TABLE_NAME`, `PERPLEXITY_API_KEY`, `CRON_SECRET`.

Without them the site still runs — signups fall back to server logs and browser
storage, and reading lists fall back to the curated links built into the page.

## Status

Pre-launch. All decks are filmed before anything ships; reservations are free and
carry no charge. Nothing on the site takes payment yet.
