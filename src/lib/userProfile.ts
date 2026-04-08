import type { UserProfile, Membership, Person } from '../types';

const STORAGE_KEY = 'user_profile';

type ProfileChangeListener = (profile: UserProfile | null) => void;
let listeners: ProfileChangeListener[] = [];

export function getCurrentUser(): UserProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserProfile;
  } catch (error) {
    console.error('Failed to parse user profile from localStorage:', error);
    return null;
  }
}

export function updateProfile(data: Partial<UserProfile> | null): void {
  if (data === null) {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners(null);
    return;
  }

  const existing = getCurrentUser();
  const updated: UserProfile = existing
    ? {
        ...existing,
        ...data,
        profile_version: existing.profile_version + 1,
        updated_at: Date.now(),
      }
    : {
        user_id: crypto.randomUUID(),
        source: 'manual',
        profile_version: 1,
        updated_at: Date.now(),
        home_addresses: [],
        memberships: [],
        ...data,
      };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  notifyListeners(updated);
}

export function subscribeToProfile(listener: ProfileChangeListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners(profile: UserProfile | null): void {
  listeners.forEach((listener) => listener(profile));
}

// Helper to create a clean membership object
export function createMembership(partial: Partial<Membership>): Membership {
  return {
    city_id: partial.city_id || '',
    city_name: partial.city_name || '',
    region_id: partial.region_id || 'west_coast',
    self: partial.self || { display_name: '', aliases: [] },
    spouse: partial.spouse || null,
    dependents: partial.dependents || [],
    groups: partial.groups || [],
    married: partial.married ?? false,
    show_spouse_events: partial.show_spouse_events ?? false,
    has_kids: partial.has_kids ?? false,
    show_kids_events: partial.show_kids_events ?? false,
  };
}

// Helper to create a clean person object
export function createPerson(display_name: string, aliases: string[] = []): Person {
  return {
    display_name,
    aliases,
  };
}
