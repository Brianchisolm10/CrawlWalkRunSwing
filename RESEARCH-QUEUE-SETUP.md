# Research Review Queue — Perplexity suggests, you approve

Each deck page shows a "The research behind it" section. This system keeps those
links fresh **without ever publishing something you haven't read.**

## How it works

1. **Weekly**, a Vercel cron job hits `/api/research-suggest`.
2. That endpoint asks **Perplexity** for credible new studies on each deck's topic.
3. Results land in a **Research** sheet in your Excel workbook with `approved = no`.
4. **You are the review queue.** Open the workbook, read what came in, and type
   `yes` in the approved column for anything worth publishing.
5. `/api/research` serves only the `yes` rows. The site merges them with the
   built-in curated links and shows up to six per deck.

Nothing you haven't approved is ever visible on the site. If the API is down,
misconfigured, or empty, the page silently falls back to the curated list — so
a deck page is never blank and never shows an unvetted link.

## Setup

### 1. Add the Research table to your workbook

Same file as your signups (`Crawl/CrawlSignups.xlsx`). Add a second sheet named
**Research**, with these seven headers in A1:G1:

```
date | deck | title | source | url | note | approved
```

Select A1:G1 → **Insert → Table** → check "My table has headers" → in
**Table Design**, name the table **Research**.

### 2. Get a Perplexity API key

<https://www.perplexity.ai/settings/api> → generate a key. Usage is pay-as-you-go
and this job runs 5 queries a week, so expect very low single-digit dollars monthly.

### 3. Add environment variables in Vercel

| Name | Value |
|---|---|
| `PERPLEXITY_API_KEY` | your key |
| `PERPLEXITY_MODEL` | `sonar` (optional) |
| `CRON_SECRET` | any random string (optional but recommended) |

The `MS_*` variables from `MICROSOFT-EXCEL-SETUP.md` must already be set — this
system writes to the same workbook.

### 4. Deploy

`vercel.json` already contains the schedule:

```json
{ "crons": [{ "path": "/api/research-suggest", "schedule": "0 13 * * 1" }] }
```

That's Mondays at 13:00 UTC (about 9am Eastern). Vercel's Hobby plan allows
daily-or-less frequency, so weekly is comfortably within limits.

### 5. Test it manually

Visit `https://yourdomain.com/api/research-suggest?key=YOUR_CRON_SECRET`.
It returns how many rows it queued. Open the workbook — pending rows should be there.

## Your weekly review, in about three minutes

1. Open the workbook → **Research** sheet
2. Filter `approved = no`
3. For each row, click the URL and skim it. Ask:
   - Is the publisher credible? (journal, university, hospital, ACOG/ACSM/NSCA/CDC/NIH)
   - Does it actually support what the deck claims, or contradict it?
   - Is the `note` an honest summary, or overselling?
4. Type `yes` on the keepers. Delete the junk rows outright.
5. Changes appear on the site within the hour (the endpoint caches for 60 minutes).

**Approve nothing you haven't opened.** The whole point of this design is that a
human read it. An AI-suggested link on a page selling health products to new
parents and people on medication is exactly the wrong place to trust automation.

## Things worth knowing

- **Duplicates**: the site de-duplicates by URL, and approved links are shown
  newest-first, so an old curated link naturally falls off once six newer ones
  are approved.
- **Model names change.** If `sonar` ever stops working, check Perplexity's
  current model list and update `PERPLEXITY_MODEL` — no code change needed.
- **AI can misdescribe a study.** Rewrite the `note` cell in your own words when
  it's not quite right. Your wording, your credibility.
- **Never let a link imply your product is clinically proven.** These are
  educational context for the ideas behind a deck, not evidence that the deck
  itself was tested. The page already says "Educational reading, not medical
  advice" — keep that line.
