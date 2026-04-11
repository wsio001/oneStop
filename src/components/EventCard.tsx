import type { Event, Role } from '../types';
import { getRoleColors } from '../lib/colors';

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
    badge: colorScheme.badgeColor,
  };

  // Find top role for badge display (roles are already sorted by precedence in getRoleColors)
  const topRole = roles[0];

  // Generate primary badge text
  // For GROUP type: show just the group name
  // For LOCATION type: show "LOCATION_TEXT: LOCATION" (e.g., "GOLDSTONE: LOCATION")
  // For other types: show "SUBJECT: TYPE" format (e.g., "SIOS: LEAD", "ALL THE KIMS: FOOD")
  const primaryBadge = topRole
    ? topRole.type === 'GROUP'
      ? topRole.subject.toUpperCase()
      : `${topRole.subject.toUpperCase()}: ${topRole.type}`
    : '';

  return (
    <div className={`border-[1.5px] ${roleColor.border} ${roleColor.bg} rounded-lg p-4 mb-3`}>
      {/* Header: Time + Badges */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-sm font-medium ${roleColor.text}`}>
          {event.time}
        </div>
        <div className="flex items-center gap-1">
          {/* Primary role badge */}
          {primaryBadge && (
            <div
              className={`${roleColor.badge} text-white text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase`}
            >
              {primaryBadge}
            </div>
          )}
        </div>
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
