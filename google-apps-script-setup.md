# Crawl — Signup Capture → Google Sheet

This connects every email box on the site (newsletter, reservations, supporters)
to one spreadsheet you own. Free, no submission limit, no third-party service.

**Time: about 10 minutes, once.**

---

## Step 1 — Make the sheet

1. Go to <https://sheets.new>
2. Name it **Crawl Signups**
3. Leave it empty — the script writes the header row itself the first time.

## Step 2 — Add the script

In that sheet: **Extensions → Apps Script**. Delete whatever's in the editor and
paste this in full:

```javascript
const SHEET_NAME = 'Signups';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) sh = ss.insertSheet(SHEET_NAME);

    const cols = ['timestamp','email','type','decks','deck_count','value',
                  'source','remember_consent','referrer','user_agent'];

    if (sh.getLastRow() === 0) {
      sh.appendRow(cols);
      sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }

    const data = JSON.parse(e.postData.contents);
    sh.appendRow(cols.map(function (c) { return data[c] !== undefined ? data[c] : ''; }));

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Crawl signup endpoint is live.');
}
```

Save (the disk icon).

## Step 3 — Deploy it

1. **Deploy → New deployment**
2. Click the gear next to "Select type" → **Web app**
3. Description: `Crawl signups`
4. **Execute as: Me**
5. **Who has access: Anyone** ← this matters; "Anyone with Google account" will not work
6. **Deploy** → authorize when Google asks (it will warn it's an unverified app —
   that's your own script, click Advanced → Go to project)
7. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfy..../exec`

## Step 4 — Plug it into the site

Open `index.html`, find this line near the lead pipeline (search for `LEAD_ENDPOINT`):

```javascript
const LEAD_ENDPOINT = "";
```

Paste your URL between the quotes:

```javascript
const LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfy..../exec";
```

Leave `LEAD_MODE` as `"no-cors"`. Commit, push, done.

## Step 5 — Test it

Load the site, reserve a deck with your own email, then refresh the sheet.
A row should appear within a second or two.

---

## What lands in each row

| Column | Example | Why it matters |
|---|---|---|
| `timestamp` | 2026-07-18T14:03:11Z | When interest happened — spot campaign spikes |
| `email` | you@email.com | The list |
| `type` | reservation / newsletter / supporter | Separates buyers from readers |
| `decks` | Prime + Rebuild | **Which decks to film first** |
| `deck_count` | 2 | How many people want more than one |
| `value` | 88 | Reserved dollar value of demand |
| `source` | deckview | Which page converted them |
| `remember_consent` | yes | Their privacy choice |
| `referrer` | instagram.com | Which channel is actually working |
| `user_agent` | Mozilla/5.0… | Mobile vs desktop split |

## The questions this sheet answers

- Which deck do I film first? → sort by `decks`
- Is Instagram or word-of-mouth driving signups? → pivot on `referrer`
- Do people want bundles? → average `deck_count`
- How much demand is reserved? → sum `value`

---

## Nothing is lost before you set this up

Until `LEAD_ENDPOINT` is filled in, every signup is still saved in that visitor's
browser, and the footer link **"Export saved signups"** downloads them as CSV.
That's a testing safety net, not a real system — it only sees signups from the
browser you're sitting at. Set up the endpoint before you drive any real traffic.

## Notes

- Because of how Apps Script handles cross-origin requests, the site sends data
  "fire and forget" — the visitor always sees a success message, even in the rare
  case the request fails. If you'd rather have confirmed delivery, use Formspree
  or a Vercel function and set `LEAD_MODE = "cors"`.
- Anyone who finds the endpoint URL could post junk rows to it. For a launch-stage
  site this is a fine trade. If it ever becomes a problem, add a shared secret
  field to the payload and have the script reject rows without it.
- **Before you email this list:** add an unsubscribe link to every message and
  include a physical mailing address — both are required under the CAN-SPAM Act,
  and violations are fined per email.
