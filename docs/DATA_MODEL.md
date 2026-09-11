# Data model

SQLite, one file at `data/orbit.db`, rebuilt from scratch by `npm run db:seed`.
The authoritative schema is the `SCHEMA` string in [`server/db.js`](../server/db.js);
this document explains the shape and the parts that carry meaning.

## Scale

| Table | Rows | Notes |
| --- | --- | --- |
| `venues` | 2 | Two physical sites, 6.2 miles apart |
| `venue_travel` | 8 | Travel time + cost per mode, both directions |
| `rooms` | 29 | Stages, workshops, roundtables; each belongs to a venue |
| `tracks` | 10 | Programme tracks, each with a colour |
| `tags` | 69 | Four kinds: `topic`, `tech`, `audience`, `vibe` |
| `speakers` | 180 | Fictional. Two are linked to attendee accounts |
| `sessions` | ~362 | 4 days × 7 slots × 11–15 parallel, plus keynotes and socials |
| `session_speakers` | ~515 | Many-to-many, with a `role` (Speaker / Moderator / Host) |
| `session_tags` | ~2600 | Many-to-many |
| `users` | 6 | Attendees. No passwords — there is no auth |
| `favorites` | ~140 | An attendee's saved plan |
| `speaker_follows` | ~85 | |
| `ratings` | ~60 | Stars plus optional comment; drives the reviews list |
| `vendors` | 24 | Food and drink, positioned on the venue maps |
| `sponsors` | 28 | Five tiers, booth numbers, perks |
| `announcements` | 10 | Two are pinned and surface on the home page |

## The two-venue split

This is the most important thing in the data model, because it is where the
interesting product problems come from.

```
Aurora Convention Center          The Foundry at Red Rock Yards
3200 Neon Boulevard               1145 Ironworks Road
19 stages · main site             10 stages · workshops, hardware, late shows
        │                                        │
        └──────── 6.2 miles ─────────────────────┘
             Shuttle   27 min   free
             Rideshare 18 min   ~$23.50
             Taxi      19 min   ~$31.00
             Walk      96 min   please do not
```

Session slots run back to back with a 30-minute gap (`09:00–09:45`, then
`10:15`). **A 27-minute shuttle plus walking time does not fit in that gap**, so
an attendee can save two sessions that do not overlap in time and still be
unable to attend both. Day 3's keynote is deliberately at the Foundry.

`venue_travel` rows are directional — `from_venue_id` → `to_venue_id` — because
the return journey is slightly slower.

## Key relationships

```
venues ──< rooms ──< sessions >── tracks
                        │
                        ├──< session_speakers >── speakers
                        ├──< session_tags >────── tags
                        ├──< favorites >───────── users
                        └──< ratings >─────────── users

users.speaker_id ──> speakers.id     (set for attendees who are also presenting)
venues ──< vendors, sponsors, announcements
```

## Columns worth knowing

**`sessions`** — `day` (`YYYY-MM-DD`), `starts_at`/`ends_at` (`HH:MM`, local
venue time, no timezone stored), `duration_mins`, `capacity` and `seats_taken`
(the API derives `seatsLeft` and `fillRate`), `takeaways` (pipe-separated),
`is_keynote`, `is_recorded`, `requires_rsvp`, `livestream`, `avg_rating`,
`rating_count`.

**`rooms`** — `walk_minutes` is time on foot from that venue's entrance.
`map_x`/`map_y` are coordinates on a 1000×760 canvas, used by the stage map on
the Venues page. `accessible = 0` means step-free access is not available
(two rooms at the Foundry).

**`speakers`** — `image_url` points at a committed synthetic portrait in
`public/avatars/` (`/avatars/speaker-042.jpg`). The faces are StyleGAN output:
generated, not photographs of real people. Speakers without a file fall back to
a deterministic generated SVG portrait (`src/components/GeneratedAvatar.jsx`).
`expertise` and `languages` are comma-separated.

**`users`** — `speaker_id` links an attendee to their speaker profile. When set,
`GET /api/users/:id` returns `isSpeaker: true`, a `speaker` object and
`speakingSessions`, which is what renders the speaker panel on My Plan.

## Time

Nothing in the database stores a timezone. `sessions.starts_at` / `ends_at` are
local venue time as `HH:MM`, and `day` is a plain date. The app's sense of "now"
is simulated client-side by `src/lib/clock.js` and passed to
`GET /api/live?day=&time=`, which returns the sessions running at that instant
plus the next slot. The server has no clock of its own — it answers questions
about a moment you give it, which is what makes the whole thing testable.

## Determinism

`server/seed.js` uses its own linear congruential PRNG seeded with `20261012`.
Everyone who clones this repo gets byte-identical data. **Never use
`Math.random()` in the seed** — it breaks screenshot comparisons, test
fixtures and shared issue reports.

Attendee plans are shaped, not random: each attendee picks at most one session
per time slot, with a small per-attendee chance of a deliberate double-booking,
so clash detection has something real to report without every plan looking
broken.
