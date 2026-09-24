# 2 · Warn on My Agenda when back-to-back sessions are at different venues

## What this changes

On `/my-agenda`, an attendee sees a travel note between two sessions they hold
seats for, one after the other on the same day, when those sessions are at
different venues. There are three kinds of note:

- **Cannot make it.** No mode fits the gap. The note names the fastest mode and
  its door-to-door minutes.
- **Shuttle too slow.** The free shuttle misses the start, but a paid ride
  fits. The note names the fastest mode that fits and what it costs.
- **Fine.** The shuttle fits. The note is a quiet line giving the shuttle's
  door-to-door minutes.

Today the page only counts "Cross-town days", so the attendee cannot see which
change of venue is the problem.

## Where

- `src/lib/travel.js` gains `travelLegs({ travel, sessions, isConfirmed })`.
  It takes one day's sessions, keeps the confirmed ones in start order, pairs
  each with the next, and returns `{ from, to, check }` for every pair that
  changes venue. The judging is left to the existing `assessTravel()`, so the
  home page and My Agenda cannot disagree.
- `src/pages/MyAgendaPage.jsx` gets a file-local `TravelNote` beside
  `ConflictBanner`, and `DayPlan` renders it after the `from` row. The note
  carries `data-testid="agenda-travel-note"` and a `data-kind` of
  `impossible`, `tight` or `ok`.

## How it will be proved

- **Unit** (`tests/unit/travel.test.js`) covers `travelLegs`: a change of venue
  gives a leg; the same venue gives none; a waitlisted session in between is
  skipped, so the confirmed sessions either side of it pair up; one session
  gives none; unsorted input is paired in start order. It also asserts that
  the impossible, tight and ok checks come through.
- **Browser** (`tests/plan.spec.js`) checks Jonas on My Agenda on desktop and
  mobile. Day 4 shows exactly one *tight* note naming Rideshare, and Day 1,
  which is all at Aurora, shows none. The test only reads, so it needs no
  lane. Day 3's *ok* note, "Shuttle to Aurora · 40 min", is not asserted in
  the browser. The `seats.count` lane briefly books Jonas a 09:00 session on
  Day 3, which would put a different hop in that position while that test
  runs. The *ok* branch is proved at the unit layer instead. Day 4's 09:00
  and 10:15 slots are back to back, so no lane can land between them.

## Decisions

- The ticket calls Jonas's seeded cross-town traps the "cannot make it" case.
  Against the real travel table they are not: Day 4 runs Aurora 09:00, then
  Foundry 10:15, which is a 30-minute gap. The shuttle takes 27 min plus a
  9 min walk, which is too slow, but a rideshare (18 + 9) fits. That makes it
  the *tight* case. The *impossible* branch is proved at the unit layer rather
  than by planting new seed data. The Day 1 trap never gets planted, because
  there is no Foundry session at 11:30 on Day 1.
- The "fine" note falls back to the fastest mode that fits when a route has no
  free mode, so a note never names a mode that does not exist.

## Out of scope

- Blocking or changing a booking.
- The home page's existing next-session warning.
