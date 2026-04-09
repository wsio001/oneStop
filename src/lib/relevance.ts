import type { Event, UserProfile, Role, Membership } from '../types';

function normalize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[.,;:()\/]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

type TokenizedPerson = {
  display_name: string;
  tokens: Set<string>;
  kind: 'self' | 'spouse' | 'dependent';
};

const SELF_MATCH_COLUMNS = ['in_charge', 'helpers', 'childcare', 'food', 'notes', 'group'];
const DEPENDENT_MATCH_COLUMNS = ['childcare', 'notes', 'event_name', 'group'];

function tokenizeMembership(membership: Membership): TokenizedPerson[] {
  const people: TokenizedPerson[] = [];

  // Self
  const selfTokens = new Set(
    normalize([membership.self.display_name, ...membership.self.aliases].join(' '))
  );
  people.push({
    display_name: membership.self.display_name,
    tokens: selfTokens,
    kind: 'self',
  });

  // Spouse (only if show_spouse_events is true)
  if (membership.spouse && membership.show_spouse_events) {
    const spouseTokens = new Set(
      normalize([membership.spouse.display_name, ...membership.spouse.aliases].join(' '))
    );
    people.push({
      display_name: membership.spouse.display_name,
      tokens: spouseTokens,
      kind: 'spouse',
    });
  }

  // Dependents (only if show_kids_events is true)
  if (membership.show_kids_events) {
    membership.dependents.forEach((dep) => {
      const depTokens = new Set(
        normalize([dep.display_name, ...dep.aliases].join(' '))
      );
      people.push({
        display_name: dep.display_name,
        tokens: depTokens,
        kind: 'dependent',
      });
    });
  }

  return people;
}

function checkMatch(person: TokenizedPerson, cellValue: string): boolean {
  const cellTokens = normalize(cellValue);
  return cellTokens.some((token) => person.tokens.has(token));
}

export function computeRelevance(event: Event, profile: UserProfile): Role[] {
  const roles: Role[] = [];

  profile.memberships.forEach((membership) => {
    const people = tokenizeMembership(membership);

    people.forEach((person) => {
      const columnsToCheck =
        person.kind === 'dependent' ? DEPENDENT_MATCH_COLUMNS : SELF_MATCH_COLUMNS;

      // Check in_charge
      if (columnsToCheck.includes('in_charge')) {
        const inChargeText = event.in_charge.join(' ');
        if (checkMatch(person, inChargeText)) {
          roles.push({ type: 'LEAD', subject: person.display_name, kind: person.kind });
        }
      }

      // Check helpers
      if (columnsToCheck.includes('helpers')) {
        const helpersText = event.helpers.join(' ');
        if (checkMatch(person, helpersText)) {
          roles.push({ type: 'HELPER', subject: person.display_name, kind: person.kind });
        }
      }

      // Check childcare
      if (columnsToCheck.includes('childcare')) {
        const childcareText = event.childcare.join(' ');
        if (checkMatch(person, childcareText)) {
          roles.push({ type: 'CHILDCARE', subject: person.display_name, kind: person.kind });
        }
      }

      // Check food
      if (columnsToCheck.includes('food')) {
        const foodText = event.food.join(' ');
        if (checkMatch(person, foodText)) {
          roles.push({ type: 'FOOD', subject: person.display_name, kind: person.kind });
        }
      }

      // Check notes
      if (columnsToCheck.includes('notes') && event.notes) {
        if (checkMatch(person, event.notes)) {
          roles.push({ type: 'MENTIONED', subject: person.display_name, kind: person.kind });
        }
      }

      // Check event_name (dependents only)
      if (columnsToCheck.includes('event_name')) {
        if (checkMatch(person, event.event_name)) {
          roles.push({ type: 'MENTIONED', subject: person.display_name, kind: person.kind });
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
        type: 'MENTIONED',
        subject: 'Your address',
        kind: 'self',
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
