import type { Event } from '../types';

type WeeklyEventRowSlimProps = {
  event: Event;
};

export default function WeeklyEventRowSlim({ event }: WeeklyEventRowSlimProps) {
  // Build detail strip (pipe-separated inline format)
  const details: string[] = [];
  if (event.location) details.push(`📍 ${event.location}`);
  if (event.in_charge_raw) details.push(`👤 Lead: ${event.in_charge_raw}`);
  if (event.helpers_raw) details.push(`👤 Helpers: ${event.helpers_raw}`);
  if (event.childcare_raw) details.push(`👶 ${event.childcare_raw}`);
  if (event.food_raw) details.push(`🍔 ${event.food_raw}`);
  if (event.notes) details.push(`📓 ${event.notes}`);

  return (
    <div className="border-l-[3px] border-gray-300 rounded-lg px-2.5 py-1.5 mb-1.5 opacity-70">
      {/* Top line: time + event name */}
      <div className="flex items-center gap-1.5 mb-0.5">
        {/* Time */}
        <div className="text-[9px] font-medium text-gray-600 min-w-[34px] flex-shrink-0">
          {event.time}
        </div>
        {/* Event name */}
        <div className="text-[10px] text-gray-600 truncate">
          {event.event_name}
        </div>
      </div>

      {/* Bottom line: pipe-separated details */}
      {details.length > 0 && (
        <div className="text-[8px] text-gray-500 pl-[39px] leading-relaxed">
          {details.join(' · ')}
        </div>
      )}
    </div>
  );
}
