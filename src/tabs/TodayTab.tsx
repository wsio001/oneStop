import { useState, useMemo } from 'react';
import EventCard from '../components/EventCard';
import EventCardSlim from '../components/EventCardSlim';
import { filterRelevantEvents } from '../lib/relevance';
import { useAppStore } from '../store/appStore';
import type { UserProfile, Event } from '../types';

type TodayTabProps = {
  profile: UserProfile;
};

export default function TodayTab({ profile }: TodayTabProps) {
  const [focusMode, setFocusMode] = useState<'my' | 'all'>('my');
  const tabs = useAppStore((state) => state.tabs);
  const discoveryMap = useAppStore((state) => state.discoveryMap);
  const syncing = useAppStore((state) => state.syncing);

  // Find today's tab
  const todayEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayTab = discoveryMap.find(t => t.date === today);

    if (!todayTab) return [];

    return tabs[todayTab.tab_name] || [];
  }, [tabs, discoveryMap]);

  const { relevant, nonRelevant } = useMemo(
    () => filterRelevantEvents(todayEvents, profile),
    [todayEvents, profile.profile_version]
  );

  const showingFamilyEvents = useMemo(() => {
    const membership = profile.memberships[0];
    if (!membership) return true;
    return membership.show_spouse_events || membership.show_kids_events;
  }, [profile.memberships]);

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Loading state
  if (syncing && todayEvents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">Loading schedule...</div>
          <div className="text-xs text-gray-400">Fetching from Google Sheets</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* Focus Toggle */}
      <div className="flex bg-gray-100 rounded-full p-0.5 mb-3 text-[10px]">
        <button
          onClick={() => setFocusMode('my')}
          className={`flex-1 text-center py-1.5 rounded-full font-medium transition-colors ${
            focusMode === 'my' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          My events ({relevant.length})
        </button>
        <button
          onClick={() => setFocusMode('all')}
          className={`flex-1 text-center py-1.5 rounded-full font-medium transition-colors ${
            focusMode === 'all' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          All ({todayEvents.length})
        </button>
      </div>

      {/* Relevant Events */}
      {relevant.length > 0 ? (
        <div className="mb-3">
          {relevant.map(({ event, roles }) => (
            <EventCard key={event.id} event={event} roles={roles} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm mb-1">No relevant events today</p>
          <p className="text-xs text-gray-400">
            Check the "All" tab to see other scheduled events
          </p>
        </div>
      )}

      {/* Non-Relevant Events */}
      {focusMode === 'my' && nonRelevant.length > 0 && (
        <div>
          {nonRelevant.map((event) => (
            <EventCardSlim key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Family Events Hidden Banner */}
      {!showingFamilyEvents && (
        <div className="mt-3 p-2 bg-gray-100 rounded-lg text-center">
          <p className="text-[9px] text-gray-600">
            Family events are hidden · <span className="font-medium">Settings to enable</span>
          </p>
        </div>
      )}
    </div>
  );
}
