export type Person = {
  display_name: string;
  aliases: string[];
};

export type Membership = {
  city_id: string;
  city_name: string;
  region_id: string;
  self: Person;
  spouse: Person | null;
  dependents: Person[];
  groups: string[];
  gender: 'male' | 'female';
  married: boolean;
  show_spouse_events: boolean;
  has_kids: boolean;
  show_kids_events: boolean;
  family_references: string[]; // How the family is referred to together (e.g., "Sios", "The Sios")
};

export type UserProfile = {
  user_id: string;
  source: 'manual' | 'api' | 'api_edited';
  profile_version: number;
  updated_at: number;
  home_addresses: string[];
  memberships: Membership[];
};

export type Event = {
  id: string;
  time: string;
  sortKey: number;
  event_name: string;
  location: string | null;
  in_charge: string[]; // Split array for matching
  in_charge_raw: string | null; // Original text for display
  helpers: string[];
  helpers_raw: string | null;
  childcare: string[];
  childcare_raw: string | null;
  food: string[];
  food_raw: string | null;
  group: string | null;
  notes: string | null;
  raw_tab: string;
};

export type BulletinPost = {
  id: string;
  date: string;
  dateValue: number; // Timestamp for sorting (newest first)
  posted_by: string;
  subject: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
};

export type Role = {
  type: 'LEAD' | 'HELPER' | 'CHILDCARE' | 'FOOD' | 'MENTIONED' | 'LOCATION' | 'GROUP';
  subject: string;
  kind: 'self' | 'spouse' | 'dependent';
  matchedText: string; // The original cell text that matched (e.g., "Sios", "Will Slo", "Youth")
};

export type LocationConfig = {
  city_id: string;
  city_name: string;
  region_id: string;
  sheet_id: string;
  timezone: string;
  tab_discovery: {
    pattern: string;
    bulletin_tab_name: string;
  };
  schema_version: number;
  header_row: number;
  data_start_row: number;
  column_map: {
    time: string[];
    event_name: string[];
    location: string[];
    in_charge: string[];
    helpers: string[];
    childcare: string[];
    food: string[];
    group: string[];
    notes: string[];
  };
  transform_override: null;
};

export type TabName = 'today' | 'weekly' | 'bulletin';
