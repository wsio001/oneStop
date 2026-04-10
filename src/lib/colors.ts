import type { Role } from '../types';

type ColorScheme = {
  borderColor: string;
  backgroundColor: string;
  textPrimary: string;
  textSecondary: string;
  badgeColor: string;
};

const ROLE_COLOR_MAP: Record<string, ColorScheme> = {
  LEAD: {
    borderColor: 'border-purple-500',
    backgroundColor: 'bg-purple-50',
    textPrimary: 'text-purple-900',
    textSecondary: 'text-purple-800',
    badgeColor: 'bg-purple-500',
  },
  FOOD: {
    borderColor: 'border-amber-500',
    backgroundColor: 'bg-amber-50',
    textPrimary: 'text-amber-900',
    textSecondary: 'text-amber-800',
    badgeColor: 'bg-amber-600',
  },
  HELPER: {
    borderColor: 'border-teal-500',
    backgroundColor: 'bg-teal-50',
    textPrimary: 'text-teal-900',
    textSecondary: 'text-teal-800',
    badgeColor: 'bg-teal-600',
  },
  CHILDCARE: {
    borderColor: 'border-teal-500',
    backgroundColor: 'bg-teal-50',
    textPrimary: 'text-teal-900',
    textSecondary: 'text-teal-800',
    badgeColor: 'bg-teal-600',
  },
  LOCATION: {
    borderColor: 'border-orange-500',
    backgroundColor: 'bg-orange-50',
    textPrimary: 'text-orange-900',
    textSecondary: 'text-orange-800',
    badgeColor: 'bg-orange-600',
  },
  GROUP: {
    borderColor: 'border-orange-500',
    backgroundColor: 'bg-orange-50',
    textPrimary: 'text-orange-900',
    textSecondary: 'text-orange-800',
    badgeColor: 'bg-orange-600',
  },
  MENTIONED: {
    borderColor: 'border-gray-300',
    backgroundColor: 'bg-gray-50',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-800',
    badgeColor: 'bg-gray-600',
  },
};

const GREY_SCHEME: ColorScheme = {
  borderColor: 'border-gray-300',
  backgroundColor: 'bg-gray-50',
  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-800',
  badgeColor: 'bg-gray-600',
};

/**
 * Get color scheme for a set of roles based on precedence.
 * Precedence order: LEAD > FOOD > HELPER > CHILDCARE > MENTIONED > LOCATION > GROUP
 */
export function getRoleColors(roles: Role[]): ColorScheme & { primaryRoleType: string | null } {
  if (roles.length === 0) {
    return { ...GREY_SCHEME, primaryRoleType: null };
  }

  // Precedence order (MENTIONED is right before GROUP per user request)
  const precedence = ['LEAD', 'FOOD', 'HELPER', 'CHILDCARE', 'MENTIONED', 'LOCATION', 'GROUP'];

  // Find highest precedence role
  const primaryRole = roles.sort(
    (a, b) => precedence.indexOf(a.type) - precedence.indexOf(b.type)
  )[0];

  const colorScheme = ROLE_COLOR_MAP[primaryRole.type] || GREY_SCHEME;

  return {
    ...colorScheme,
    primaryRoleType: primaryRole.type,
  };
}
