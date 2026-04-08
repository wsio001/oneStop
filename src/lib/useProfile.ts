import { useEffect, useState } from 'react';
import { getCurrentUser, subscribeToProfile } from './userProfile';
import type { UserProfile } from '../types';

export function useProfile(): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(getCurrentUser);

  useEffect(() => {
    const unsubscribe = subscribeToProfile((updated) => {
      setProfile(updated);
    });
    return unsubscribe;
  }, []);

  return profile;
}
