import type { Event, Role } from '../types';
import { getRoleColors, getBadgeColor } from '../lib/colors';
import BadgeStack from './BadgeStack';

type WeeklyEventRowProps = {
  event: Event;
  roles: Role[];
};

export default function WeeklyEventRow({ event, roles }: WeeklyEventRowProps) {
  // Get color based on highest precedence role
  const colorScheme = getRoleColors(roles);

  const roleColor = {
    border: colorScheme.borderColor,
    bg: colorScheme.backgroundColor,
    text: colorScheme.textPrimary,
    textSecondary: colorScheme.textSecondary,
  };

  // Build detail strip (pipe-separated inline format)
  const details: string[] = [];
  if (event.location) details.push(`📍 ${event.location}`);
  if (event.in_charge_raw) details.push(`👑 Lead: ${event.in_charge_raw}`);
  if (event.helpers_raw) details.push(`👤 Helpers: ${event.helpers_raw}`);
  if (event.childcare_raw) details.push(`😊 ${event.childcare_raw}`);
  if (event.food_raw) details.push(`🍔 ${event.food_raw}`);
  if (event.notes) details.push(`📓 ${event.notes}`);

  return (
    <div
      className={`border-l-[3px] ${roleColor.border} ${roleColor.bg} rounded-lg px-3 py-2 mb-2`}
    >
      {/* Top line: time + event name + badge */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Time */}
          <div className={`text-[14px] font-medium ${roleColor.textSecondary} min-w-[38px] flex-shrink-0`}>
            {event.time}
          </div>
          {/* Event name */}
          <div className={`text-[15px] font-medium ${roleColor.text} truncate`}>
            {event.event_name}
          </div>
        </div>

        {/* Badge Stack */}
        <div className="flex-shrink-0 ml-2">
          <BadgeStack roles={roles} getBadgeColor={getBadgeColor} size="small" />
        </div>
      </div>

      {/* Bottom line: pipe-separated details */}
      {details.length > 0 && (
        <div className={`text-[14px] ${roleColor.textSecondary} pl-[44px] leading-relaxed`}>
          {details.join(' · ')}
        </div>
      )}
    </div>
  );
}
