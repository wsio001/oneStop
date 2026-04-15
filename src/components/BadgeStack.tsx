import type { Role } from '../types';
import Badge from './Badge';

type BadgeStackProps = {
  roles: Role[];
  getBadgeColor: (roleType: string) => string;
  size?: 'small' | 'medium';
};

/**
 * BadgeStack component for displaying role badges
 * Shows max 2 badges + "+N" overflow indicator
 * Badges are ordered by precedence (highest first)
 * Reading order: left to right within right-aligned cluster
 */
export default function BadgeStack({ roles, getBadgeColor, size = 'medium' }: BadgeStackProps) {
  if (roles.length === 0) return null;

  // Show max 2 badges
  const visibleRoles = roles.slice(0, 2);
  const overflowCount = roles.length - 2;

  const sizeClasses = size === 'small'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-[10px] px-2.5 py-1';

  return (
    <div className="flex items-center gap-1">
      {/* Visible badges (max 2) */}
      {visibleRoles.map((role, idx) => (
        <Badge
          key={`${role.type}-${role.subject}-${idx}`}
          role={role}
          badgeColor={getBadgeColor(role.type)}
          size={size}
        />
      ))}

      {/* +N overflow indicator */}
      {overflowCount > 0 && (
        <div
          className={`bg-gray-500 text-white ${sizeClasses} rounded-full font-semibold`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
