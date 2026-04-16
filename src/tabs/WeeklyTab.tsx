import { useState, useMemo } from 'react';
import DateRibbon from '../components/DateRibbon';
import WeeklyEventRow from '../components/WeeklyEventRow';
import WeeklyEventRowSlim from '../components/WeeklyEventRowSlim';
import { filterRelevantEvents, computeRelevance } from '../lib/relevance';
import { useAppStore } from '../store/appStore';
import type { UserProfile, Role } from '../types';

type WeeklyTabProps = {
  profile: UserProfile;
};

export default function WeeklyTab({ profile }: WeeklyTabProps) {
  const tabs = useAppStore((state) => state.tabs);
  const discoveryMap = useAppStore((state) => state.discoveryMap);

  // Get today's date in YYYY-MM-DD format (Pacific timezone)
  const todayDate = useMemo(() => {
    const now = new Date();
    // Use Pacific timezone (same as backend discovery)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;

    return `${year}-${month}-${day}`;
  }, []);

  // Selected day defaults to today
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [focusMode, setFocusMode] = useState<'my' | 'all'>('my');

  // Build day cells from discovery map (15 days: today + 14 forward)
  const dayCells = useMemo(() => {
    return discoveryMap.slice(0, 15).map((day) => {
      // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone issues
      const [year, month, dayNum] = day.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, dayNum);
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
    // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone issues
    const [year, month, dayNum] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, dayNum);
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedDate]);

  // Date range for header subtitle
  const dateRange = useMemo(() => {
    if (discoveryMap.length === 0) return '';
    // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone issues
    const [firstYear, firstMonthNum, firstDay] = discoveryMap[0].date.split('-').map(Number);
    const first = new Date(firstYear, firstMonthNum - 1, firstDay);

    const lastDate = discoveryMap[Math.min(14, discoveryMap.length - 1)].date;
    const [lastYear, lastMonthNum, lastDay] = lastDate.split('-').map(Number);
    const last = new Date(lastYear, lastMonthNum - 1, lastDay);

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
    <div className="pb-6">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Weekly</h1>
        <p className="text-sm text-gray-500">{dateRange}</p>
      </div>

      {/* Focus Toggle */}
      <div className="pb-3">
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
      <div>
        <DateRibbon days={dayCells} onDaySelect={setSelectedDate} />
      </div>

      {/* Selected Day Subheader */}
      <div className="pb-3">
        <p className="text-sm text-gray-600">
          {selectedDayLabel} · {eventCount} {eventCount === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Event List */}
      <div>
        {focusMode === 'my' ? (
          <>
            {/* My Events Mode: Only show relevant events */}
            {relevant.length > 0 ? (
              <div>
                {relevant.map(({ event, roles }) => (
                  <WeeklyEventRow key={event.id} event={event} roles={roles} />
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
                    return <WeeklyEventRow key={event.id} event={event} roles={roles} />;
                  } else {
                    return <WeeklyEventRowSlim key={event.id} event={event} />;
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
