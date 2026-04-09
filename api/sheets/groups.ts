import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionFromRequest, getValidAccessToken } from '../_lib/auth.js';

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
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Find a date tab to read data validation from
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metadataResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch sheet metadata' });
    }

    const metadata = await metadataResponse.json();
    const sheets = metadata.sheets || [];
    const dateTabPattern = /^(\d{1,2})\/(\d{1,2})\s+(MON|TUE|WED|THU|FRI|SAT|SUN)$/;
    const dateTabs = sheets
      .map((s: any) => s.properties.title)
      .filter((title: string) => dateTabPattern.test(title));

    if (dateTabs.length === 0) {
      return res.status(200).json({ groups: [] });
    }

    // Fetch grid data with validation rules from the first date tab
    const firstTab = dateTabs[0];
    const gridUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=true&ranges='${firstTab}'!A1:Z10`;

    const gridResponse = await fetch(gridUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!gridResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch grid data' });
    }

    const gridData = await gridResponse.json();
    const sheet = gridData.sheets?.[0];
    const rowData = sheet?.data?.[0]?.rowData || [];

    // Row 2 (index 1) has headers
    const headers = rowData[1]?.values || [];
    const headerNames = headers.map((cell: any) => cell?.formattedValue || '');
    const groupColIndex = headerNames.findIndex((h: string) =>
      h.toLowerCase().trim() === 'group'
    );

    if (groupColIndex === -1) {
      return res.status(200).json({ groups: [] });
    }

    // Row 3 (index 2) has data with validation
    const groupCell = rowData[2]?.values?.[groupColIndex];
    const validation = groupCell?.dataValidation;

    if (!validation || validation.condition?.type !== 'ONE_OF_LIST') {
      return res.status(200).json({ groups: [] });
    }

    // Extract group options from validation rule
    const values = validation.condition.values || [];
    const groups = values
      .map((v: any) => v.userEnteredValue)
      .filter((value: string) => value && value.trim())
      .map((value: string) => value.trim());

    return res.status(200).json({ groups });

  } catch (error) {
    console.error('[groups] Error fetching groups:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
