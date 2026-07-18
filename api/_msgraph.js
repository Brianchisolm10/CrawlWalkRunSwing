/**
 * Shared Microsoft Graph helpers for the Crawl endpoints.
 * Consumer (Microsoft 365 Personal) accounts: we exchange a stored refresh
 * token for a short-lived access token on each request.
 */

export const GRAPH = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';

export async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    refresh_token: process.env.MS_REFRESH_TOKEN,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/Files.ReadWrite offline_access'
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) throw new Error('Token exchange failed: ' + res.status);
  return (await res.json()).access_token;
}

function tableUrl(table, suffix) {
  const path = encodeURI(process.env.MS_WORKBOOK_PATH);
  return `${GRAPH}/me/drive/root:/${path}:/workbook/tables/${encodeURIComponent(table)}${suffix}`;
}

export async function graphAppendRows(token, table, rows) {
  const res = await fetch(tableUrl(table, '/rows/add'), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows })
  });
  if (!res.ok) throw new Error('Graph append failed: ' + res.status + ' ' + (await res.text()).slice(0, 200));
  return true;
}

export async function graphReadRows(token, table) {
  const res = await fetch(tableUrl(table, '/rows'), {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) throw new Error('Graph read failed: ' + res.status);
  const json = await res.json();
  return (json.value || []).map((r) => r.values?.[0] || []);
}
