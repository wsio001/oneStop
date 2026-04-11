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
    <div
      ref={scrollContainerRef}
      className="flex gap-0.5 overflow-x-auto pb-2 mb-4"
      style={{ WebkitOverflowScrolling: 'touch' }}
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
            className={`flex-shrink-0 w-[26px] flex flex-col items-center cursor-pointer py-1 px-0.5 rounded ${
              day.isSelected ? 'bg-purple-100' : ''
            }`}
          >
            {/* Day of week label - always gray */}
            <div className="text-[8px] text-gray-500 mb-0.5">
              {day.dayOfWeek}
            </div>

            {/* Day of month number with today marker styling */}
            <div
              className={`text-[11px] font-medium pb-1 ${
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
            <div className="flex gap-0.5 h-[6px] items-center justify-center">
              {pipColors.map((color, idx) => (
                <div
                  key={idx}
                  className={`w-[3px] h-[3px] rounded-full ${color}`}
                />
              ))}
              {hasOverflow && (
                <div className="text-[6px] text-gray-400 font-bold">+</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
