import { create } from 'zustand';
import type { Event, BulletinPost } from '../types';
import { discoverTabs, fetchSheetData, fetchBulletinWithHyperlinks } from '../lib/api';
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

      // Step 2: Fetch data for date tabs only (bulletin fetched separately)
      const dateTabs = date_tabs.map(t => t.tab_name);

      if (dateTabs.length === 0 && !bulletin_tab) {
        set({ syncing: false, lastSync: Date.now() });
        return;
      }

      // Fetch date tabs
      const rawData = dateTabs.length > 0 ? await fetchSheetData(dateTabs) : {};

      // Step 3: Hash and parse date tabs
      const newHashes: Record<string, string> = {};
      const newTabs: Record<string, Event[]> = {};
      const oldHashes = state.hashes;

      console.log('🔵 Processing fetched date tabs:', Object.keys(rawData));

      for (const [tabName, values] of Object.entries(rawData)) {
        const hash = hashValues(values);
        newHashes[tabName] = hash;

        // Parse as event tab if hash changed or not in state
        if (hash !== oldHashes[tabName] || !state.tabs[tabName]) {
          const events = parseSheetTab(tabName, values, IRVINE_CONFIG);
          newTabs[tabName] = events;
        } else {
          // Keep existing parsed data (reference stays the same for React.memo)
          newTabs[tabName] = state.tabs[tabName];
        }
      }

      // Step 4: Fetch and parse bulletin separately (with hyperlinks)
      let newBulletin: BulletinPost[] = state.bulletin;

      if (bulletin_tab) {
        console.log(`🔵 Fetching BULLETIN tab with hyperlinks: "${bulletin_tab.tab_name}"`);
        try {
          const bulletinData = await fetchBulletinWithHyperlinks(bulletin_tab.tab_name);
          const hash = hashValues(bulletinData.rows.map(r => r.values));
          newHashes[bulletin_tab.tab_name] = hash;

          // Parse bulletin if hash changed or empty
          if (hash !== oldHashes[bulletin_tab.tab_name] || state.bulletin.length === 0) {
            console.log(`🔵 Parsing bulletin (hash changed or empty): old=${oldHashes[bulletin_tab.tab_name]}, new=${hash}`);
            newBulletin = parseBulletinTab(bulletin_tab.tab_name, bulletinData.rows);
            console.log(`🔵 Bulletin parsed: ${newBulletin.length} posts`);
          } else {
            console.log(`🔵 Keeping existing bulletin (hash unchanged)`);
          }
        } catch (error) {
          console.error('Failed to fetch bulletin:', error);
          // Keep existing bulletin on error
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
