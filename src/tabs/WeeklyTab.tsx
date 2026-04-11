import { useState, useMemo } from 'react';
import DateRibbon from '../components/DateRibbon';
import EventCard from '../components/EventCard';
import EventCardSlim from '../components/EventCardSlim';
import { filterRelevantEvents, computeRelevance } from '../lib/relevance';
import { useAppStore } from '../store/appStore';
import type { UserProfile, Role } from '../types';

type WeeklyTabProps = {
  profile: UserProfile;
};

export default function WeeklyTab({ profile }: WeeklyTabProps) {
  const tabs = useAppStore((state) => state.tabs);
  const discoveryMap = useAppStore((state) => state.discoveryMap);

  // Get today's date in YYYY-MM-DD format
  const todayDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Selected day defaults to today
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [focusMode, setFocusMode] = useState<'my' | 'all'>('my');

  // Build day cells from discovery map (15 days: today + 14 forward)
  const dayCells = useMemo(() => {
    return discoveryMap.slice(0, 15).map((day) => {
      const dateObj = new Date(day.date);
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dayOfMonth = dateObj.getDate();

      // Get events for this day
      const events = tabs[day.tab_name] || [];
      const { relevant } = filterRelevantEvents(events, profile);

      // Collect all roles from relevant events for pips
      const relevantRoles: Role[] = [];
      for (const { roles } of relevant) {
        if (roles[0]) {
          relevantRoles.push(roles[0]); // Just the highest precedence role per event
        }
      }

      return {
        date: day.date,
        dayOfWeek,
        dayOfMonth,
        isToday: day.date === todayDate,
        isSelected: day.date === selectedDate,
        relevantRoles,
      };
    });
  }, [discoveryMap, tabs, profile, todayDate, selectedDate]);

  // Get events for the selected day
  const selectedDayEvents = useMemo(() => {
    const selectedDay = discoveryMap.find(d => d.date === selectedDate);
    if (!selectedDay) return [];
    return tabs[selectedDay.tab_name] || [];
  }, [tabs, discoveryMap, selectedDate]);

  const { relevant } = useMemo(
    () => filterRelevantEvents(selectedDayEvents, profile),
    [selectedDayEvents, profile.profile_version]
  );

  // Format selected day for subheader
  const selectedDayLabel = useMemo(() => {
    const dateObj = new Date(selectedDate);
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedDate]);

  // Date range for header subtitle
  const dateRange = useMemo(() => {
    if (discoveryMap.length === 0) return '';
    const first = new Date(discoveryMap[0].date);
    const last = new Date(discoveryMap[Math.min(14, discoveryMap.length - 1)].date);

    const firstMonth = first.toLocaleDateString('en-US', { month: 'short' });
    const lastMonth = last.toLocaleDateString('en-US', { month: 'short' });

    if (firstMonth === lastMonth) {
      return `${firstMonth} ${first.getDate()} – ${last.getDate()}`;
    } else {
      return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}`;
    }
  }, [discoveryMap]);

  const eventCount = focusMode === 'my' ? relevant.length : selectedDayEvents.length;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 sticky top-0 bg-white z-10">
        <h1 className="text-2xl font-bold text-gray-900">Weekly</h1>
        <p className="text-sm text-gray-500">{dateRange}</p>
      </div>

      {/* Focus Toggle */}
      <div className="px-4 pb-3">
        <div className="flex bg-gray-100 rounded-full p-0.5 text-sm">
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
            All ({selectedDayEvents.length})
          </button>
        </div>
      </div>

      {/* Date Ribbon */}
      <div className="px-4">
        <DateRibbon days={dayCells} onDaySelect={setSelectedDate} />
      </div>

      {/* Selected Day Subheader */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-600">
          {selectedDayLabel} · {eventCount} {eventCount === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Event List */}
      <div className="px-4 pb-6">
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
                <p className="text-base mb-2">No relevant events this day</p>
                <p className="text-sm text-gray-400">
                  Check the "All" tab to see other scheduled events
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* All Events Mode: Show all events */}
            {selectedDayEvents.length > 0 ? (
              <div>
                {selectedDayEvents.map((event) => {
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
                <p className="text-base mb-1">No events this day</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
