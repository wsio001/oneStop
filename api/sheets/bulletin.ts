import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionFromRequest, getValidAccessToken } from '../_lib/auth.js';

/**
 * Fetch bulletin tab data with hyperlinks
 * Unlike /api/sheets/data which uses values:batchGet (text only),
 * this endpoint uses spreadsheets.get with fields to extract hyperlinks
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get session
    const sessionId = await getSessionFromRequest(req);
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(sessionId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get sheet ID from env
    const sheetId = process.env.IRVINE_SHEET_ID;
    if (!sheetId) {
      return res.status(500).json({ error: 'Sheet ID not configured' });
    }

    // Get bulletin tab name from query
    const { tabName } = req.query;
    if (!tabName || typeof tabName !== 'string') {
      return res.status(400).json({ error: 'Missing tabName parameter' });
    }

    // First, get sheet metadata to find the bulletin tab's sheetId
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!metadataResponse.ok) {
      const error = await metadataResponse.text();
      console.error('Metadata API error:', error);
      return res.status(metadataResponse.status).json({ error: 'Failed to fetch metadata' });
    }

    const metadata = await metadataResponse.json();
    const sheet = metadata.sheets?.find((s: any) => s.properties.title === tabName);

    if (!sheet) {
      return res.status(404).json({ error: `Tab "${tabName}" not found` });
    }

    const bulletinSheetId = sheet.properties.sheetId;

    // Now fetch the bulletin sheet with hyperlinks
    const dataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?ranges=${encodeURIComponent(tabName)}&fields=sheets.data.rowData.values(formattedValue,hyperlink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!dataResponse.ok) {
      const error = await dataResponse.text();
      console.error('Bulletin data API error:', error);
      return res.status(dataResponse.status).json({ error: 'Failed to fetch bulletin data' });
    }

    const data = await dataResponse.json();

    // Extract data with hyperlinks
    const sheetData = data.sheets?.[0]?.data?.[0];
    const rowData = sheetData?.rowData || [];

    // Convert to array format with hyperlinks
    const rows: Array<{ values: string[]; hyperlinks: (string | null)[] }> = [];

    for (const row of rowData) {
      const values: string[] = [];
      const hyperlinks: (string | null)[] = [];

      if (row.values) {
        for (const cell of row.values) {
          values.push(cell.formattedValue || '');
          hyperlinks.push(cell.hyperlink || null);
        }
      }

      rows.push({ values, hyperlinks });
    }

    console.log(`[Bulletin API] Fetched ${rows.length} rows from "${tabName}"`);

    return res.status(200).json({ rows });
  } catch (error) {
    console.error('Bulletin fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch bulletin data' });
  }
}
