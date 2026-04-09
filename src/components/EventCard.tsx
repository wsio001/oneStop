import type { Event, Role } from '../types';

type EventCardProps = {
  event: Event;
  roles: Role[];
};

// Color based on user's relationship to the event (priority order)
const ROLE_COLORS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  LEAD: {
    border: 'border-red-400',
    bg: 'bg-red-50',
    text: 'text-red-900',
    badge: 'bg-red-500',
  },
  FOOD: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    text: 'text-green-900',
    badge: 'bg-green-600',
  },
  HELPER: {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    badge: 'bg-blue-600',
  },
  CHILDCARE: {
    border: 'border-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    badge: 'bg-orange-600',
  },
  MENTIONED: {
    border: 'border-amber-600',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    badge: 'bg-amber-700',
  },
  GROUP: {
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    badge: 'bg-purple-600',
  },
};

export default function EventCard({ event, roles }: EventCardProps) {
  // Priority order: LEAD > FOOD > HELPER > CHILDCARE > MENTIONED > GROUP
  const rolePrecedence = ['LEAD', 'FOOD', 'HELPER', 'CHILDCARE', 'MENTIONED', 'GROUP'];

  // Find the highest priority role
  const topRole = roles.sort(
    (a, b) => rolePrecedence.indexOf(a.type) - rolePrecedence.indexOf(b.type)
  )[0];

  // Get color based on the top role (excluding address matches for priority)
  const topNonAddressRole = roles
    .filter(r => !(r.type === 'MENTIONED' && r.subject === 'Your address'))
    .sort((a, b) => rolePrecedence.indexOf(a.type) - rolePrecedence.indexOf(b.type))[0];

  const roleColor = (topNonAddressRole || topRole)
    ? ROLE_COLORS[(topNonAddressRole || topRole).type]
    : ROLE_COLORS.GROUP;

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
      {/* Header: Time + Group + Badges */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-sm font-medium ${roleColor.text}`}>
          {event.time} · {event.group || 'General'}
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
          <span>😊</span>
          <span>Childcare: {event.childcare.join(', ')}</span>
        </div>
      )}

      {/* Food/Snacks */}
      {event.food.length > 0 && (
        <div className={`text-sm ${roleColor.text} mb-2 flex items-center gap-1.5`}>
          <span>🍔</span>
          <span>Snacks: {event.food.join(', ')}</span>
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
