import type { LocationConfig } from '../types';

export const IRVINE_CONFIG: LocationConfig = {
  location_id: 'irvine',
  display_name: 'Irvine',
  region_id: 'west_coast',
  sheet_id: process.env.IRVINE_SHEET_ID || '',
  timezone: 'America/Los_Angeles',
  tab_discovery: {
    pattern: '^(\\d{1,2})/(\\d{1,2})\\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$',
    bulletin_tab_name: 'Bulletin',
  },
  schema_version: 1,
  header_row: 1,
  data_start_row: 2,
  column_map: {
    time: ['Time', 'When', 'Start'],
    event_name: ['Event', 'Activity', 'What'],
    location: ['Where', 'Room', 'Location'],
    in_charge: ['In Charge', 'Lead', 'Owner', 'Leader'],
    helpers: ['Helpers', 'Team', 'Volunteers'],
    childcare: ['Childcare', 'Kids', 'Children'],
    food: ['Food', 'Meal', 'Snacks'],
    group: ['Group', 'Ministry', 'Dept', 'Department'],
    notes: ['Notes', 'Comments', 'Info'],
  },
  transform_override: null,
};

// Registry for future multi-location support
export const LOCATION_CONFIGS: Record<string, LocationConfig> = {
  irvine: IRVINE_CONFIG,
};

export function getLocationConfig(locationId: string): LocationConfig | null {
  return LOCATION_CONFIGS[locationId] || null;
}
