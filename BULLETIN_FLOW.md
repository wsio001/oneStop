# Bulletin Tab Data Flow

## Complete Flow from Google Sheet → UI

### 1. **User Opens App** → App.tsx
- Location: `/src/App.tsx`
- On mount, `useProfile()` hook triggers
- `useAppStore` initializes with empty bulletin array

### 2. **Profile Hook Triggers Data Fetch** → useProfile.ts
- Location: `/src/lib/useProfile.ts`
- Calls `refreshAll()` from appStore

### 3. **App Store Refresh** → appStore.ts
- Location: `/src/store/appStore.ts`
- Function: `refreshAll()`

**Step 3a: Discovery**
```typescript
const discovery = await discoverTabs(); // Line 48
const { date_tabs, bulletin_tab } = discovery;
```
- Calls API endpoint `/api/sheets/discover`
- Returns `bulletin_tab: { tab_name: "BULLETIN 📢", date: null }`

**Step 3b: Fetch Sheet Data**
```typescript
const allTabs = [
  ...date_tabs.map(t => t.tab_name),
  ...(bulletin_tab ? [bulletin_tab.tab_name] : []),
];
const rawData = await fetchSheetData(allTabs); // Line 68
```
- Calls API endpoint `/api/sheets/data` with tab names
- Returns raw 2D array data for each tab
- Example: `{ "BULLETIN 📢": [row1, row2, row3, ...] }`

**Step 3c: Parse Bulletin**
```typescript
for (const [tabName, values] of Object.entries(rawData)) {
  const isBulletinTab = bulletin_tab && tabName === bulletin_tab.tab_name;

  if (isBulletinTab) {
    newBulletin = parseBulletinTab(tabName, values); // Line 93
  }
}
```

### 4. **Parse Bulletin Tab** → parser.ts
- Location: `/src/lib/parser.ts`
- Function: `parseBulletinTab(tabName, values)`

**Parsing Steps:**
```typescript
// Row 2 (index 1) = Headers
const headers = values[1];
// Expected: ["DATE", "POSTED BY", "SUBJECT", "WHAT", "LINK"]

// Find column indices
const dateIdx = headers.findIndex(h => h.toLowerCase().trim() === 'date');
const postedByIdx = headers.findIndex(h => h.toLowerCase().trim() === 'posted by');
const subjectIdx = headers.findIndex(h => h.toLowerCase().trim() === 'subject');
const bodyIdx = headers.findIndex(h => h.toLowerCase().trim() === 'what');
const linkIdx = headers.findIndex(h => h.toLowerCase().trim() === 'link');

// Parse rows starting from row 3 (index 2)
for (let rowIdx = 2; rowIdx < values.length; rowIdx++) {
  const row = values[rowIdx];
  const date = row[dateIdx];
  const posted_by = row[postedByIdx];
  const subject = row[subjectIdx];
  const body = row[bodyIdx];
  const link_url = row[linkIdx];

  posts.push({ id, date, posted_by, subject, body, link_url, link_label: null });
}

return posts; // BulletinPost[]
```

### 5. **Store Updates** → appStore.ts
```typescript
set({
  bulletin: newBulletin,  // Line 105
  hashes: newHashes,
  lastSync: Date.now(),
});
```
- Zustand store updates
- Triggers re-render of all components using `bulletin`

### 6. **UI Renders** → BulletinTab.tsx
- Location: `/src/tabs/BulletinTab.tsx`
```typescript
const bulletin = useAppStore((state) => state.bulletin); // Line 5
const sortedPosts = [...bulletin].reverse(); // Newest first

return (
  <div>
    {sortedPosts.map((post) => (
      <BulletinCard key={post.id} post={post} />
    ))}
  </div>
);
```

### 7. **Card Renders** → BulletinCard.tsx
- Location: `/src/components/BulletinCard.tsx`
```typescript
<div className="bg-white border border-gray-200 rounded-lg">
  {/* Top row */}
  <div className="flex justify-between">
    <div>{post.date}</div>
    <div>{post.posted_by}</div>
  </div>

  {/* Subject */}
  <div>{post.subject}</div>

  {/* Body */}
  <div className="line-clamp-3">{post.body}</div>

  {/* Link pill (if exists) */}
  {post.link_url && (
    <button onClick={() => window.open(post.link_url)}>
      {post.link_label || 'Open link →'}
    </button>
  )}
</div>
```

---

## API Endpoints (Backend)

### `/api/sheets/discover` → discover.ts
- Location: `/api/sheets/discover.ts`
- Fetches all tab names from Google Sheet
- Matches date pattern: `/^\d{1,2}\/\d{1,2}\s+(MON|TUE|WED|THU|FRI|SAT|SUN)$/`
- Matches bulletin tab name: `"BULLETIN 📢"` (from IRVINE_CONFIG)
- Returns: `{ date_tabs: [...], bulletin_tab: { tab_name: "BULLETIN 📢" } }`

### `/api/sheets/data` → data.ts
- Location: `/api/sheets/data.ts`
- Takes array of tab names as query param
- Calls Google Sheets API `spreadsheets.values.batchGet`
- Returns raw 2D array for each tab: `{ "BULLETIN 📢": [[row1], [row2], ...] }`

---

## Expected Google Sheet Structure

### BULLETIN 📢 Tab

**Row 1:** Empty or title
**Row 2 (Headers):**
```
DATE | POSTED BY | SUBJECT | WHAT | LINK
```

**Row 3+ (Data):**
```
Apr 7 | Pastor Dan | Easter schedule change | Sunrise service moved... | https://...
Apr 6 | Worship Team | Song list posted | This week's setlist... | https://...
Apr 5 | Mary K. | Childcare signups | Two slots still open... |
```

---

## Debug Logging Points

When you open browser console, you should see:

1. **Discovery:**
   - `🔵 Bulletin tab info: { tab_name: "BULLETIN 📢", date: null }`

2. **Fetch:**
   - `🔵 Processing fetched tabs: ["4/10 THU", "4/11 FRI", ..., "BULLETIN 📢"]`

3. **Parse Detection:**
   - `🔵 Tab "BULLETIN 📢": isBulletinTab=true, rows=X`
   - `🔵 Processing BULLETIN tab: "BULLETIN 📢"`

4. **Parser:**
   - `🔵 parseBulletinTab called for tab "BULLETIN 📢"`
   - `🔵 Total rows in values: X`
   - `🔵 Headers (row 2): ["DATE", "POSTED BY", "SUBJECT", "WHAT", "LINK"]`
   - `🔵 Column indices found: { dateIdx: 0, postedByIdx: 1, ... }`
   - `🔵 Processing row 3: [...]`
   - `🔵 Row 3 data: { date: "Apr 7", posted_by: "Pastor Dan", ... }`
   - `✅ Adding bulletin post: { id: "...", date: "Apr 7", ... }`
   - `🔵 Total bulletin posts parsed: X`

5. **Store Update:**
   - `🔵 Bulletin parsed: X posts`

---

## Common Issues

### Issue 1: Tab Name Mismatch
**Symptom:** `isBulletinTab=false` for all tabs
**Cause:** `bulletin_tab_name` in config doesn't match actual sheet tab name
**Fix:** Update `/src/lib/locationConfig.ts` line 11

### Issue 2: Wrong Row Indices
**Symptom:** Headers not found, all posts skipped
**Cause:** Headers not at row 2 or data not at row 3
**Fix:** Update `headerRowIndex` and loop start in `parseBulletinTab()`

### Issue 3: Column Name Mismatch
**Symptom:** `bodyIdx === -1` in console
**Cause:** Column header doesn't match search term
**Fix:** Update `headers.findIndex()` logic in `parseBulletinTab()`

### Issue 4: Empty Bulletin Array
**Symptom:** `Total bulletin posts parsed: 0`
**Cause:** Rows being skipped (missing date/subject/body)
**Check:** Look for `⚠️  Skipping row X` messages
