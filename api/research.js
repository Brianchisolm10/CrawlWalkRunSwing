/**
 * Crawl — approved research feed
 * GET /api/research  →  { crawl:[...], rebuild:[...], ... }
 *
 * Serves ONLY rows from the Research table where approved = "yes".
 * The site falls back to its built-in curated list if this returns nothing,
 * so the page is never empty and never shows unreviewed links.
 *
 * Excel "Research" table columns, in order:
 *   date | deck | title | source | url | note | approved
 */

import { getAccessToken, graphReadRows } from './_msgraph.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const configured =
    process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET &&
    process.env.MS_REFRESH_TOKEN && process.env.MS_WORKBOOK_PATH;

  if (!configured) return res.status(200).json({});

  try {
    const token = await getAccessToken();
    const rows = await graphReadRows(token, 'Research');
    const out = {};

    for (const r of rows) {
      const [, deck, title, source, url, note, approved] = r;
      if (String(approved || '').trim().toLowerCase() !== 'yes') continue;
      if (!/^https:\/\//.test(String(url || ''))) continue;
      const key = String(deck || '').trim().toLowerCase();
      if (!key) continue;
      (out[key] = out[key] || []).push({
        t: String(title || ''),
        s: String(source || ''),
        u: String(url),
        n: String(note || '')
      });
    }

    // newest first, cap at 6 per deck so the page stays readable
    for (const k of Object.keys(out)) out[k] = out[k].reverse().slice(0, 6);

    return res.status(200).json(out);
  } catch (err) {
    console.error('[research]', err.message);
    return res.status(200).json({});
  }
}
