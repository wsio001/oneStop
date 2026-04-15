import type { Event, Role } from '../types';
import { getRoleColors, getBadgeColor } from '../lib/colors';
import BadgeStack from './BadgeStack';

type EventCardProps = {
  event: Event;
  roles: Role[];
};

export default function EventCard({ event, roles }: EventCardProps) {
  // Get color based on highest precedence role
  const colorScheme = getRoleColors(roles);

  const roleColor = {
    border: colorScheme.borderColor,
    bg: colorScheme.backgroundColor,
    text: colorScheme.textPrimary,
  };

  return (
    <div className={`border-[1.5px] ${roleColor.border} ${roleColor.bg} rounded-lg p-4 mb-3`}>
      {/* Header: Time + Badges */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-sm font-medium ${roleColor.text}`}>
          {event.time}
        </div>
        <BadgeStack roles={roles} getBadgeColor={getBadgeColor} size="medium" />
      </div>

      {/* Event Name */}
      <div className={`text-lg font-bold ${roleColor.text} mb-3`}>
        {event.event_name}
      </div>

      {/* Location */}
      {event.location && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-center gap-1.5`}>
          <span>📍</span>
          <span>{event.location}</span>
        </div>
      )}

      {/* Lead */}
      {event.in_charge_raw && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-center gap-1.5`}>
          <span>👑</span>
          <span>Lead: {event.in_charge_raw}</span>
        </div>
      )}

      {/* Helpers */}
      {event.helpers_raw && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-center gap-1.5`}>
          <span>👤</span>
          <span>Helpers: {event.helpers_raw}</span>
        </div>
      )}

      {/* Childcare */}
      {event.childcare_raw && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-center gap-1.5`}>
          <span>😊</span>
          <span>Childcare: {event.childcare_raw}</span>
        </div>
      )}

      {/* Food/Snacks */}
      {event.food_raw && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-center gap-1.5`}>
          <span>🍔</span>
          <span>Food: {event.food_raw}</span>
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div className={`text-sm ${roleColor.text} mt-3 pt-3 border-t border-gray-200 italic`}>
          {event.notes}
        </div>
      )}
    </div>
  );
}
