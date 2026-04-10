import type { Event, Role } from '../types';
import { getRoleColors } from '../lib/colors';

type EventCardProps = {
  event: Event;
  roles: Role[];
};

export default function EventCard({ event, roles }: EventCardProps) {
  // Get color based on highest precedence role
  // Filter out address matches for color priority
  const rolesForColor = roles.filter(r => !(r.type === 'MENTIONED' && r.subject === 'Your address'));
  const colorScheme = getRoleColors(rolesForColor.length > 0 ? rolesForColor : roles);

  const roleColor = {
    border: colorScheme.borderColor,
    bg: colorScheme.backgroundColor,
    text: colorScheme.textPrimary,
    badge: colorScheme.badgeColor,
  };

  // Find top non-address role for badge display
  const topNonAddressRole = rolesForColor[0];

  // Check if using home address
  const hasAddressMatch = roles.some(r => r.type === 'MENTIONED' && r.subject === 'Your address');

  // Generate primary badge text
  // For GROUP type: show just the group name
  // For other types: show "SUBJECT: TYPE" format (e.g., "SIOS: LEAD", "ALL THE KIMS: FOOD")
  const primaryBadge = topNonAddressRole
    ? topNonAddressRole.type === 'GROUP'
      ? topNonAddressRole.subject.toUpperCase()
      : `${topNonAddressRole.subject.toUpperCase()}: ${topNonAddressRole.type}`
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
          {/* Address match badge */}
          {hasAddressMatch && (
            <div
              className="bg-amber-700 text-white text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase"
            >
              USING YOUR HOME
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

      {/* Lead & Helpers */}
      {(event.in_charge.length > 0 || event.helpers.length > 0) && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-start gap-1.5`}>
          <span>👤</span>
          <span>
            {event.in_charge.length > 0 && (
              <>Lead: {event.in_charge.join(', ')}</>
            )}
            {event.in_charge.length > 0 && event.helpers.length > 0 && <> · </>}
            {event.helpers.length > 0 && (
              <>Helpers: {event.helpers.join(', ')}</>
            )}
          </span>
        </div>
      )}

      {/* Childcare */}
      {event.childcare.length > 0 && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-center gap-1.5`}>
          <span>👶</span>
          <span>Childcare: {event.childcare.join(', ')}</span>
        </div>
      )}

      {/* Food/Snacks */}
      {event.food.length > 0 && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-center gap-1.5`}>
          <span>🍔</span>
          <span>Food: {event.food.join(', ')}</span>
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
