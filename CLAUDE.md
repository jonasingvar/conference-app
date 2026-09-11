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
| `npm run avatars` | Download any missing speaker portraits. They are committed, so you rarely need this. |

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
    meta.js          /bootstrap, /live, /venues, /vendors, /sponsors, /announcements, /stats
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
    accents.js       accent name → fixed Tailwind class strings (+ hex for SVG)
    travel.js        travel-time helpers for the two-venue split
    clock.js         the conference clock: simulated "now", progress, open/closed
  components/        Layout, SessionCard, SpeakerCard, UserSwitcher, ui.jsx, Icon.jsx,
                     ScheduleGrid.jsx, SpeakerSpotlight.jsx, LiveNow.jsx,
                     GeneratedAvatar.jsx, GeneratedCover.jsx, VenueRouteMap.jsx …
  pages/             one file per route, named <Thing>Page
  public/images/     optional hero photography — see that folder's README
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

## There is exactly one action

Adding a session to your agenda **takes a seat**. There is no separate bookmark,
and there should not be one.

We originally copied AWS re:Invent and Google I/O, which split favouriting from
reserving. Both had to publish FAQ entries explaining the difference, and it
confused people here too. Most of the industry — Sched, EventMobi, and KubeCon
on top of Sched — uses a single action with capacity rules attached, so that is
what this app does.

- `reservations` is the only table. Adding moves `sessions.seats_taken` for
  *everybody*; a full room waitlists you instead; removing a confirmed seat
  promotes whoever has waited longest. All transactional — `server/lib/seats.js`.
- The page is **My Agenda** (`/my-agenda`), which is what Whova, Cvent, EventMobi
  and AWS all call it. `/my-plan` redirects.
- `useConference()` exposes `toggleSeat`, `reservationFor` and `onAgenda`. The
  store is the source of truth for your own reservation state — never fall back
  to the payload a page was fetched with, or "removed" stays unreachable until a
  refresh.

## The attendee chain

Four real rules, each borrowed from how conferences actually run. They are the
interesting part of this app — all of them write state, and each one gates the
next:

1. **Add a session** → takes a seat, or a waitlist place. **You cannot hold two
   seats in overlapping slots** — the API returns 409 with the clashing session,
   and the UI offers a swap. Every real system blocks this rather than warning.
2. **Check in** → opens 15 minutes before the session starts, closes when it
   ends. You cannot check in to something that has not happened.
3. **Rate it** → only if you checked in, only once it is over. One rating per
   person, editable. Ratings roll up onto `sessions.avg_rating` immediately.
4. **Export** → `/api/users/:id/agenda.ics` and `/api/sessions/:id.ics`.

`server/lib/seats.js` and `server/lib/attendance.js` hold the rules; both run
inside transactions. Check-in and rating take the clock from the *client*,
because conference time is simulated.

### Writing tests against this

Seat, check-in and rating state is **real and persists between runs**, and the
desktop and mobile projects run concurrently. So:

- Give each project a **different attendee or a different day** — never let two
  projects mutate the same counter.
- **Clean up after yourself**: `clearAgendaFor(request, userId, day)` in
  `tests/helpers.js`. A test that books a seat and does not release it will hit
  the overlap guard on its next run.
- There is deliberately **no way to undo a check-in**, so pick a session the
  attendee has not been to rather than trying to reset one.
- Do not use `test.describe.configure({ mode: 'serial' })` with conditional
  `test.skip()` — a skip abandons the rest of the group.

## The conference clock

**Day 1 is the day you seed.** `npm run db:seed` sets the conference to start
today unless `ORBIT_START_DATE` says otherwise, so whoever runs it is standing
in Day 1 with the morning's sessions already finished. Tests must therefore ask
the API for the dates (`conferenceDays()` in `tests/helpers.js`) rather than
hard-coding them.

"Now" within that day is simulated. `src/lib/clock.js` takes the
viewer's real time of day and projects it onto a conference day, then ticks every
30 seconds. Open the app at 10:40 and you are standing in the 10:15 slot watching
it run; outside 08:00–22:30 it clamps to a lively mid-morning moment.

`useConference().clock` gives you `{ day, time }`. Use it — do not call `new Date()`
in a component. `GET /api/live?day=&time=` returns what is running and what starts
next.

Pin it for demos and tests with `?at=2026-10-13T14:30`, or the `orbit:clockAt`
localStorage key. `tests/helpers.js` exports `MID_SESSION` and `BETWEEN_SLOTS`
and `visit(page, path, { at })` sets it for you — **any test that touches live
state must pin the clock**, otherwise it passes or fails depending on the hour
it runs.

## Imagery

**No photograph of a real person appears anywhere in this repo, and none should
be added.** Two systems cover it:

**Portraits** live in `public/avatars/` and are served from `/avatars/…`. They
are StyleGAN output from thispersondoesnotexist.com — every face is synthetic,
so no real person is depicted and there are no likeness rights. They were
downloaded once by `scripts/fetch-avatars.mjs`, downscaled to 256px and
committed, so the app never touches the network at runtime. `speakers.image_url`
and `users.image_url` point at them; a speaker with no file falls back to the
generated SVG portrait, so a partial set is never a broken image.

Two rules if you ever regenerate a portrait:

1. **Fetch sequentially.** The source serves whatever it generated most
   recently, so concurrent requests come back identical. The script is
   sequential and hashes each image to reject duplicates — do not "speed it up".
2. **Update `server/avatar-presentation.json`.** It records whether each
   portrait reads as masculine or feminine, and the seed picks the speaker's
   first name and pronouns *from the photo*. Change a face without updating that
   file and you get a speaker whose name fights their picture. The source
   dataset also contains children; they are not plausible speakers, so eyeball
   any replacement before committing it.

**Everything else is generated deterministically from a string:**

- `GeneratedAvatar` — the SVG portrait fallback, hashed from a name.
- `GeneratedCover` — key art for sessions, tracks, vendors and sponsors.
  Variants: `orbit` (keynotes, heroes), `mesh` (category tiles), `strata`
  (wide banners), `mark` (logo-like squares).
- `VenueRouteMap` — the two sites projected from their real lat/lng. This is the
  *only* map in the app, and it is honest because the coordinates are real.
  There was once a per-venue "floor plan" built from invented `map_x`/`map_y`
  values; it looked like geography, meant nothing, and has been removed. Do not
  bring it back — `VenueBoard` shows what is actually happening in each room
  instead.

Same input, same output, on every machine — which keeps screenshots and tests
stable.

## Chrome and correctness

Things that are easy to forget and immediately read as unfinished:

- **Every page calls `useDocumentTitle`.** The tab, the history entry and a
  bookmark all read from it. New route, new title.
- **`<RouteChange>` in the layout** resets scroll and moves focus to `#main` on
  every navigation. React Router does neither by default — without it you click
  a nav link and land halfway down the next page.
- **`useToast()`** for anything the user does that would otherwise be silent.
  Saving a session toasts with an Undo action; the toast stack lives above the
  store in `main.jsx` so `store.jsx` can reach it.
- **Footer links must resolve.** There is a smoke test that walks every footer
  link and fails if one hits the not-found page.

## Motion

Animation is CSS-driven and lives in `src/index.css`: `ken-burns`, `slide-in`,
`fade-zoom`, `fill` (autoplay progress), `stagger` (list entrance), `reveal`
(scroll-triggered), `pop`, `live-ring`, `shimmer`.

- `<Reveal>` wraps a block so it lifts into view on first scroll, via the
  `useInView` hook.
- `<CountUp>` animates a number once it is on screen.
- The whole lot is switched off by the `prefers-reduced-motion` block at the
  bottom of `index.css`, which also forces `.reveal` content visible — so
  nothing is ever hidden behind an animation that never runs. Anything new you
  add must survive that same test.

## The schedule has two views

`/schedule` renders either a **grid** (time down, rooms across, tinted by the
track that room runs that day) or a **list** (cards grouped by time slot). The
choice lives in `?view=`; with no param the grid is used on `lg` and up and the
list below, because a horizontally scrolling matrix is miserable on a phone.

The grid only makes sense when whole rooms are visible, so searching or
filtering by track/topic falls back to the list automatically — `gridUsable` in
`SchedulePage`.

This works because the seed gives each day a **stable set of 7–8 rooms, each
with a track for the day**, the way real conferences run. If you change session
generation to scatter talks across arbitrary rooms again, the grid becomes a
mostly-empty spreadsheet.

Filters live in a sticky left rail on desktop and collapse behind a Filters
button on mobile — tests must open it before touching a filter control.

## Visual hierarchy

Not every card is equal, and the UI must say so. Sessions that are keynotes or
in rooms of 1,200+ seats get the `feature` treatment in `SessionCard` — cover
art, a wider span, more of the abstract. The top-rated vendor and the Diamond
and Platinum sponsors get similar promotion. When you add a new card type, ask
what makes one instance more important than another and show it.

The speakers page is the clearest example: 180 people are too many for one flat
grid, so it is tiered — keynote names as photo-forward `headline` cards, people
with three or more sessions as normal cards, and the long tail as a compact
`row` list. `SpeakerCard` takes a `variant` for exactly this. Searching or
filtering collapses the tiers into a single result grid, because at that point
the user has stated what matters.

Grids that mix feature and normal cards use `grid-flow-row-dense` so the wide
ones never leave holes.

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
