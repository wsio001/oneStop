import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionFromRequest, getValidAccessToken } from '../_lib/auth.js';

type SheetTab = {
  sheetId: number;
  title: string;
  index: number;
};

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

    // Fetch sheet metadata
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties(sheetId,title,index)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!sheetsResponse.ok) {
      const error = await sheetsResponse.text();
      console.error('Sheets API error:', error);
      return res.status(sheetsResponse.status).json({ error: 'Failed to fetch sheet metadata' });
    }

    const data = await sheetsResponse.json();
    const tabs: SheetTab[] = data.sheets?.map((s: any) => s.properties) || [];

    // Parse tab names to find date tabs and bulletin
    const datePattern = /^(\d{1,2})\/(\d{1,2})\s+(MON|TUE|WED|THU|FRI|SAT|SUN)$/;
    const dateTabs: { date: string; tab_name: string }[] = [];
    let bulletinTab: { date: string; tab_name: string } | null = null;

    for (const tab of tabs) {
      const title = tab.title.trim();

      // Check if it's a bulletin tab
      if (title.toLowerCase() === 'bulletin') {
        bulletinTab = { date: 'bulletin', tab_name: title };
        continue;
      }

      // Check if it matches date pattern
      const match = title.match(datePattern);
      if (match) {
        // Parse date (M/D format)
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const currentYear = new Date().getFullYear();

        // Build a date object for sorting
        let year = currentYear;
        const testDate = new Date(year, month - 1, day);

        // If the date would be >6 months in the past, assume it's next year
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        if (testDate < sixMonthsAgo) {
          year += 1;
        }

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dateTabs.push({ date: dateStr, tab_name: title });
      }
    }

    // Sort date tabs by date
    dateTabs.sort((a, b) => a.date.localeCompare(b.date));

    // Return discovery result
    const result = {
      date_tabs: dateTabs,
      bulletin_tab: bulletinTab,
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Discovery error:', error);
    return res.status(500).json({ error: 'Failed to discover tabs' });
  }
}
