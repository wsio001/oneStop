import type { Event, LocationConfig, BulletinPost } from '../types';
import { fnv1a } from './hash';

/**
 * Split multi-value cell on all separators: , : / + & and word "and"
 * Preserves the original formatting while extracting individual elements
 */
function splitMultiValueCell(cellValue: string): string[] {
  if (!cellValue || cellValue.trim() === '') {
    return [];
  }

  // Split on: comma, colon, slash, plus, ampersand, and the word "and" (with word boundaries)
  // Use word boundaries \b to avoid splitting "and" inside words like "Anderson" or "band"
  const parts = cellValue.split(/[,:\/+&]|\band\b/i);

  return parts
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

export function parseTimeToMinutes(timeStr: string): number {
  const cleaned = timeStr.trim().toLowerCase();

  // Try to match patterns like "7:00 PM", "7:00pm", "19:00", "7 PM", etc.
  const patterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,  // 7:00 PM
    /(\d{1,2})\s*(am|pm)/i,           // 7 PM
    /(\d{1,2}):(\d{2})/,              // 19:00 (24-hour)
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3] || match[2];

      // Handle AM/PM
      if (meridiem && typeof meridiem === 'string') {
        const isPM = meridiem.toLowerCase().includes('pm');
        const isAM = meridiem.toLowerCase().includes('am');

        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }

      return hours * 60 + minutes;
    }
  }

  // Fallback: return Infinity so unparseable times sort last
  return Infinity;
}

export function parseSheetTab(
  tabName: string,
  values: string[][],
  config: LocationConfig
): Event[] {
  if (!values || values.length < config.data_start_row) {
    return [];
  }

  // Get header row (convert to 0-indexed)
  const headerRowIndex = config.header_row - 1;
  if (values.length <= headerRowIndex) {
    console.warn(`Tab "${tabName}": Not enough rows for header at row ${config.header_row}`);
    return [];
  }

  const headers = values[headerRowIndex];

  // Build field index map
  const fieldIndex: Record<string, number> = {};

  for (const [canonicalField, aliases] of Object.entries(config.column_map)) {
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const header = (headers[colIdx] || '').toString().trim().toLowerCase();
      if (aliases.some(alias => header === alias.trim().toLowerCase())) {
        fieldIndex[canonicalField] = colIdx;
        break;
      }
    }
  }

  // Check for required fields
  if (fieldIndex.time === undefined || fieldIndex.event_name === undefined) {
    console.warn(
      `Tab "${tabName}": Missing required columns. Found headers:`,
      headers,
      'Field map:',
      fieldIndex,
      'Looking for time aliases:',
      config.column_map.time,
      'Headers normalized:',
      headers.map(h => (h || '').toString().trim().toLowerCase())
    );
    return [];
  }

  // Parse data rows
  const events: Event[] = [];
  const dataStartIndex = config.data_start_row - 1;

  for (let rowIdx = dataStartIndex; rowIdx < values.length; rowIdx++) {
    const row = values[rowIdx];
    if (!row || row.length === 0) continue;

    const timeCell = (row[fieldIndex.time] || '').toString().trim();
    if (!timeCell) continue; // Skip rows with no time

    const eventNameCell = (row[fieldIndex.event_name] || '').toString().trim();
    if (!eventNameCell) continue; // Skip rows with no event name

    // Parse multi-value fields (split on all separators: , : / + & and "and")
    // Store both the split array (for matching) and raw text (for display)
    const inChargeRaw = fieldIndex.in_charge !== undefined
      ? (row[fieldIndex.in_charge] || '').toString().trim() || null
      : null;
    const inCharge = inChargeRaw ? splitMultiValueCell(inChargeRaw) : [];

    const helpersRaw = fieldIndex.helpers !== undefined
      ? (row[fieldIndex.helpers] || '').toString().trim() || null
      : null;
    const helpers = helpersRaw ? splitMultiValueCell(helpersRaw) : [];

    const childcareRaw = fieldIndex.childcare !== undefined
      ? (row[fieldIndex.childcare] || '').toString().trim() || null
      : null;
    const childcare = childcareRaw ? splitMultiValueCell(childcareRaw) : [];

    const foodRaw = fieldIndex.food !== undefined
      ? (row[fieldIndex.food] || '').toString().trim() || null
      : null;
    const food = foodRaw ? splitMultiValueCell(foodRaw) : [];

    // Single-value fields
    const location = fieldIndex.location !== undefined
      ? (row[fieldIndex.location] || '').toString().trim() || null
      : null;

    const group = fieldIndex.group !== undefined
      ? (row[fieldIndex.group] || '').toString().trim() || null
      : null;

    const notes = fieldIndex.notes !== undefined
      ? (row[fieldIndex.notes] || '').toString().trim() || null
      : null;

    // Generate stable ID
    const id = fnv1a(`${tabName}:${rowIdx}`);

    // Build event
    const event: Event = {
      id,
      time: timeCell,
      sortKey: parseTimeToMinutes(timeCell),
      event_name: eventNameCell,
      location,
      in_charge: inCharge,
      in_charge_raw: inChargeRaw,
      helpers,
      helpers_raw: helpersRaw,
      childcare,
      childcare_raw: childcareRaw,
      food,
      food_raw: foodRaw,
      group,
      notes,
      raw_tab: tabName,
    };

    events.push(event);
  }

  // Sort by time
  return events.sort((a, b) => a.sortKey - b.sortKey);
}

/**
 * Parse bulletin tab from sheet values
 * Expected columns: Date, Posted By, Subject, Body, Link URL, Link Label
 */
export function parseBulletinTab(
  tabName: string,
  values: string[][]
): BulletinPost[] {
  if (!values || values.length < 3) {
    return [];
  }

  // Row 2 is header (index 1), data starts at row 3 (index 2)
  const headerRowIndex = 1;
  const headers = values[headerRowIndex];

  // Find column indices (case-insensitive)
  const dateIdx = headers.findIndex(h =>
    h && h.toLowerCase().trim() === 'date'
  );
  const postedByIdx = headers.findIndex(h =>
    h && h.toLowerCase().trim() === 'posted by'
  );
  const subjectIdx = headers.findIndex(h =>
    h && h.toLowerCase().trim() === 'subject'
  );
  // Look for "what" column (your sheet uses WHAT instead of BODY)
  const bodyIdx = headers.findIndex(h =>
    h && h.toLowerCase().trim() === 'what'
  );
  // Look for single "link" column (your sheet uses LINK instead of separate LINK URL and LINK LABEL)
  const linkIdx = headers.findIndex(h =>
    h && h.toLowerCase().trim() === 'link'
  );

  // Check for required columns
  if (dateIdx === -1 || postedByIdx === -1 || subjectIdx === -1 || bodyIdx === -1) {
    console.warn(
      `Bulletin tab "${tabName}": Missing required columns. Found headers:`,
      headers
    );
    return [];
  }

  const posts: BulletinPost[] = [];

  // Parse data rows starting from row 3 (index 2)
  for (let rowIdx = 2; rowIdx < values.length; rowIdx++) {
    const row = values[rowIdx];
    if (!row || row.length === 0) continue;

    const date = (row[dateIdx] || '').toString().trim();
    if (!date) continue; // Skip rows with no date

    const posted_by = (row[postedByIdx] || '').toString().trim();
    const subject = (row[subjectIdx] || '').toString().trim();
    const body = (row[bodyIdx] || '').toString().trim();

    if (!subject || !body) continue; // Skip rows with no subject/body

    // Single LINK column contains the URL
    const link_url = linkIdx !== -1
      ? (row[linkIdx] || '').toString().trim() || null
      : null;
    // No separate link label column, will use default "Open link →"
    const link_label = null;

    // Generate stable ID
    const id = fnv1a(`${tabName}:${rowIdx}`);

    posts.push({
      id,
      date,
      posted_by,
      subject,
      body,
      link_url,
      link_label,
    });
  }

  // Return in order (newest first will be handled by the component)
  return posts;
}
