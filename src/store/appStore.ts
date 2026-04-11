import { create } from 'zustand';
import type { Event, BulletinPost } from '../types';
import { discoverTabs, fetchSheetData } from '../lib/api';
import { parseSheetTab, parseBulletinTab } from '../lib/parser';
import { hashValues } from '../lib/hash';
import { IRVINE_CONFIG } from '../lib/locationConfig';

type AppState = {
  // Sheet data by tab name
  tabs: Record<string, Event[]>;
  bulletin: BulletinPost[];

  // Content hashes for change detection
  hashes: Record<string, string>;

  // Discovery result
  discoveryMap: { date: string; tab_name: string }[];
  bulletinTabName: string | null;

  // Sync metadata
  lastSync: number | null;
  syncing: boolean;
  authStatus: 'unknown' | 'authenticated' | 'unauthenticated';

  // Actions
  refreshAll: () => Promise<void>;
  refreshIfStale: (maxAgeMs: number) => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  tabs: {},
  bulletin: [],
  hashes: loadHashesFromStorage(),
  discoveryMap: [],
  bulletinTabName: null,
  lastSync: null,
  syncing: false,
  authStatus: 'unknown',

  refreshAll: async () => {
    const state = get();
    if (state.syncing) return;

    set({ syncing: true });

    try {
      // Step 1: Discovery
      const discovery = await discoverTabs();
      const { date_tabs, bulletin_tab } = discovery;

      set({
        discoveryMap: date_tabs,
        bulletinTabName: bulletin_tab?.tab_name || null,
        authStatus: 'authenticated',
      });

      // Step 2: Fetch data for all tabs
      const allTabs = [
        ...date_tabs.map(t => t.tab_name),
        ...(bulletin_tab ? [bulletin_tab.tab_name] : []),
      ];

      if (allTabs.length === 0) {
        set({ syncing: false, lastSync: Date.now() });
        return;
      }

      const rawData = await fetchSheetData(allTabs);

      // Step 3: Hash and parse
      const newHashes: Record<string, string> = {};
      const newTabs: Record<string, Event[]> = {};
      const oldHashes = state.hashes;
      let newBulletin: BulletinPost[] = state.bulletin;

      console.log('🔵 Processing fetched tabs:', Object.keys(rawData));
      console.log('🔵 Bulletin tab info:', bulletin_tab);

      for (const [tabName, values] of Object.entries(rawData)) {
        const hash = hashValues(values);
        newHashes[tabName] = hash;

        // Check if this is the bulletin tab
        const isBulletinTab = bulletin_tab && tabName === bulletin_tab.tab_name;

        console.log(`🔵 Tab "${tabName}": isBulletinTab=${isBulletinTab}, rows=${values.length}`);

        if (isBulletinTab) {
          console.log(`🔵 Processing BULLETIN tab: "${tabName}"`);
          // Parse as bulletin if hash changed
          if (hash !== oldHashes[tabName] || state.bulletin.length === 0) {
            console.log(`🔵 Parsing bulletin (hash changed or empty): old=${oldHashes[tabName]}, new=${hash}`);
            newBulletin = parseBulletinTab(tabName, values);
            console.log(`🔵 Bulletin parsed: ${newBulletin.length} posts`);
          } else {
            console.log(`🔵 Keeping existing bulletin (hash unchanged)`);
          }
        } else {
          // Parse as event tab if hash changed or not in state
          if (hash !== oldHashes[tabName] || !state.tabs[tabName]) {
            const events = parseSheetTab(tabName, values, IRVINE_CONFIG);
            newTabs[tabName] = events;
          } else {
            // Keep existing parsed data (reference stays the same for React.memo)
            newTabs[tabName] = state.tabs[tabName];
          }
        }
      }

      // Save hashes to localStorage
      saveHashesToStorage(newHashes);

      set({
        tabs: newTabs,
        bulletin: newBulletin,
        hashes: newHashes,
        lastSync: Date.now(),
        syncing: false,
      });
    } catch (error) {
      console.error('Refresh failed:', error);
      set({ syncing: false, authStatus: 'unauthenticated' });
    }
  },

  refreshIfStale: async (maxAgeMs: number) => {
    const state = get();
    const now = Date.now();

    if (!state.lastSync || now - state.lastSync > maxAgeMs) {
      await state.refreshAll();
    }
  },
}));

// Helpers for localStorage
const HASHES_KEY = 'tab_hashes';

function loadHashesFromStorage(): Record<string, string> {
  try {
    const stored = localStorage.getItem(HASHES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveHashesToStorage(hashes: Record<string, string>): void {
  try {
    localStorage.setItem(HASHES_KEY, JSON.stringify(hashes));
  } catch (error) {
    console.error('Failed to save hashes:', error);
  }
}
