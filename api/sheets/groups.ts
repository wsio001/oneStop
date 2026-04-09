import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionFromRequest, getValidAccessToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session and access token
    const sessionId = await getSessionFromRequest(req);
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const accessToken = await getValidAccessToken(sessionId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const sheetId = process.env.IRVINE_SHEET_ID;
    if (!sheetId) {
      console.error('Missing IRVINE_SHEET_ID env var');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Fetch sheet metadata to get all tabs
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metadataResponse.ok) {
      console.error('Failed to fetch sheet metadata:', await metadataResponse.text());
      return res.status(500).json({ error: 'Failed to fetch sheet metadata' });
    }

    const metadata = await metadataResponse.json();
    const sheets = metadata.sheets || [];

    // Filter for date tabs (matching the pattern: "M/D Day")
    const dateTabPattern = /^(\d{1,2})\/(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/;
    const dateTabs = sheets
      .map((s: any) => s.properties.title)
      .filter((title: string) => dateTabPattern.test(title));

    if (dateTabs.length === 0) {
      return res.status(200).json({ groups: [] });
    }

    // Fetch data from all date tabs
    const ranges = dateTabs.map((tab: string) => `'${tab}'!A:Z`);
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')}`;

    const batchResponse = await fetch(batchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!batchResponse.ok) {
      console.error('Failed to fetch sheet data:', await batchResponse.text());
      return res.status(500).json({ error: 'Failed to fetch sheet data' });
    }

    const batchData = await batchResponse.json();
    const valueRanges = batchData.valueRanges || [];

    // Extract unique groups from all tabs
    const groupsSet = new Set<string>();

    for (const valueRange of valueRanges) {
      const rows = valueRange.values || [];
      if (rows.length < 2) continue; // Need at least header + 1 data row

      const headers = rows[0].map((h: string) => h.toLowerCase().trim());
      const groupColIndex = headers.findIndex((h: string) =>
        ['group', 'ministry', 'dept', 'department'].includes(h)
      );

      if (groupColIndex === -1) continue;

      // Extract groups from data rows (skip header)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const groupValue = row[groupColIndex];

        if (groupValue && typeof groupValue === 'string') {
          const trimmed = groupValue.trim();
          if (trimmed && trimmed !== '-' && trimmed !== 'N/A') {
            groupsSet.add(trimmed);
          }
        }
      }
    }

    // Convert to array and sort
    const groups = Array.from(groupsSet).sort();

    return res.status(200).json({ groups });

  } catch (error) {
    console.error('Error fetching groups:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
