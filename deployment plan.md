# Schedule Lite — PWA Build Spec

A personal, "lite" Progressive Web App that reads a private Google Sheet and shows each user only the events that matter to them. Single-location launch, multi-location ready.

---

## What you're building

A React PWA that reads 15 days of schedule data from a private Google Sheet (one tab per day, current date + 14 days forward, plus a "Bulletin" tab) and presents it through three mobile-friendly tabs: Today, Weekly Overview, and Bulletin. The app filters events by "relevance" — showing the user events where they, their spouse, or their children are mentioned, based on intelligent name matching across several columns.

The app is for a single organization at a single location ("Irvine") on day one, serving ~150 people. The architecture must be ready to scale to ~150 locations / 2000 people later without a rewrite, but do not build the multi-location UI yet.

## Tech stack (non-negotiable)

- **Vite + React + Tailwind CSS** — Matches the developer's existing tooling (Grytt, meal planner).
- **Zustand** for state management — Not Context API (avoids re-render cascades).
- **No router library** — Three tabs is a `useState<'today' | 'weekly' | 'bulletin'>`. Do not pull in React Router.
- **Lucide React** for icons.
- **No UI component libraries** (no shadcn, no Radix, etc.) — Hand-rolled components with Tailwind. Keep the bundle tiny.
- **Vercel** for hosting — Static PWA + serverless functions in `api/`.
- **Vercel KV** for server-side storage (Google refresh tokens keyed by session id).
- **Google Identity Services + Auth Code flow via backend** — See Auth section below.
- **localStorage** for client-side profile storage.

Target: cold start under 2s on mid-tier mobile, bundle under 100KB gzipped for the shell.

---

## Build phases

Do not build everything in one pass. Build in this order and stop at each phase boundary to let the developer review:

**Phase 1: Shell + onboarding + settings + localStorage profile.** No Google auth yet, no sheets yet. The user can open the app, go through onboarding, see a stubbed Today tab with fake data, open the profile modal, edit their profile, and have it persist across reloads. This proves the profile data model and the UI shell work before any networking is involved.

**Phase 2: Google Sheets integration with hardcoded config.** Wire up the auth flow (Vercel functions + KV + Google OAuth), the discovery call, and the batchGet call. Use a hardcoded location config for the single launch location (Irvine). Get the Today tab showing real data from the sheet. This proves the network + auth + parsing pipeline works end-to-end.

**Phase 3: Relevance filtering + Weekly tab + Bulletin tab.** Implement the relevance matcher (with the structured name parsing algorithm below), the focus mode toggle, the weekly date ribbon with pips, the two-line row list, and the bulletin feed. Add multi-badge support (BadgeStack component with max 2 + "+N" layout). Add matchedText field to Role type for family deduplication logic. This is the bulk of the feature work.

**Phase 4: PWA polish.** Service worker with stale-while-revalidate, manifest.json with maskable icons, pull-to-refresh, content hashing for efficient re-renders, install prompts. Make it feel like a real app.

**Phase 5: Multi-location readiness (structural only).** Move the hardcoded config into a config-per-city structure even though only one city exists. Make sure the parser reads from a config rather than hardcoded column names. Do NOT build a city picker UI — that's for future-you.

### Phase 5 detailed requirements

**What Phase 5 adds:**

1. **API route city parameter.** Add `?city=<city_id>` query parameter to all `/api/sheets/*` endpoints. Look up sheet ID from environment based on city: `process.env[\`${city_id.toUpperCase()}\_SHEET_ID\`]`. Look up LocationConfig from registry: `getLocationConfig(city_id)`. Use config for discovery patterns, parsing rules, **and timezone-aware date filtering**.

2. **Environment variables per city.**

   ```env
   IRVINE_SHEET_ID=...
   SEATTLE_SHEET_ID=...
   AUSTIN_SHEET_ID=...
   ```

   Each city gets its own Google Sheet ID in environment config.

3. **Dynamic config selection in store.** `appStore.ts` reads `city_id` from user's active membership. Passes city_id to API calls: `/api/sheets/data?city=irvine&tabs=...`. Uses matching LocationConfig for parsing: `parseSheetTab(tabName, values, getLocationConfig(cityId))`.

4. **Groups API city awareness.** `/api/sheets/groups?city=<city_id>` uses city-specific config for tab pattern and header row location. Returns groups from that city's sheet validation rules.

5. **Multi-city profile support (data only).** User can have multiple memberships in `UserProfile.memberships[]`. Settings modal shows active membership only (first one for now). Future: add city switcher in settings, but NOT in Phase 5.

**What Phase 5 does NOT include:**

- ❌ UI for selecting/switching cities
- ❌ UI for managing multiple memberships
- ❌ City-specific theming or branding
- ❌ Discovery of available cities (still manual environment config)
- ❌ Bulletin parsing variations (assumes all cities have similar structure)

**Testing Phase 5:** create a second test sheet with different column names (e.g., "Leader" instead of "In Charge"), different header row (row 3 instead of row 2), different tab pattern. Add to environment as `TEST_SHEET_ID`. Create `TEST_CONFIG` in locationConfig.ts. Temporarily modify user profile to use `city_id: 'test'`. Verify app fetches and parses the test sheet correctly.

**Success criteria:**

- Same codebase serves multiple cities by environment config only
- Adding a new city requires: (1) env var, (2) LocationConfig entry, (3) no code changes
- User profile can contain multiple memberships (even if UI only shows one)
- All API routes accept and respect city parameter
- Parser works with different column names, header rows, and tab patterns

At each phase boundary, stop and write a short summary of what was built and what's next. Do not silently continue into the next phase.

---

## Data model

### UserProfile (stored in localStorage, key: `user_profile`)

```json
{
  "user_id": "uuid-generated-on-first-launch",
  "source": "manual",
  "profile_version": 1,
  "updated_at": 1712534400000,
  "home_addresses": ["Goldstone", "GS"],
  "memberships": [
    {
      "city_id": "irvine",
      "city_name": "Irvine",
      "region_id": "west_coast",
      "self": {
        "display_name": "William",
        "aliases": ["William Sio", "Will"]
      },
      "married": true,
      "show_spouse_events": true,
      "spouse": {
        "display_name": "Jessica",
        "aliases": ["Jessica M Sio", "Jess", "Jess S"]
      },
      "has_kids": true,
      "show_kids_events": true,
      "dependents": [
        { "display_name": "Emma", "aliases": ["Emma Sio", "Em"] },
        { "display_name": "Lucas", "aliases": ["Lucas Sio", "Luke"] }
      ],
      "groups": ["Youth", "Parents"]
    }
  ]
}
```

**Key rules:**

- `memberships` is an array even though the UI only exposes one at a time on day one. Never assume `.length === 1` in the code — the matcher iterates over all memberships.
- `home_addresses` is an array of address tokens. Used by the location matcher to detect events held at the user's home.
- `married` and `show_spouse_events` are independent flags. `married: true` means the user is married (and may have entered spouse info), `show_spouse_events: true` means matches against the spouse should affect the relevance filter. Both must be true for spouse matching to fire. When `married` is toggled off, the `spouse` object is cleared on save (with confirmation). When `show_spouse_events` is toggled off, spouse data is preserved but ignored by the matcher.
- Same dual-flag pattern for `has_kids` / `show_kids_events` and the `dependents` array.
- `self.display_name` is required; everything else is optional.
- `source` is always `"manual"` in Phase 1-5. The `"api"` and `"api_edited"` values are reserved for a future org-directory integration.
- `profile_version` bumps on every edit via `updateProfile()` and is used as a memo dependency by the relevance matcher for fast re-filtering.

### LocationConfig (hardcoded in Phase 2, structured per-city in Phase 5)

```json
{
  "city_id": "irvine",
  "city_name": "Irvine",
  "region_id": "west_coast",
  "sheet_id": "",
  "timezone": "America/Los_Angeles",
  "tab_discovery": {
    "pattern": "^(\\d{1,2})/(\\d{1,2})\\s+(MON|TUE|WED|THU|FRI|SAT|SUN)$",
    "bulletin_tab_name": "Bulletin"
  },
  "schema_version": 1,
  "header_row": 2,
  "data_start_row": 3,
  "column_map": {
    "time": ["Time", "When", "Start"],
    "event_name": ["Event", "Activity", "What"],
    "location": ["Where", "Room", "Location"],
    "in_charge": ["In Charge", "Lead", "Owner", "Leader"],
    "helpers": ["Helpers", "Team", "Volunteers"],
    "childcare": ["Childcare", "Kids", "Children"],
    "food": ["Food", "Meal", "Snacks"],
    "group": ["Group", "Ministry", "Dept", "Department"],
    "notes": ["Notes", "Comments", "Info"]
  },
  "transform_override": null
}
```

The `column_map` lets a generic parser find the right column regardless of label variation. First match wins; case-insensitive comparison.

### Event (canonical parsed shape)

```ts
type Event = {
  id: string; // stable hash of tab_name + row_index
  time: string; // raw string from sheet, e.g. "7:00 PM"
  sortKey: number; // parsed minutes-since-midnight for sorting
  event_name: string;
  location: string | null;
  in_charge: string[]; // Split array for matching
  in_charge_raw: string | null; // Original text for display
  helpers: string[];
  helpers_raw: string | null;
  childcare: string[];
  childcare_raw: string | null;
  food: string[];
  food_raw: string | null;
  group: string | null;
  notes: string | null;
  raw_tab: string; // e.g. "4/7 TUE" — source tab name
};
```

**Multi-value cell parsing:** The parser splits multi-value cells (in_charge, helpers, childcare, food) on ALL separators: `,` `:` `/` `+` `&` and the word "and" (using `\band\b` regex to avoid splitting words like "Anderson"). Each cell is stored BOTH as:

1. A split array (for matching) — used by the relevance matcher to iterate individual elements
2. The raw original text (for display) — preserves the original formatting like "Tech: Winnie + Stacy"

The matcher iterates the array elements individually (no joining) to find name matches. The UI displays the raw text verbatim to preserve the sheet's formatting choices.

### BulletinPost

```ts
type BulletinPost = {
  id: string;
  date: string;
  posted_by: string;
  subject: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
};
```

---

## Project structure

```
.
├── api/
│   ├── auth/
│   │   ├── start.ts
│   │   ├── callback.ts
│   │   └── logout.ts
│   └── sheets/
│       ├── discovery.ts
│       └── data.ts
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable.png
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── ProfileForm.tsx       // shared between onboarding + settings
│   │   ├── EventCard.tsx         // Today tab card
│   │   ├── WeeklyEventRow.tsx    // Weekly tab two-line row
│   │   ├── DateRibbon.tsx
│   │   ├── BulletinCard.tsx
│   │   ├── Badge.tsx             // single badge component
│   │   ├── BadgeStack.tsx        // right-aligned cluster with overflow
│   │   └── PullToRefresh.tsx
│   ├── tabs/
│   │   ├── TodayTab.tsx
│   │   ├── WeeklyTab.tsx
│   │   └── BulletinTab.tsx
│   ├── screens/
│   │   └── OnboardingScreen.tsx
│   ├── lib/
│   │   ├── userProfile.ts        // getCurrentUser, updateProfile, subscribeToProfile
│   │   ├── useProfile.ts         // React hook
│   │   ├── relevance.ts          // tokenization + matching
│   │   ├── nameMatch.ts          // structured name parser + matcher
│   │   ├── parser.ts             // generic column-map sheet parser
│   │   ├── hash.ts               // fnv1a + content hashing
│   │   ├── sheets.ts             // fetch wrappers calling /api/sheets/*
│   │   ├── dates.ts              // tab name parsing, date math
│   │   ├── colors.ts             // role → color ramp lookup
│   │   └── locationConfig.ts     // the hardcoded config (Phase 2), registry (Phase 5)
│   ├── store/
│   │   └── appStore.ts           // zustand store for sheet data, hashes, lastSync
│   └── sw.ts                     // service worker source
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .env.example
```

Use TypeScript throughout.

---

## The relevance matcher

The matcher is the core of the app. It runs once per profile change (or per data refresh) and produces, for each event, an array of matched roles. Tokenize once, match many times. Cache aggressively. Use `profile_version` as the memo key — not the profile object itself.

### Structured name parsing

Each person (self, spouse, each dependent) is parsed from their `display_name` + `aliases` into a structured form, not just a token bag.

```ts
type ParsedName = {
  firstName: string; // lowercase
  lastName: string; // lowercase
  middleTokens: string[]; // lowercase, may be empty
  nicknames: string[]; // exact-match tokens, lowercase
  displayName: string; // for badge display
};

type TokenizedPerson = {
  parsedName: ParsedName;
  kind: "self" | "spouse" | "dependent";
};
```

The `TokenizedPerson` wrapper stores the person's kind (self/spouse/dependent) alongside their parsed name structure. This separation keeps the name parsing logic clean while preserving context needed for matching scope and badge display.

**Parsing algorithm:** the `display_name` is treated as the canonical name. The first token is the first name, the last token is the last name, anything between is middle tokens. Aliases that look like full names (multiple tokens with a recognizable last name) are merged into the same structure (additional first/middle variants kept as alternates). Aliases that look like nicknames (single short token, or two tokens where the second is a single letter like "Jess S") become entries in `nicknames`.

Example — `display_name: "Jessica"`, `aliases: ["Jessica M Sio", "Jess", "Jess S"]`:

- firstName: `"jessica"`
- lastName: `"sio"`
- middleTokens: `["m"]`
- nicknames: `["jess", "jess s"]`
- displayName: `"Jessica"`

Example — `display_name: "William"`, `aliases: ["William Sio", "Will"]`:

- firstName: `"william"`
- lastName: `"sio"`
- middleTokens: `[]`
- nicknames: `["will"]`
- displayName: `"William"`

If the user enters their `display_name` as just `"William"` without a last name, the parser walks aliases looking for a multi-token entry to extract the last name from. If no last name can be derived from any alias, store `lastName: ""` and the matcher uses first-name-only matching as a degraded mode (with a higher false positive rate, but still functional).

### Cell matching algorithm

For multi-value cells (in_charge, helpers, childcare, food), the parser has already split them into arrays of individual elements. The matcher iterates over each array element directly (no joining, no additional splitting) and checks each element against each TokenizedPerson.

**Normalization (applied to each array element before matching):**

```ts
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,;:()\/+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

**For single-value cells** (notes, event_name, group), normalization is applied to the full cell text before matching.

**Matching rules** for a single candidate phrase against a single ParsedName:

1. **Nickname match (highest confidence).** If the candidate exactly equals one of the nicknames, match. Done. Example: candidate `"dk"` matches nickname `"dk"`.

2. **Plural family-name match.** If the candidate ends in "s" and removing the "s" yields the lastName, match. Also matches phrases like "all the kims" (contains "kims" which depluralizes to "kim"). This is a **family reference match** — flag it as such so deduplication can handle it later. Example: candidate `"sios"` matches lastName `"sio"` → family ref. Candidate `"all the kims"` → contains `"kims"` → matches lastName `"kim"` → family ref.

3. **Full structured match.** Tokenize the candidate. Match if:

   - Last name is present in candidate tokens (full word OR as a token's match for the lastName's first letter, e.g. "Sio" → "S"), AND
   - At least one of: firstName matches a candidate token, OR firstName's first letter matches a single-letter candidate token, OR any middleToken matches a candidate token.

   Examples for William Sio:

   - `"william sio"` → lastName "sio" present, firstName "william" present → match
   - `"william s"` → lastName matches "s" as initial, firstName present → match
   - `"w sio"` → lastName "sio" present, firstName initial "w" present → match
   - `"william lee"` → wrong last name → no match
   - `"william"` alone → no last name → no match (avoids false positives on common first names)

4. **No match otherwise.** Do not fall back to "any token overlap" — that creates too many false positives. The structured rules are deliberately strict.

### Match scope per person kind

Not every person matches against every column.

```ts
const SELF_MATCH_COLUMNS = [
  "in_charge",
  "helpers",
  "childcare",
  "food",
  "notes",
  "group",
];
const SPOUSE_MATCH_COLUMNS = SELF_MATCH_COLUMNS; // same as self
const DEPENDENT_MATCH_COLUMNS = ["childcare", "notes", "event_name", "group"];
```

Dependents use the narrower scope intentionally — a kid shouldn't match the "In Charge" column because "Emma T." in that column almost always means adult volunteer Emma Thompson, not the user's daughter Emma.

The matcher respects the visibility flags. **Skip the spouse entirely when `show_spouse_events` is false. Skip dependents entirely when `show_kids_events` is false.** These flags are checked once per matcher invocation, not per event.

### Role types and the result shape

```ts
type Role = {
  type:
    | "LEAD"
    | "FOOD"
    | "HELPER"
    | "CHILDCARE"
    | "MENTIONED"
    | "LOCATION"
    | "GROUP";
  subject: string; // text to display in the badge subject position
  kind: "self" | "spouse" | "dependent";
};
```

**Current implementation (Phase 1-2):** The Role type includes `type` (the role category), `subject` (the badge label - either "YOU" or the person's displayName), and `kind` (whether this is self/spouse/dependent).

**Phase 3 addition:** The `matchedText` field will be added to support family deduplication. When multiple people from the same family match the same cell text (e.g., "Sios" matches both William and Jessica), the dedup logic will collapse them into a single role with `kind: "family"` and `subject` set to the uppercased matched text. The `matchedText` field stores the original cell text for this grouping logic.

### Family deduplication (Phase 3)

**Note:** This feature is deferred to Phase 3. The current implementation (Phase 1-2) does not include the `matchedText` field or family deduplication logic.

When a single event has multiple matches that all came from the same family-reference cell text, collapse them into one role with `kind: "family"`. Example: cell says "In Charge: Sios", both William and Jessica match (both have lastName "sio") — instead of producing two LEAD roles (`WILLIAM: LEAD` and `JESSICA: LEAD`), produce one (`SIOS: LEAD`).

Algorithm: after computing all roles for an event, group them by `(type, matchedText)`. If a group has multiple entries from the same membership and the matchedText is a family reference (came from rule 2 above), collapse to a single role with `subject` = uppercased matchedText.

This naturally handles "All the Kims" → produces one `ALL THE KIMS: LEAD` badge instead of N individual badges.

### LOCATION matching

In addition to name matching, the matcher checks the event's `location` field against the user's `home_addresses`. If any home address (after normalization) is found as a substring in the event location, add a LOCATION role:

```ts
{
  type: "LOCATION",
  subject: event.location,    // the sheet's location text (e.g., "GOLDSTONE")
  kind: "self"
}
```

The badge for this reads `{LOCATION_TEXT}: LOCATION`, e.g. `GOLDSTONE: LOCATION`. Uses the sheet's location text as the subject.

### GROUP matching

If the event's `group` cell matches any of the user's `groups` (case-insensitive equality after trimming), add a GROUP role:

```ts
{
  type: "GROUP",
  subject: event.group,    // the sheet's group text
  kind: "self"
}
```

The badge reads `{GROUP_TEXT}: GROUP`, e.g. `YOUTH: GROUP`. Use the sheet's group text, not the user's groups list entry.

### Relevance and the role list

An event is **relevant** if `roles.length > 0`. The full role list is attached to the event for the UI to render. The UI decides what to show based on the color precedence and badge layout rules below.

---

## Color and badge system

Color is driven by the user's relationship to the event, not by which group runs the event.

### Role color and precedence

A single ordered list governs both card color and badge ordering. Lower number = higher priority.

| #   | Role       | Tailwind ramp | Why                                                           |
| --- | ---------- | ------------- | ------------------------------------------------------------- |
| 1   | LEAD       | purple        | Important / authoritative. Doubles as the app's accent color. |
| 2   | FOOD       | amber         | Warm, food-coded.                                             |
| 3   | HELPER     | teal          | Friendly, supportive.                                         |
| 4   | CHILDCARE  | teal          | Same as helper — consolidated to reduce palette.              |
| 5   | MENTIONED  | orange        | Notes column matches, lower priority than direct roles.       |
| 6   | LOCATION   | orange        | Warm, "this is at your place."                                |
| 7   | GROUP      | orange        | Same as location — consolidated.                              |
| —   | (no match) | grey          | Non-relevant.                                                 |

**Card color = the highest-precedence role's color.** A card with both LEAD and FOOD roles uses the purple ramp (border + background tint), not amber.

Define the mapping in `src/lib/colors.ts` as a single function that takes a role list and returns:

```ts
{
  borderColor, backgroundColor, textPrimary, textSecondary, primaryRoleType;
}
```

Use Tailwind's purple, amber, teal, orange palette ramps. Suggested ramp stops:

- Border: 500 (e.g. `purple-500`)
- Background: 50 (e.g. `purple-50`)
- Text primary (event name): 900 (e.g. `purple-900`)
- Text secondary (details): 800 (e.g. `purple-800`)
- Time label: 800 with weight 500

### Badge layout (Phase 3)

**Note:** Multi-badge support is deferred to Phase 3. The current implementation (Phase 1-2) shows a single badge for the highest-precedence role only.

Badges sit on the top line of the event card, **right-aligned**, growing leftward from the right edge. The top line uses `display: flex; justify-content: space-between` — time on the left, badge cluster on the right.

**Reading order within the badge cluster:** highest precedence is **leftmost** in the cluster (closest to the event name), so the eye reads it first when scanning right from the event name. A card with LEAD + FOOD shows `[LEAD] [FOOD]` from left to right within the right-aligned cluster.

**Maximum 2 badges visible.** If there are 3+ roles, show the top 2 by precedence and a `+N` indicator as a third "badge" in the cluster. Example: LEAD + FOOD + HELPER → `[LEAD] [FOOD] +1`. The full role list is still visible in the detail strip below.

**Important: do not include a group label after the time on the top line.** The card's previous design had `6:00 AM · All Irvine` — drop the group label entirely. Just `6:00 AM` on the left, badge cluster on the right. This frees up horizontal space for the badge cluster.

### Badge text formats

**Current implementation (Phase 1-2):** Badge format is `{SUBJECT}: {ROLE}` where:

- Subject is `"YOU"` for self matches, or the person's displayName (uppercased) for spouse/dependent matches
- For LOCATION matches: subject is the sheet's location text (e.g., `GOLDSTONE: LOCATION`)
- For GROUP matches: subject is the sheet's group text (e.g., `YOUTH: GROUP`)

**Phase 3 additions:**

1. **Family reference match:** `{MATCHED_TEXT}: {ROLE}` — e.g. `SIOS: LEAD`, `KIMS: HELPER`, `ALL THE KIMS: LEAD`. The matched cell text replaces individual subjects; deduplicates same-event matches.

2. **Multiple roles for the same person on the same event:** show only the highest-precedence role for that person in the badge. The other roles are still visible in the detail strip below.

### Badge visual style

- Pill shape: `border-radius: 999px`
- Padding: `4px 8px`
- Font: 9px, weight 500
- Color: white text on the role's mid-ramp color (e.g. `bg-purple-500 text-white` for LEAD)
- Spacing within cluster: 4px gap between badges

---

## The generic sheet parser

Input: raw 2D array from `values.batchGet` for one tab, plus the `LocationConfig`.
Output: `Event[]`.

Algorithm:

1. Read `header_row` (1-indexed) to get the header row.
2. For each canonical field in `column_map`, find the first header cell that case-insensitively matches any of the aliases. Build a `fieldIndex: Record<string, number>` map.
3. Iterate from `data_start_row` to end. Skip rows where the time cell is empty.
4. For each row, build an `Event` object by reading each field from its mapped column index. Store multi-value cells as raw strings (do NOT pre-split).
5. Parse the time string into `sortKey` (minutes since midnight) for ordering. Handle "7:00 PM", "7:00pm", "19:00", etc. Fall back to `Infinity` if unparseable.
6. Generate a stable `id` via `fnv1a(tab_name + ":" + row_index)`.

Return the events sorted by `sortKey`.

If any required canonical field (`time`, `event_name`) can't be mapped from headers, log a warning and return an empty array for that tab. Never throw — the app should degrade gracefully.

---

## Auth flow (Vercel + Vercel KV)

### Client-side

On app load, check for the `sid` cookie (implicit via making a request). Call `/api/sheets/discovery` to see if we're authenticated. If 401, redirect to `/api/auth/start`. If 200, proceed.

### `/api/auth/start`

Generate a CSRF state token, store it in a short-TTL KV key, redirect to Google's consent screen with:

- `client_id`
- `redirect_uri=https://{host}/api/auth/callback`
- `response_type=code`
- `scope=https://www.googleapis.com/auth/spreadsheets.readonly`
- `access_type=offline`
- `prompt=consent`
- `state=<token>`

The `access_type=offline` and `prompt=consent` are both REQUIRED. Without them, Google won't return a refresh token. This is the #1 gotcha.

### `/api/auth/callback`

1. Verify the `state` param against the CSRF token in KV (then delete it).
2. Exchange the `code` for `{access_token, refresh_token, expires_in}` via POST to `https://oauth2.googleapis.com/token`.
3. Generate a new session id (`crypto.randomUUID()`).
4. Store `{refresh_token, access_token, expires_at}` in KV under `session:{sid}` with a 180-day TTL.
5. Set `Set-Cookie: sid={sid}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=15552000`.
6. Redirect to `/`.

### `/api/sheets/discovery`

1. Read `sid` cookie. If missing, return 401.
2. Read session from KV. If missing, return 401.
3. If `access_token` is expired or within 60s of expiring, refresh it (POST to `oauth2.googleapis.com/token` with `grant_type=refresh_token`, update KV).
4. Call `https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}?fields=sheets.properties(sheetId,title,index)` with the access token.
5. Parse tab titles using the LocationConfig's tab pattern, build a sorted `{date: string, tab_name: string}[]` map of day tabs plus the bulletin tab.
6. Return as JSON.

### `/api/sheets/data`

1. Same auth preamble as discovery.
2. Accept a `?tabs=tab1,tab2,tab3` query param.
3. Issue a single `values.batchGet` call with those ranges.
4. Return the parsed value ranges as JSON.

### Environment variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `IRVINE_SHEET_ID` (in Phase 5 each city gets its own)
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (provided by Vercel KV integration)

Put these in `.env.local` for dev and in Vercel project settings for prod. Provide a `.env.example` file.

---

## State store (Zustand)

```ts
type AppState = {
  // Sheet data, keyed by tab name
  tabs: Record<string, Event[]>;
  bulletin: BulletinPost[];

  // Content hashes for the slush optimization
  hashes: Record<string, string>;

  // Discovery result
  discoveryMap: { date: string; tab_name: string }[];

  // Sync metadata
  lastSync: number | null;
  syncing: boolean;
  authStatus: "unknown" | "authenticated" | "unauthenticated";

  // Actions
  refreshAll: () => Promise<void>;
  refreshIfStale: (maxAgeMs: number) => Promise<void>;
};
```

`refreshAll` does discovery → batchGet → hash each returned tab → diff against stored hashes → only update `tabs` for tabs whose hash changed. Keep unchanged tabs' array references identical so React.memo works.

---

## UI specifications

### Layout

- Single-column mobile layout, max-width 500px centered on larger screens.
- Header (persistent across all tabs): tab title and subtitle on the left, profile icon on the right. Height ~56px.
- Tab bar at bottom: three icons + labels (Today / Weekly / Bulletin). Height ~60px. Active tab uses the purple accent color.
- Content area between header and tab bar scrolls independently. Pull-to-refresh lives on the content scroll container.

### Header profile icon

- 32px circle
- If profile exists: first letter of `self.display_name`, purple background (`bg-purple-100 text-purple-900`)
- If no profile: grey `UserCircle` lucide icon
- Tap target at least 44×44px even if visible icon is 32px
- Tap opens the settings modal

### Onboarding screen and ProfileForm

The onboarding screen and the settings modal use **the exact same `ProfileForm` component**, just rendered with different props:

```jsx
// Onboarding
<ProfileForm
  initialValue={null}
  submitLabel="Get started"
  onSubmit={profile => { updateProfile(profile); navigate("/today"); }}
/>

// Settings
<ProfileForm
  initialValue={currentProfile}
  submitLabel="Save"
  onSubmit={profile => { updateProfile(profile); closeModal(); }}
  showResetButton={true}
/>
```

Same component, same validation, same field layout. The settings version adds a "Reset app" button at the bottom (danger zone). **That is the ONLY difference between onboarding and settings.**

App entry logic:

```ts
const profile = useProfile();
return profile ? <MainApp /> : <OnboardingScreen />;
```

### ProfileForm sections

In order, top to bottom:

**1. City**

- Dropdown/select for choosing the city (currently hardcoded to Irvine in Phase 1-2, will become dynamic in Phase 5)

**2. Home address**

- Field: "Home address" — comma-separated text input. Helper text: "Add the street name or any way your home is referred to on the calendar."
- Stored as `home_addresses: string[]` after splitting on comma and trimming.

**3. You**

- Field: **"Name"** — required text input. (Note: the label is "Name", NOT "Display name".)
- Field: **"How you've been referred to on this calendar"** — comma-separated text input for aliases and nicknames. Helper text: "Add nicknames or variations of your name that appear in the calendar."

**4. Married? (nested two-toggle section)**

- Outer toggle: "Married?" (default off)
- When ON, the section gets a purple border and tinted background, and expands to reveal:
  - Inner toggle: "Show spouse's events too?" (default on when first revealed)
  - Helper text: "You can turn this on later if you change your mind."
  - When the inner toggle is ON, fields appear:
    - "Spouse's name"
    - "How they've been referred to on this calendar"
- Visual: nested fields are inside the purple container, separated by thin dividers.
- When `married` is toggled OFF, show a confirmation: "Turning this off will remove [Spouse]'s info. Continue?" — on confirm, clear the spouse object.
- When `show_spouse_events` is toggled off (but married stays on), keep the data but show helper text: "Your spouse's info is saved but won't appear in your feed."

**5. Have kids? (same nested pattern)**

- Outer toggle: "Have kids?" (default off)
- When ON, expands to reveal:
  - Inner toggle: "Show kids' events too?"
  - When ON, dynamic list of kids:
    - Each row: "Child's name" + "How they've been referred to on this calendar" + remove button (X)
    - "+ Add child" row at the bottom (dashed border)
- Same confirmation pattern when toggling `has_kids` off (clears the dependents array).

**6. Groups**

- Multi-select pills. Selected pills use the purple accent color. Unselected pills are grey.
- Source of truth: a hardcoded list in Phase 1-4, fetched from the sheet validation rules in Phase 5+.

**7. Reset app (settings modal only, NOT in onboarding)**

- Small centered red text link at the very bottom, separated by a divider.
- **Note:** The Reset button lives in the SettingsModal component (outside ProfileForm), not passed as a prop. This keeps ProfileForm focused on profile data only.
- Tap shows confirmation dialog: "This will erase all your settings and return you to setup. Continue?"
- On confirm, clear localStorage and reload the app.

### Settings modal mechanics

- Full-screen modal that opens from the bottom with a slide animation
- Header: X (cancel) on left, "Profile" title center, "Save" button right
- Save button is disabled until the form is dirty (compare JSON of current form state vs saved profile)
- On save: call `updateProfile(form)`, close modal, emit profile change event so tabs re-filter
- If user tries to close while dirty, show "Discard changes?" confirmation
- If user is in a relationship/kids confirmation flow and dismisses, the toggle reverts

### Today tab

**Header:**

- Title: "Today"
- Subtitle: full date, e.g. "Tue, Apr 7 · Updated 9:38a"

**Focus toggle (pill switcher):**

- Two options: `My events (N)` / `All (M)` where N = relevant event count, M = total event count
- Tap to switch
- Default to "My events"

**My events mode:**

- Shows ONLY relevant events (events with `roles.length > 0`)
- Each card uses the full-color treatment (see Event Card specs below)
- Sorted chronologically
- If empty, show empty state: "Nothing on the schedule for you today" with a calendar icon
- **Do NOT render non-relevant events at all in this mode.**

**All events mode:**

- Shows ALL events, sorted chronologically (relevant and non-relevant interleaved by time)
- Relevant events use the full-color treatment
- Non-relevant events use the muted/compressed treatment (smaller fonts, tighter padding, grey border, no background tint, 70% opacity)

**Pull-to-refresh** is on the scroll container.

### Event card (Today tab)

**Relevant card:**

- Border: 1.5px solid in role color (highest-precedence role's mid-ramp color, e.g. purple-500 for LEAD)
- Background: tinted role color (e.g. purple-50 for LEAD)
- Padding: 8px 10px
- Border radius: 8px (var(--border-radius-md))
- Margin bottom: 6px

Layout (top to bottom):

- **Top line** (`flex justify-between items-center` — margin-bottom 3px):
  - Left: time only (e.g. `6:00 AM`), 10px, role color dark shade (e.g. `text-purple-800`), font-weight 500. **Do NOT include a group label after the time.**
  - Right: badge cluster (right-aligned, max 2 + "+N", see Badge layout above)
- **Event name**: 12px, font-weight 500, role color darkest shade (e.g. `text-purple-900`), margin-bottom 5px
- **Detail strip** (each line, 9px, role color medium-dark shade, line-height 1.6):
  - 📍 Location (only if present)
  - 👑 In Charge (only if present - uses raw cell text from the sheet)
  - 👤 Helpers (only if present - uses raw cell text from the sheet)
  - 😊 Childcare (only if present)
  - 🍴 Food (only if present)
  - 📓 Notes (only if present)

Each detail line has its emoji as a prefix, followed by the raw cell text. If a field is empty in the sheet, omit that line entirely. The matcher reads the raw cell text for matching, but the display always shows the sheet content verbatim — never reformatted or restructured.

**Non-relevant card (All mode only):**

- Border: 0.5px solid grey (`border-gray-300`)
- Background: none
- Padding: 12px horizontal, 8px vertical (`px-3 py-2`)
- Opacity: 100% (no opacity applied)
- Margin bottom: 12px (`mb-3`)

Layout — same structure and same font sizes as relevant cards, but gray colors:

- Time: 10px (`text-[10px]`), weight 600 (`font-semibold`), `text-gray-700`
- Event name: 12px (`text-xs`), weight 600 (`font-semibold`), `text-gray-700`, margin-bottom 6px
- Detail lines: 9px (`text-[9px]`), `text-gray-600`, line-height normal
- Notes divider border: `border-gray-300`
- No badges (non-relevant by definition has no roles to display)

Visual hierarchy is maintained through gray colors, thin border, and lack of background tint, while keeping readability high with the same font sizes as relevant cards.

### Weekly tab

**Header:**

- Title: "Weekly"
- Subtitle: date range, e.g. "Apr 7 – 21" — computed from `discoveryMap[0].date`
  and `discoveryMap[discoveryMap.length - 1].date`. Adapts to month rollover
  (e.g. "Apr 28 – May 12").

**Focus toggle:** same `My events / All` pill switcher as Today, with the same
semantics. The filter respects `show_spouse_events` and `show_kids_events` from
the user profile — when these are off, those people's events do not count as
relevant, identical to Today behavior. This affects the pips, the counts, and
which rows render in My events mode.

**Date ribbon:**

- Horizontal scrolling strip of **15 day cells** (current date + 14 days
  forward = 15 total)
- Each cell is **26px wide** with 2px gap between cells
- Total ribbon width is ~420px, intentionally wider than typical phone
  viewports so horizontal scroll always works
- Each cell shows (top to bottom):
  - Day-of-week abbreviation (Tue, Wed, Thu) at 8px, `text-gray-500` (always gray)
  - Day-of-month number at 11px, weight 500, with `padding-bottom: 4px` to create gap above pip row
  - Pip row underneath: small colored dots (3px) representing relevant events
- **Today marker styling (applies to today's date number only):**
  - Text color: `text-orange-600` (instead of default near-black)
  - Add 1px underline: `text-decoration: underline`
  - Underline color: `text-decoration-color: rgb(234 88 12)` (orange-600)
  - Underline offset: `text-underline-offset: 3px`
  - **Important:** Today marker styling persists even when today is the selected day — both the purple pill background AND the orange underline render together
  - Day-of-week label ("Tue") above the number stays `text-gray-500` always
  - No dot or indicator in the pip row for "today" — pips represent relevance only
- Selected cell: purple pill background (`bg-purple-100`), rounded corners
- On initial render, scroll so today's cell is roughly 1/4 from the left edge
  (most scrollable content is future days, so today sits left of center)
- Auto-scroll: when the user taps a day or the selected day changes, scroll
  to keep the selected cell roughly centered in view
- Smooth horizontal momentum scrolling (`-webkit-overflow-scrolling: touch`)
- **Scrollability indicators** (combined cutoff + gradient approach):
  - Ribbon max-width: `calc(100vw - 48px)` to create cutoff effect on last visible date
  - Right-edge gradient overlay: 64px wide, `linear-gradient(to left, bg-gray-50, transparent)`
  - Gradient positioned absolutely with `pointer-events-none`
  - Last date partially visible (~40% cutoff) to signal more content
  - Familiar UX pattern (Netflix, App Store) for horizontal scroll affordance
- **Pip consolidation:** Show only 1 pip per role type (deduplicate by type)
  - Example: If a day has 2 GROUP events + 1 FOOD event = show only 2 pips (1 orange for GROUP, 1 amber for FOOD)
  - Prevents visual clutter when user has multiple events of the same type
- Pip colors come from the role precedence — each pip is the color of that
  role type's badge color
- Max 3 pips per cell (3 unique role types), then a "+" indicator if more unique types exist
- **Pips are computed from RELEVANT events only, regardless of the focus
  toggle.** The pips answer "where do I have stuff this week," and that
  question doesn't change based on whether you're currently filtering
- Selected day persists in zustand store across tab navigation within the
  session; defaults to today on session start

**Selected day subheader:**

- "Thursday, Apr 9 · N events" where N reflects the active filter mode
  (relevant count in My mode, total count in All mode)

**Event list:** vertical stack of two-line rows for the selected day. NO
accordion. NO chevron. NO tap-to-expand. Every row shows full details inline.
Rows are not clickable.

**Empty states:**

- If the selected day has zero events at all: show "No events scheduled" with
  a small calendar icon
- If the selected day has events but none are relevant in My events mode: show
  "Nothing for you on [day name]" with a "Show all events" link that switches
  the focus toggle to All

**Pull-to-refresh:** works on the Weekly scroll container same as Today.

### Weekly event row (two-line)

**Relevant row:**

- Left border: 3px in role color (highest-precedence role's mid-ramp)
- Background: tinted role color (50 stop)
- Padding: 7px 10px
- Border radius: 8px
- Margin bottom: 5px

Layout:

- **Top line** (`flex justify-between items-center`):
  - Left side (`flex items-center gap-1.5 flex-1 min-w-0`):
    - Time, 10px, weight 500, role color dark shade, min-width 38px
    - Event name, 11px, weight 500, role color darkest shade
  - Right side: badge cluster (same layout rules as Today — max 2 + "+N",
    right-aligned, highest precedence leftmost)
- **Bottom line** (detail strip, 9px, role color medium-dark, padding-left
  44px to align with the event name above, line-height 1.5):
  - Pipe-separated inline format: `📍 Location · 👑 In Charge · 👤 Helpers · 😊 Childcare · 🍴 Food · 📓 Notes`
  - Only include fields that exist; separate present fields with " · "
  - 👑 for In Charge, 👤 for Helpers (separated), 😊 for Childcare (changed from 👶)

**Non-relevant row (All mode only):**

- Left border: 3px solid grey
- Background: none
- Padding: 5px 9px
- Margin bottom: 4px
- **Opacity: 70%**

Smaller sizes:

- Time: 9px, weight 500, gray-600, min-width 34px
- Event name: 10px, gray-600
- Detail strip: 8px, gray-500, padding-left 39px

### Bulletin tab

**Header:** title "Bulletin", no subtitle.

**Feed:** vertical list of cards, newest first.

**Data source:**
- Google Sheet tab name: `BULLETIN 📢` (configured in `IRVINE_CONFIG.tab_discovery.bulletin_tab_name`)
- Row 2 (index 1): Headers - `DATE | POSTED BY | SUBJECT | WHAT | LINK`
- Row 3+ (index 2+): Data rows

**Sorting:**
- Posts sorted by date (newest first)
- Date parsing logic:
  - Parse M/D format (e.g., "4/7", "8/26")
  - If parsed date would be in future, use previous year (announcements can't be posted in future)
  - Example: Today is 4/10/2026, "4/7" → 4/7/2026, "8/26" → 8/26/2025
  - Sort by timestamp descending (newest → oldest)

**Bulletin card:**

- Background: white
- Border: 0.5px solid gray-200
- Padding: 10px 12px (px-3 py-2.5)
- Border radius: 8px
- Margin bottom: 8px (mb-2)
- **Dynamic height**: Card expands to show full text content (no truncation)

Layout:

- **Top row** (`flex justify-between`): date on left (9px gray-500), posted_by on right (9px gray-500)
- **Subject**: 12px, weight 500, margin 4px 0
- **Body**: 10px, gray-600, line-height 1.5, `whitespace-pre-line` to preserve newlines from sheet cells
  - No line-clamp - shows full text
  - Newlines (`\n`) from Google Sheet cells are preserved and rendered
  - Example: Multi-line text in sheet renders with line breaks
- **Link pill** (only if `link_url` is present): inline-block, blue-500 background, 9px text, "Open link →" (default) or uses `link_label` if provided in separate column
  - Opens URL in system browser via `window.open(url, '_blank')`
  - Hover state: blue-600

**Discovery and parsing:**
- Discovery API (`/api/sheets/discovery`) matches tab name exactly: `title === 'BULLETIN 📢'`
- Parser (`parseBulletinTab`) expects columns: DATE, POSTED BY, SUBJECT, WHAT, LINK
- Generates `dateValue` timestamp for sorting
- Returns `BulletinPost[]` sorted newest first

**States:**
- **Loading** (first load, `lastSync === null`): 3 skeleton cards with pulse animation
- **Empty** (`bulletin.length === 0`): "No bulletin posts" with subtitle "Check back later for updates"
- **Populated**: Feed of cards sorted newest first

The Bulletin tab is NOT affected by the relevance filter — bulletin posts are broadcasts to everyone, so they appear for every user regardless of toggles.

### Pull-to-refresh

On each tab's scroll container. Pulling down past 80px shows a refresh indicator at the top; release triggers `refreshAll()`. Show a toast after: "Updated" or "No changes" depending on hash diff result.

### Empty, loading, and error states

Every tab needs three states beyond the happy path:

- **Loading** (first load only) — skeleton rows, not a spinner
- **Empty** — friendly text with a subtitle
- **Error** — "Couldn't load schedule" with a "Try again" button

The skeleton for Today is 3 rounded rectangles at event-card height. For Weekly, the date ribbon + 3 row skeletons. For Bulletin, 3 card skeletons.

### iOS install banner

On iOS, the install flow is manual ("Share → Add to Home Screen"). Detect:

```js
!window.matchMedia("(display-mode: standalone)").matches &&
  /iPhone|iPad/.test(navigator.userAgent);
```

and show a dismissible banner on first launch explaining how to install. Use the purple ramp colors. Store the dismissal in localStorage so it doesn't nag.

---

## PWA specifics

### Manifest

```json
{
  "name": "Schedule Lite",
  "short_name": "Schedule",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#7F77DD",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Service worker

Hand-written, not Workbox. ~60 lines. Strategy:

- Precache the app shell (HTML, JS, CSS) on install
- Runtime cache: stale-while-revalidate for `/api/sheets/*` responses
- Network-only for `/api/auth/*` (never cache auth endpoints)
- Cache name versioned (e.g. `schedule-lite-v1`) so you can bump and invalidate on deploys

---

## Content hashing (the slush optimization)

```ts
// src/lib/hash.ts
export function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function hashValues(values: unknown): string {
  return fnv1a(JSON.stringify(values));
}
```

In the refresh flow:

1. Fetch fresh data from the API.
2. For each returned tab, compute `fnv1a(JSON.stringify(valuesForThatTab))`.
3. Compare to the stored hash map in localStorage.
4. Only parse + update state for tabs whose hash changed.
5. Write the new hash map to localStorage.
6. Unchanged tabs keep their existing `Event[]` reference in state so memoized children don't re-render.

Store the hash map in localStorage under key `tab_hashes` so it survives reloads.

---

## Important gotchas

**Discovery API uses location timezone for date filtering.** The discovery endpoint filters tabs to "today + 14 days" using the location's timezone from LocationConfig. In Phase 1-4, this is hardcoded to `America/Los_Angeles` for Irvine. In Phase 5, it must use the city parameter to look up the correct timezone. Without timezone-aware filtering, UTC midnight on the server could exclude the current day for users in earlier timezones.

**Google refresh tokens only return on first consent.** Always pass `prompt=consent` and `access_type=offline` on the initial auth URL.

**The tab names change daily.** Never hardcode "today's tab name." Always resolve it via the discovery call.

**December/January rollover.** Tab names are `M/D ddd` without a year. When parsing, attach the current year, but if the resulting date would be >6 months in the past, add a year.

**iOS Safari ITP.** localStorage gets cleared after 7 days of no interaction with the origin. Users should install the PWA to home screen; detect non-standalone mode on iOS and show the install banner.

**Never put the Google access token in the client.** The whole point of the backend is that the client never sees Google credentials. The PWA only talks to `/api/sheets/*`.

**Parse names once, match many times.** The relevance matcher must not re-parse names on every event check. Build the ParsedName structures once when profile or membership changes, cache them, and reuse for every event.

**`profile_version` as a memo key.** Tab filters should use `profile_version` (not the profile object) as a `useMemo` dependency.

**My events mode shows ONLY relevant events.** Do not render non-relevant events in My events mode at all. Non-relevant events only appear in All events mode, with the muted/compressed treatment.

**Multi-value cells are stored BOTH as split arrays AND raw strings.** The parser splits on ALL separators (`,` `:` `/` `+` `&` and word "and") and stores the array for matching. It also preserves the original raw text for display. The matcher iterates array elements individually (no joining). The UI displays the raw text to preserve formatting like "Tech: Winnie + Stacy" or "LEAD: Eva Michelle, Vanessa, Phoebe."

**Family deduplication runs after all roles are computed.** Don't try to dedupe inside the matcher loop — collect everything first, then collapse same-event same-cell-text matches at the end.

**Card color is always the highest-precedence role's color.** Even if a card has badges for LEAD and FOOD, the card itself is purple (the LEAD color), not split or gradient.

**Badges read left-to-right within the right-aligned cluster.** Highest precedence is leftmost (closest to the event name), so the most important badge is read first.

---

## What NOT to build (in this pass)

- Multi-city picker UI or toggle
- Org directory API integration
- Real-time updates or websockets
- Notifications or reminders
- Calendar export
- Map integration for event locations
- Any admin/editor UI for the sheet data
- Test suite — unit tests are welcome but not blocking; no e2e tests
- Internationalization
- Dark mode (use system default via Tailwind but don't hand-tune dark styles)

The developer will add these later as needed. Stay focused on the core experience.

---

## How to start

1. Read this entire file first, then confirm back with a one-paragraph summary of what you understand the app to be. This is a sanity check.
2. Ask any clarifying questions about business logic that aren't answered here. Do not ask about tech stack or architecture — those are decided.
3. Start with Phase 1 (shell + onboarding + settings + localStorage profile, no networking). Create the file structure, set up Vite + Tailwind + Zustand, build the components, and get the profile flow working end-to-end against stubbed sheet data. Stop at the phase boundary and summarize.
4. Wait for review before starting Phase 2.

The developer is an experienced React hobbyist (built Grytt and a meal planner) and reads code fluently — you don't need to over-comment or over-explain. Write idiomatic TypeScript, keep functions small, and lean on Tailwind utility classes rather than writing CSS files.

Good luck.
