import { useState, useMemo } from 'react';
import EventCard from '../components/EventCard';
import EventCardSlim from '../components/EventCardSlim';
import { filterRelevantEvents, computeRelevance } from '../lib/relevance';
import { useAppStore } from '../store/appStore';
import type { UserProfile } from '../types';

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
    // Use local date, not UTC
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone

    console.log('[TodayTab] Looking for date:', today);
    console.log('[TodayTab] Discovery map:', discoveryMap);
    const todayTab = discoveryMap.find(t => t.date === today);
    console.log('[TodayTab] Found today tab:', todayTab);

    if (!todayTab) return [];

    const events = tabs[todayTab.tab_name] || [];
    console.log('[TodayTab] Events for today:', events.length, events);
    return events;
  }, [tabs, discoveryMap]);

  const { relevant } = useMemo(
    () => filterRelevantEvents(todayEvents, profile),
    [todayEvents, profile.profile_version]
  );

  const showingFamilyEvents = useMemo(() => {
    const membership = profile.memberships[0];
    if (!membership) return true;
    return membership.show_spouse_events || membership.show_kids_events;
  }, [profile.memberships]);

  // Loading state
  if (syncing && todayEvents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-base text-gray-500 mb-2">Loading schedule...</div>
          <div className="text-sm text-gray-400">Fetching from Google Sheets</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Focus Toggle */}
      <div className="flex bg-gray-100 rounded-full p-0.5 mb-3 text-sm">
        <button
          onClick={() => setFocusMode('my')}
          className={`flex-1 text-center py-2 rounded-full font-medium transition-colors ${
            focusMode === 'my' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          My events ({relevant.length})
        </button>
        <button
          onClick={() => setFocusMode('all')}
          className={`flex-1 text-center py-2 rounded-full font-medium transition-colors ${
            focusMode === 'all' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          All ({todayEvents.length})
        </button>
      </div>

      {focusMode === 'my' ? (
        <>
          {/* My Events Mode: Only show relevant events */}
          {relevant.length > 0 ? (
            <div>
              {relevant.map(({ event, roles }) => (
                <EventCard key={event.id} event={event} roles={roles} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-base mb-2">No relevant events today</p>
              <p className="text-sm text-gray-400">
                Check the "All" tab to see other scheduled events
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* All Events Mode: Show All Events */}
          {todayEvents.length > 0 ? (
            <div>
              {todayEvents.map((event) => {
                const roles = computeRelevance(event, profile);
                if (roles.length > 0) {
                  return <EventCard key={event.id} event={event} roles={roles} />;
                } else {
                  return <EventCardSlim key={event.id} event={event} />;
                }
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-base mb-1">No events today</p>
            </div>
          )}
        </>
      )}

      {/* Family Events Hidden Banner */}
      {!showingFamilyEvents && (
        <div className="mt-3 p-3 bg-gray-100 rounded-lg text-center">
          <p className="text-xs text-gray-600">
            Family events are hidden · <span className="font-medium">Settings to enable</span>
          </p>
        </div>
      )}
    </div>
  );
}
