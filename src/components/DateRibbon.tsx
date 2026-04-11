import { useRef, useEffect } from 'react';
import { getRoleColors } from '../lib/colors';
import type { Role } from '../types';

type DayCell = {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // "Mon", "Tue", etc.
  dayOfMonth: number; // 1-31
  isToday: boolean;
  isSelected: boolean;
  relevantRoles: Role[]; // Relevant events for this day (for pips)
};

type DateRibbonProps = {
  days: DayCell[];
  onDaySelect: (date: string) => void;
};

export default function DateRibbon({ days, onDaySelect }: DateRibbonProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedCellRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected day on mount and when selection changes
  useEffect(() => {
    if (scrollContainerRef.current && selectedCellRef.current) {
      const container = scrollContainerRef.current;
      const cell = selectedCellRef.current;

      // Center the selected cell in the viewport
      const scrollLeft = cell.offsetLeft - (container.clientWidth / 2) + (cell.clientWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [days.find(d => d.isSelected)?.date]);

  return (
    <div className="relative mb-4">
      {/* Scrollable date ribbon with cutoff */}
      <div
        ref={scrollContainerRef}
        className="flex gap-0.5 overflow-x-auto pb-2 pr-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          // Cut off last date by reducing max width
          maxWidth: 'calc(100vw - 48px)' // Leave space to show partial cutoff
        }}
      >
        {days.map((day) => {
          // Consolidate pips: 1 pip per role type (deduplicate by type)
          const pipColors: string[] = [];
          const seenTypes = new Set<string>();

          for (const role of day.relevantRoles) {
            if (!seenTypes.has(role.type)) {
              seenTypes.add(role.type);
              const colors = getRoleColors([role]);
              pipColors.push(colors.badgeColor);
              if (pipColors.length >= 3) break; // Max 3 pips
            }
          }

          const hasOverflow = seenTypes.size > 3;

          return (
            <div
              key={day.date}
              ref={day.isSelected ? selectedCellRef : null}
              onClick={() => onDaySelect(day.date)}
              className={`flex-shrink-0 w-[40px] flex flex-col items-center cursor-pointer py-1 px-0.5 rounded ${
                day.isSelected ? 'bg-purple-100' : ''
              }`}
            >
              {/* Day of week label - always gray */}
              <div className="text-[10px] text-gray-600 mb-0.5">
                {day.dayOfWeek}
              </div>

              {/* Day of month number with today marker styling */}
              <div
                className={`text-[13px] font-medium pb-1 ${
                  day.isToday
                    ? 'text-orange-600'
                    : 'text-gray-900'
                }`}
                style={
                  day.isToday
                    ? {
                        textDecoration: 'underline',
                        textDecorationColor: 'rgb(234 88 12)', // orange-600
                        textUnderlineOffset: '3px',
                      }
                    : undefined
                }
              >
                {day.dayOfMonth}
              </div>

              {/* Pip row - relevance indicators only */}
              <div className="flex gap-0.5 h-[10px] items-center justify-center">
                {pipColors.map((color, idx) => (
                  <div
                    key={idx}
                    className={`w-[5px] h-[5px] rounded-full ${color}`}
                  />
                ))}
                {hasOverflow && (
                  <div className="text-[10px] text-gray-100 font-bold">+</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gradient fade overlay on right edge to indicate scrollability */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, rgb(249, 250, 251), transparent)'
        }}
      />
    </div>
  );
}
