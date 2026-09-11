# ORBIT '26 — conference companion app

A sample app for a workshop on using AI across the software delivery lifecycle.
Attendees fork this repo, turn requirements into GitHub Issues, and let an
engineering harness implement them. **Read this file before writing code here.**

## Run it

```bash
npm install
npm run dev          # seeds the database, then starts API + web on one command
```

- Web: http://localhost:5173 (Vite, hot reload)
- API: http://localhost:3001/api (Express)
- The web dev server proxies `/api` → `:3001`, so the frontend only ever
  fetches relative URLs.

| Command | What it does |
| --- | --- |
| `npm run dev` | Seed + run everything. The only command you normally need. |
| `npm run db:seed` | Rebuild `data/orbit.db` from `server/seed.js`. Destructive and deterministic. |
| `npm run db:reset` | Delete the database file and reseed from scratch. |
| `npm run verify` | Playwright suite, headless. **Run this before calling a ticket done.** |
| `npm run verify -- --ui` | Interactive Playwright runner. |
| `npm run shot` | Screenshot every main route into `.screenshots/`. Starts the app if it is not running. |
| `npm run shot -- /schedule --mobile --user=2` | Screenshot one route, mobile viewport, as attendee 2. |

## Stack

Node 22 · Express · better-sqlite3 · React 18 · Vite 6 · React Router 6 ·
Tailwind CSS v4 · Playwright. No state library, no ORM, no component library —
if you are reaching for one, you are probably solving the wrong problem.

## Layout

```
server/
  db.js              schema (one SQL string), connection, migrate(), dropAll()
  seed.js            all fake data generation; deterministic via a seeded PRNG
  index.js           express app, mounts routers, 404 + error handlers
  lib/query.js       shared SQL fragments and every snake_case → camelCase mapper
  routes/
    meta.js          /bootstrap, /venues, /vendors, /sponsors, /announcements, /stats
    sessions.js      /sessions, /sessions/:id
    speakers.js      /speakers, /speakers/:id
    users.js         /users, /users/:id, /users/:id/schedule, favourites, follows
src/
  main.jsx           entry: Router → ConferenceProvider → App
  App.jsx            route table
  index.css          Tailwind import + design tokens + custom utilities
  lib/
    api.js           one function per endpoint; nothing else calls fetch()
    store.jsx        ConferenceProvider (global data) + useFetch (page data)
    format.js        time/date/pluralisation helpers
    accents.js       accent name → fixed Tailwind class strings
    travel.js        travel-time helpers for the two-venue split
  components/        Layout, SessionCard, SpeakerCard, UserSwitcher, ui.jsx, Icon.jsx …
  pages/             one file per route, named <Thing>Page
tests/               Playwright specs + helpers.js
scripts/shot.mjs     screenshot tool
data/orbit.db        generated, gitignored
```

## Conventions

**The API boundary is camelCase.** SQLite gives snake_case. Every translation
happens in `server/lib/query.js` (`toSession`, `toSpeaker`, `toVenue`, …). If you
add a column, add it to the mapper — React must never see `snake_case`.

**Adding an endpoint.** Put the route in the matching `server/routes/*.js`, map
rows with an existing `toX()` helper, then add one function to `src/lib/api.js`.
Components import from `api.js`; they never call `fetch` directly.

**Fetching data in a page.** Use `useFetch` from `src/lib/store.jsx`:

```jsx
const { data, loading, error, reload } = useFetch(() => api.getSessions({ day }), [day]);
```

Global data (venues, tracks, tags, rooms, days, attendees, the current user and
their favourites) is already in `useConference()`. Do not refetch it per page.

**Filters live in the URL.** Pages use `useSearchParams` so a filtered view is
shareable and survives reload. `'all'` means "no filter" and is stripped by
`qs()` in `api.js`.

**Tailwind colours are tokens, not raw hexes.** Use `bg-surface`, `text-muted`,
`border-hairline` etc. from `src/index.css`. The elevation ladder is
`ground` (page) → `surface` (module panel) → `raised` (card in a panel) →
`overlay` (controls, hover). Keep that order; it is what stops dense screens
turning to mush.

**Accent colours cannot be built at runtime.** Tailwind needs literal class
names, so `src/lib/accents.js` maps `'violet'` → a fixed set of class strings.
Never write `` `bg-${color}-500` ``.

**Every interactive element needs an accessible name.** Icon-only buttons take
`aria-label`. A visible label hidden at some breakpoint still needs one.

**Add `data-testid` to anything a test needs to find** — result counts, panels,
list containers. Do not put testids on decorative elements.

## Verifying a change

A ticket is not done until it is proven in a browser.

1. `npm run verify` — the whole suite must pass on desktop **and** mobile.
2. Add a test for what you changed. Specs live in `tests/`, one file per area,
   and use `visit(page, path, { as: ATTENDEES.kenji })` from `tests/helpers.js`
   rather than `page.goto` — it sets which attendee is signed in.
3. `npm run shot -- /your-route` and look at the PNG if the change is visual.

The smoke suite already asserts every route renders with no console errors and
no horizontal overflow, so responsive regressions fail automatically.

## Data model in one paragraph

Four days (2026-10-12 → 15), ~360 sessions, 180 speakers, across **two physical
venues 6.2 miles apart**: the Aurora Convention Center (main) and The Foundry at
Red Rock Yards. `venue_travel` holds how long it takes to get between them per
mode. Sessions belong to a track and a room; rooms belong to a venue and carry
`walk_minutes` plus `map_x`/`map_y` coordinates. Attendees are rows in `users`;
there is no authentication — the selected attendee lives in `localStorage` under
`orbit:currentUserId`. Two attendees (Amara, Priya) have `speaker_id` set,
linking them to a `speakers` row, which is what drives the speaker view on
My Plan. See `docs/DATA_MODEL.md` for the full schema.

## House rules

- Good engineering, no over-engineering. Match the surrounding code.
- Prefer editing an existing file over adding a new abstraction layer.
- Keep `seed.js` deterministic — it seeds its own PRNG so everyone's database is
  identical. Never use `Math.random()` there.
- Do not commit `data/orbit.db`, `.screenshots/`, or Playwright artefacts.
- Do not introduce a state management library, an ORM, or a UI kit.
