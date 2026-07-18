/**
 * Crawl — signup capture endpoint
 * POST /api/lead  →  appends a row to an Excel table in OneDrive via Microsoft Graph
 *
 * Required Vercel environment variables (see MICROSOFT-EXCEL-SETUP.md):
 *   MS_CLIENT_ID
 *   MS_CLIENT_SECRET
 *   MS_REFRESH_TOKEN
 *   MS_WORKBOOK_PATH   e.g. "Crawl/CrawlSignups.xlsx"
 *   MS_TABLE_NAME      e.g. "Signups"
 *
 * If the env vars are absent the endpoint still returns 200 and logs the lead,
 * so the site never shows an error while you finish the Azure setup.
 */

const COLUMNS = [
  'timestamp', 'email', 'type', 'decks', 'deck_count', 'value',
  'source', 'remember_consent', 'referrer', 'user_agent'
];

import { getAccessToken, graphAppendRows } from './_msgraph.js';

function isValidEmail(v) {
  return typeof v === 'string' && v.length < 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  data = data || {};

  if (!isValidEmail(data.email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  // Honeypot: real users never fill this. Silently accept, never store.
  if (data.company) return res.status(200).json({ ok: true });

  const row = {
    timestamp: new Date().toISOString(),
    email: String(data.email).slice(0, 200),
    type: String(data.type || 'unknown').slice(0, 40),
    decks: String(data.decks || '').slice(0, 200),
    deck_count: Number(data.deck_count) || 0,
    value: Number(data.value) || 0,
    source: String(data.source || '').slice(0, 60),
    remember_consent: String(data.remember_consent || '').slice(0, 10),
    referrer: String(data.referrer || '').slice(0, 300),
    user_agent: String(data.user_agent || '').slice(0, 300)
  };

  const configured =
    process.env.MS_CLIENT_ID &&
    process.env.MS_CLIENT_SECRET &&
    process.env.MS_REFRESH_TOKEN &&
    process.env.MS_WORKBOOK_PATH;

  if (!configured) {
    console.log('[lead] Excel not configured yet — captured:', JSON.stringify(row));
    return res.status(200).json({ ok: true, stored: 'log-only' });
  }

  try {
    const token = await getAccessToken();
    await graphAppendRows(token, process.env.MS_TABLE_NAME || 'Signups', [COLUMNS.map((c) => row[c])]);
    return res.status(200).json({ ok: true, stored: 'excel' });
  } catch (err) {
    // Never lose a signup to an API hiccup: log it so it can be recovered
    // from Vercel's runtime logs, and still confirm to the visitor.
    console.error('[lead] Excel write failed:', err.message);
    console.log('[lead] RECOVERABLE ROW:', JSON.stringify(row));
    return res.status(200).json({ ok: true, stored: 'log-fallback' });
  }
}
