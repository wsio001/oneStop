import type { Event, Role } from '../types';

type EventCardProps = {
  event: Event;
  roles: Role[];
};

const GROUP_COLORS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  Youth: {
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    badge: 'bg-purple-500',
  },
  Worship: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    badge: 'bg-emerald-600',
  },
  Kids: {
    border: 'border-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    badge: 'bg-orange-600',
  },
  Parents: {
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    badge: 'bg-purple-500',
  },
};

export default function EventCard({ event, roles }: EventCardProps) {
  const groupColor = event.group ? GROUP_COLORS[event.group] || GROUP_COLORS.Youth : GROUP_COLORS.Youth;

  // Find the highest priority role
  const rolePrecedence = ['LEAD', 'HELPER', 'CHILDCARE', 'FOOD', 'GROUP', 'MENTIONED'];
  const topRole = roles.sort(
    (a, b) => rolePrecedence.indexOf(a.type) - rolePrecedence.indexOf(b.type)
  )[0];

  const badgeText = topRole
    ? `${topRole.kind === 'self' ? 'YOU' : topRole.subject.toUpperCase()}: ${topRole.type}`
    : '';

  return (
    <div className={`border-[1.5px] ${groupColor.border} ${groupColor.bg} rounded-lg p-2.5 mb-2`}>
      <div className="flex items-center justify-between mb-0.5">
        <div className={`text-[10px] font-medium ${groupColor.text}`}>
          {event.time} · {event.group || 'General'}
        </div>
        {badgeText && (
          <div
            className={`${groupColor.badge} text-white text-[8px] px-1.5 py-0.5 rounded-full font-medium`}
          >
            {badgeText}
          </div>
        )}
      </div>
      <div className={`text-[11px] font-medium ${groupColor.text} mb-0.5`}>
        {event.event_name}
      </div>
      {event.location && (
        <div className={`text-[9px] ${groupColor.text}`}>{event.location}</div>
      )}
    </div>
  );
}
