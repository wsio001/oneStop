import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionFromRequest, getValidAccessToken } from '../_lib/auth.js';

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

    // Get tabs parameter
    const { tabs } = req.query;
    if (!tabs || typeof tabs !== 'string') {
      return res.status(400).json({ error: 'Missing tabs parameter' });
    }

    const tabList = tabs.split(',').map(t => t.trim());

    if (tabList.length === 0) {
      return res.status(400).json({ error: 'No tabs specified' });
    }

    // Build ranges for batchGet (request entire tab)
    const ranges = tabList.map(tab => encodeURIComponent(tab));

    // Fetch data from Google Sheets API
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${ranges.map(r => `ranges=${r}`).join('&')}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!sheetsResponse.ok) {
      const error = await sheetsResponse.text();
      console.error('Sheets API error:', error);
      return res.status(sheetsResponse.status).json({ error: 'Failed to fetch sheet data' });
    }

    const data = await sheetsResponse.json();

    // Build response mapping tab names to their values
    const result: Record<string, string[][]> = {};

    if (data.valueRanges) {
      for (let i = 0; i < data.valueRanges.length; i++) {
        const range = data.valueRanges[i];
        const tabName = tabList[i];
        result[tabName] = range.values || [];
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Data fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
}
