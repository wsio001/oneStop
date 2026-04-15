import type { Role } from '../types';

type BadgeProps = {
  role: Role;
  badgeColor: string;
  size?: 'small' | 'medium';
};

export default function Badge({ role, badgeColor, size = 'medium' }: BadgeProps) {
  // Generate badge text
  // For GROUP type: show just the group name (uppercased subject)
  // For LOCATION type: show "LOCATION_TEXT: LOCATION" (e.g., "GOLDSTONE: LOCATION")
  // For other types: show "SUBJECT: TYPE" format (e.g., "YOU: LEAD", "WILLIAM: FOOD")
  const badgeText = role.type === 'GROUP'
    ? role.subject.toUpperCase()
    : `${role.subject.toUpperCase()}: ${role.type}`;

  const sizeClasses = size === 'small'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-[10px] px-2.5 py-1';

  return (
    <div
      className={`${badgeColor} text-white ${sizeClasses} rounded-full font-semibold uppercase whitespace-nowrap`}
    >
      {badgeText}
    </div>
  );
}
