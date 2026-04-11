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
    const datePattern = /^(\d{1,2})\/(\d{1,2})\s+(MON|TUE|WED|THU|FRI|SAT|SUN)$/i;
    const bulletinTabName = 'BULLETIN 📢'; // From IRVINE_CONFIG.tab_discovery.bulletin_tab_name
    const dateTabs: { date: string; tab_name: string }[] = [];
    let bulletinTab: { date: string; tab_name: string } | null = null;

    for (const tab of tabs) {
      const title = tab.title.trim();

      // Check if it's a bulletin tab (exact match)
      if (title === bulletinTabName) {
        bulletinTab = { date: 'bulletin', tab_name: title };
        console.log(`[Discovery] Found bulletin tab: "${title}"`);
        continue;
      }

      // Check if it matches date pattern
      const match = title.match(datePattern);
      console.log(`[Discovery] Tab "${title}" - Pattern match:`, match ? 'YES' : 'NO');
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

    // Filter to today + 14 days forward (15 days total)
    // IMPORTANT: Hardcoded to Pacific timezone for single-location launch (Irvine)
    // Phase 5 TODO: Get timezone from LocationConfig based on ?city=<city_id> query param
    // For multi-location support, change to:
    //   const city = req.query.city as string || 'irvine';
    //   const config = getLocationConfig(city);
    //   const timezone = config.timezone;
    const timezone = 'America/Los_Angeles';
    const now = new Date();

    // Get today's date in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')!.value, 10);
    const month = parseInt(parts.find(p => p.type === 'month')!.value, 10);
    const day = parseInt(parts.find(p => p.type === 'day')!.value, 10);

    // Create midnight today in the target timezone
    const today = new Date(year, month - 1, day, 0, 0, 0, 0);
    const fourteenDaysFromNow = new Date(today);
    fourteenDaysFromNow.setDate(today.getDate() + 14);

    console.log(`[Discovery] Date filter: ${today.toISOString()} to ${fourteenDaysFromNow.toISOString()}`);
    console.log(`[Discovery] Found ${dateTabs.length} date tabs before filtering:`, dateTabs.map(t => t.date));

    const filteredDateTabs = dateTabs.filter(tab => {
      const tabDate = new Date(tab.date);
      const isInRange = tabDate >= today && tabDate <= fourteenDaysFromNow;
      console.log(`[Discovery] Tab ${tab.tab_name} (${tab.date}): ${isInRange ? 'INCLUDED' : 'EXCLUDED'}`);
      return isInRange;
    });

    console.log(`[Discovery] Returning ${filteredDateTabs.length} filtered tabs:`, filteredDateTabs.map(t => t.tab_name));

    // Return discovery result
    const result = {
      date_tabs: filteredDateTabs,
      bulletin_tab: bulletinTab,
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Discovery error:', error);
    return res.status(500).json({ error: 'Failed to discover tabs' });
  }
}
