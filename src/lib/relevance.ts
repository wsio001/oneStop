import type { Event, UserProfile, Role, Membership } from '../types';

function normalize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[.,;:()\/]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

type ParsedName = {
  firstName: string;
  lastName: string;
  middleTokens: string[];
  allTokens: string[];
  fullText: string;
};

type TokenizedPerson = {
  display_name: string;
  parsedName: ParsedName;
  nicknames: string[]; // Exact nickname strings (not tokenized)
  kind: 'self' | 'spouse' | 'dependent';
};

const SELF_MATCH_COLUMNS = ['in_charge', 'helpers', 'childcare', 'food', 'notes', 'group'];
const DEPENDENT_MATCH_COLUMNS = ['childcare', 'notes', 'event_name', 'group'];

/**
 * Parse a name into first, last, and middle components
 * "Jessica M Sio" -> { firstName: "jessica", lastName: "sio", middleTokens: ["m"], ... }
 * "Daniel Kim" -> { firstName: "daniel", lastName: "kim", middleTokens: [], ... }
 * "DK" -> { firstName: "dk", lastName: "dk", middleTokens: [], ... } (single token treated as both)
 */
function parseName(name: string): ParsedName {
  const tokens = normalize(name);

  if (tokens.length === 0) {
    return { firstName: '', lastName: '', middleTokens: [], allTokens: [], fullText: name.toLowerCase() };
  }

  if (tokens.length === 1) {
    // Single token (like "DK") - treat as both first and last
    return {
      firstName: tokens[0],
      lastName: tokens[0],
      middleTokens: [],
      allTokens: tokens,
      fullText: name.toLowerCase(),
    };
  }

  // Multiple tokens: first, middle(s), last
  return {
    firstName: tokens[0],
    lastName: tokens[tokens.length - 1],
    middleTokens: tokens.slice(1, -1),
    allTokens: tokens,
    fullText: name.toLowerCase(),
  };
}

function tokenizeMembership(membership: Membership): TokenizedPerson[] {
  const people: TokenizedPerson[] = [];

  // Self
  const selfParsedName = parseName(membership.self.display_name);
  const selfNicknames = membership.self.aliases.map(a => a.toLowerCase());
  people.push({
    display_name: membership.self.display_name,
    parsedName: selfParsedName,
    nicknames: selfNicknames,
    kind: 'self',
  });

  // Spouse (only if show_spouse_events is true)
  if (membership.spouse && membership.show_spouse_events) {
    const spouseParsedName = parseName(membership.spouse.display_name);
    const spouseNicknames = membership.spouse.aliases.map(a => a.toLowerCase());
    people.push({
      display_name: membership.spouse.display_name,
      parsedName: spouseParsedName,
      nicknames: spouseNicknames,
      kind: 'spouse',
    });
  }

  // Dependents (only if show_kids_events is true)
  if (membership.show_kids_events) {
    membership.dependents.forEach((dep) => {
      const depParsedName = parseName(dep.display_name);
      const depNicknames = dep.aliases.map(a => a.toLowerCase());
      people.push({
        display_name: dep.display_name,
        parsedName: depParsedName,
        nicknames: depNicknames,
        kind: 'dependent',
      });
    });
  }

  return people;
}

/**
 * Enhanced matching algorithm with last name anchor
 *
 * Rules:
 * 1. Exact nickname match (case-insensitive) -> always matches
 * 2. For multi-token names:
 *    - Last name (or initial) MUST be present in cell
 *    - First name OR middle name must be present
 * 3. Handles plural forms: "Kims", "Sios" -> matches "Kim", "Sio"
 * 4. Returns the matched text from the cell (for badge display)
 */
function checkMatch(person: TokenizedPerson, cellValue: string): { matched: boolean; matchedText: string } {
  const cellLower = cellValue.toLowerCase();
  const cellTokens = normalize(cellValue);

  // Rule 1: Check for exact nickname match
  for (const nickname of person.nicknames) {
    if (cellLower === nickname || cellTokens.includes(nickname)) {
      return { matched: true, matchedText: cellValue.trim() };
    }
  }

  // Rule 2: Check parsed name matching (requires last name)
  const { firstName, lastName, middleTokens, allTokens } = person.parsedName;

  // Check if last name appears (exact or as substring for plurals like "Kims")
  const lastNameMatches = cellTokens.some(token =>
    token === lastName ||
    token.startsWith(lastName) || // "kims" contains "kim"
    token === lastName.charAt(0) // "k" matches "kim"
  );

  if (!lastNameMatches) {
    return { matched: false, matchedText: '' };
  }

  // Check if first name or any middle name/initial appears
  const firstOrMiddleMatches = cellTokens.some(token =>
    token === firstName ||
    token === firstName.charAt(0) || // Initial
    middleTokens.some(mid => token === mid || token === mid.charAt(0))
  );

  if (firstOrMiddleMatches) {
    return { matched: true, matchedText: cellValue.trim() };
  }

  // Rule 3: Last name only (for family references like "Sios", "All the Kims")
  // If we got here, last name matched but no first/middle
  // This catches cases like "Sios" or "Kims" referring to the whole family
  if (lastNameMatches && allTokens.length > 1) {
    // Only match if it looks like a family reference (not just a different person with same last name)
    // E.g., "Sios" matches, but "John Sio" doesn't match "Jessica Sio"
    const hasOtherFirstName = cellTokens.some(token =>
      token !== firstName &&
      token !== firstName.charAt(0) &&
      !middleTokens.some(mid => token === mid) &&
      token !== lastName &&
      token.length > 1 &&
      !['the', 'all', 'and', 'or', 'family'].includes(token)
    );

    if (!hasOtherFirstName) {
      return { matched: true, matchedText: cellValue.trim() };
    }
  }

  return { matched: false, matchedText: '' };
}

export function computeRelevance(event: Event, profile: UserProfile): Role[] {
  const roles: Role[] = [];
  const seenRoles = new Map<string, Role>(); // Track roles to deduplicate family matches

  profile.memberships.forEach((membership) => {
    const people = tokenizeMembership(membership);

    people.forEach((person) => {
      const columnsToCheck =
        person.kind === 'dependent' ? DEPENDENT_MATCH_COLUMNS : SELF_MATCH_COLUMNS;

      // Check in_charge (iterate over array elements)
      if (columnsToCheck.includes('in_charge')) {
        for (const element of event.in_charge) {
          const match = checkMatch(person, element);
          if (match.matched) {
            const roleKey = `LEAD:${match.matchedText}`;
            if (!seenRoles.has(roleKey)) {
              // Use person's display_name for individual matches, matchedText for family refs
              const subject = person.kind === 'self' ? 'YOU' : person.display_name;
              const role = { type: 'LEAD' as const, subject, kind: person.kind, matchedText: match.matchedText };
              roles.push(role);
              seenRoles.set(roleKey, role);
            }
            break; // Only need one match per column
          }
        }
      }

      // Check helpers (iterate over array elements)
      if (columnsToCheck.includes('helpers')) {
        for (const element of event.helpers) {
          const match = checkMatch(person, element);
          if (match.matched) {
            const roleKey = `HELPER:${match.matchedText}`;
            if (!seenRoles.has(roleKey)) {
              const subject = person.kind === 'self' ? 'YOU' : person.display_name;
              const role = { type: 'HELPER' as const, subject, kind: person.kind, matchedText: match.matchedText };
              roles.push(role);
              seenRoles.set(roleKey, role);
            }
            break; // Only need one match per column
          }
        }
      }

      // Check childcare (iterate over array elements)
      if (columnsToCheck.includes('childcare')) {
        for (const element of event.childcare) {
          const match = checkMatch(person, element);
          if (match.matched) {
            const roleKey = `CHILDCARE:${match.matchedText}`;
            if (!seenRoles.has(roleKey)) {
              const subject = person.kind === 'self' ? 'YOU' : person.display_name;
              const role = { type: 'CHILDCARE' as const, subject, kind: person.kind, matchedText: match.matchedText };
              roles.push(role);
              seenRoles.set(roleKey, role);
            }
            break; // Only need one match per column
          }
        }
      }

      // Check food (iterate over array elements)
      if (columnsToCheck.includes('food')) {
        for (const element of event.food) {
          const match = checkMatch(person, element);
          if (match.matched) {
            const roleKey = `FOOD:${match.matchedText}`;
            if (!seenRoles.has(roleKey)) {
              const subject = person.kind === 'self' ? 'YOU' : person.display_name;
              const role = { type: 'FOOD' as const, subject, kind: person.kind, matchedText: match.matchedText };
              roles.push(role);
              seenRoles.set(roleKey, role);
            }
            break; // Only need one match per column
          }
        }
      }

      // Check notes
      if (columnsToCheck.includes('notes') && event.notes) {
        const match = checkMatch(person, event.notes);
        if (match.matched) {
          const roleKey = `MENTIONED:${match.matchedText}`;
          if (!seenRoles.has(roleKey)) {
            const subject = person.kind === 'self' ? 'YOU' : person.display_name;
            const role = { type: 'MENTIONED' as const, subject, kind: person.kind, matchedText: match.matchedText };
            roles.push(role);
            seenRoles.set(roleKey, role);
          }
        }
      }

      // Check event_name (dependents only)
      if (columnsToCheck.includes('event_name')) {
        const match = checkMatch(person, event.event_name);
        if (match.matched) {
          const roleKey = `MENTIONED:${match.matchedText}`;
          if (!seenRoles.has(roleKey)) {
            const subject = person.kind === 'self' ? 'YOU' : person.display_name;
            const role = { type: 'MENTIONED' as const, subject, kind: person.kind, matchedText: match.matchedText };
            roles.push(role);
            seenRoles.set(roleKey, role);
          }
        }
      }
    });

    // Check group membership (case-insensitive)
    if (event.group) {
      const eventGroupLower = event.group.toLowerCase();
      const matchingGroup = membership.groups.find(g => g.toLowerCase() === eventGroupLower);
      if (matchingGroup) {
        roles.push({
          type: 'GROUP',
          subject: event.group,
          kind: 'self',
          matchedText: event.group, // The group name from the sheet
        });
      }
    }
  });

  // Check if user's home address matches the event location
  if (event.location && profile.home_addresses.length > 0) {
    const locationLower = event.location.toLowerCase();
    const matchingAddress = profile.home_addresses.find(addr =>
      locationLower.includes(addr.toLowerCase())
    );
    if (matchingAddress) {
      roles.push({
        type: 'LOCATION',
        subject: event.location, // Use sheet's location text (e.g., "GOLDSTONE")
        kind: 'self',
        matchedText: event.location, // The location from the sheet
      });
    }
  }

  return roles;
}

export function filterRelevantEvents(
  events: Event[],
  profile: UserProfile
): { relevant: { event: Event; roles: Role[] }[]; nonRelevant: Event[] } {
  const relevant: { event: Event; roles: Role[] }[] = [];
  const nonRelevant: Event[] = [];

  events.forEach((event) => {
    const roles = computeRelevance(event, profile);
    if (roles.length > 0) {
      relevant.push({ event, roles });
    } else {
      nonRelevant.push(event);
    }
  });

  return { relevant, nonRelevant };
}
