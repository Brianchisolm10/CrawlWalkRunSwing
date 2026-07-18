/**
 * Crawl — research suggestion crawler
 * GET /api/research-suggest   (run weekly by Vercel cron; see vercel.json)
 *
 * Asks Perplexity for recent, credible reading on each deck's topic and appends
 * the results to a "Research" table in your Excel workbook with approved = "no".
 *
 * NOTHING GOES LIVE AUTOMATICALLY. You approve rows in Excel by typing "yes"
 * in the approved column. /api/research only ever serves approved rows.
 *
 * Env vars (in addition to the MS_* vars used by /api/lead):
 *   PERPLEXITY_API_KEY
 *   PERPLEXITY_MODEL     optional, defaults to "sonar"
 *   CRON_SECRET          optional; if set, requests must send ?key=<secret>
 */

import { getAccessToken, graphAppendRows, GRAPH } from './_msgraph.js';

const TOPICS = {
  crawl:   'youth athlete neuromuscular training, balance training, landing mechanics and sports injury prevention',
  rebuild: 'preserving lean muscle mass during weight loss and GLP-1 receptor agonist therapy, resistance training and protein intake',
  pump:    'bodyweight resistance training, time-efficient workouts, training proximity to failure and muscle hypertrophy',
  prime:   'grip strength as a health biomarker, bone density and resistance training, power and fall prevention with aging',
  carry:   'postpartum and new-parent physical activity guidelines, safe return to exercise, carrying and lifting mechanics'
};

const PROMPT = (topic) => `Find 3 credible, recently published articles or studies about: ${topic}.

Rules:
- Only peer-reviewed journals, university/hospital publications, government health agencies, or major professional bodies (ACOG, ACSM, NSCA, CDC, NIH).
- No blogs, no supplement sellers, no content marketing, no paywalled-only pages if avoidable.
- Prefer sources published in the last 3 years.

Return ONLY a JSON array, no prose, no markdown fences, in this exact shape:
[{"title":"...","source":"publication name","url":"https://...","note":"one plain-language sentence on what it found"}]`;

async function askPerplexity(topic) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.PERPLEXITY_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || 'sonar',
      messages: [{ role: 'user', content: PROMPT(topic) }],
      temperature: 0.2
    })
  });

  if (!res.ok) throw new Error('Perplexity ' + res.status + ': ' + (await res.text()).slice(0, 200));

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  if (!process.env.PERPLEXITY_API_KEY) {
    return res.status(200).json({ ok: false, error: 'PERPLEXITY_API_KEY not set' });
  }

  const found = {};
  const rows = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const [deck, topic] of Object.entries(TOPICS)) {
    try {
      const items = await askPerplexity(topic);
      found[deck] = items.length;
      for (const it of items) {
        if (!it?.url || !/^https:\/\//.test(it.url)) continue;
        rows.push([
          today,
          deck,
          String(it.title || '').slice(0, 300),
          String(it.source || '').slice(0, 120),
          String(it.url).slice(0, 500),
          String(it.note || '').slice(0, 400),
          'no' // approved — you flip this to "yes" in Excel
        ]);
      }
    } catch (err) {
      console.error('[research-suggest]', deck, err.message);
      found[deck] = 'error';
    }
  }

  if (!rows.length) return res.status(200).json({ ok: true, queued: 0, found });

  try {
    const token = await getAccessToken();
    await graphAppendRows(token, 'Research', rows);
    return res.status(200).json({ ok: true, queued: rows.length, found });
  } catch (err) {
    console.error('[research-suggest] Excel write failed:', err.message);
    console.log('[research-suggest] ROWS:', JSON.stringify(rows));
    return res.status(200).json({ ok: false, error: 'Queued to logs only', queued: rows.length });
  }
}
