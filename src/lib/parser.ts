import type { Event, LocationConfig } from '../types';
import { fnv1a } from './hash';

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

    // Parse multi-value fields (split by comma)
    const inCharge = fieldIndex.in_charge !== undefined
      ? (row[fieldIndex.in_charge] || '').toString().split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const helpers = fieldIndex.helpers !== undefined
      ? (row[fieldIndex.helpers] || '').toString().split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const childcare = fieldIndex.childcare !== undefined
      ? (row[fieldIndex.childcare] || '').toString().split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const food = fieldIndex.food !== undefined
      ? (row[fieldIndex.food] || '').toString().split(',').map(s => s.trim()).filter(Boolean)
      : [];

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
      helpers,
      childcare,
      food,
      group,
      notes,
      raw_tab: tabName,
    };

    events.push(event);
  }

  // Sort by time
  return events.sort((a, b) => a.sortKey - b.sortKey);
}
