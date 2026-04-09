import type { LocationConfig } from '../types';

export const IRVINE_CONFIG: LocationConfig = {
  location_id: 'irvine',
  display_name: 'Irvine',
  region_id: 'west_coast',
  sheet_id: '', // Not needed on client - API routes use process.env.IRVINE_SHEET_ID
  timezone: 'America/Los_Angeles',
  tab_discovery: {
    pattern: '^(\\d{1,2})/(\\d{1,2})\\s+(MON|TUE|WED|THU|FRI|SAT|SUN)$',
    bulletin_tab_name: 'Bulletin',
  },
  schema_version: 1,
  header_row: 2,
  data_start_row: 3,
  column_map: {
    time: ['Start Time', 'START TIME', 'Time', 'When', 'Start'],
    event_name: ['What', 'WHAT', 'Event', 'Activity'],
    location: ['Location', 'LOCATION', 'Where', 'Room'],
    in_charge: ['In Charge', 'IN CHARGE', 'Lead', 'Owner', 'Leader'],
    helpers: ['Helpers', 'HELPERS', 'Team', 'Volunteers'],
    childcare: ['Childcare', 'CHILDCARE', 'Kids', 'Children'],
    food: ['Food', 'FOOD', 'Meal', 'Snacks'],
    group: ['Group', 'GROUP', 'Ministry', 'Dept', 'Department'],
    notes: ['Notes', 'NOTES', 'Comments', 'Info'],
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
