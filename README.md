
https://github.com/user-attachments/assets/7f3ea661-2e85-4895-b7b2-63f3d77a1674

# ORBIT '26

A conference companion app for a fictional applied-AI conference in Las Vegas:
four days, ~140 sessions, 110 speakers, two venues six miles apart, and an
attendee whose seat in a full room is somebody else's missed talk.

It is the sample application for a workshop on using AI across the software
delivery lifecycle. You fork it, turn product requirements into GitHub Issues,
and let an engineering harness implement them.

## Quick start

```bash
npm install
npm run dev
```

Seeds a local SQLite database, starts the API and the web app, opens
http://localhost:5173.

There is no login. Pick an attendee from the switcher top right — each has
their own agenda, followed speakers and interests, and two of them are also
speaking, which unlocks a speaker view.

## The conference is always today

Seeding sets Day 1 to the day you run it, so you arrive mid-conference: the
morning is over, sessions are running now, the rest of the week is ahead. No
date is hard-coded — the footer, the day tabs and the body copy all follow the
seed. Left it a few days and drifted into Day 4? `npm run db:reset` brings the
conference back to today.

"Now" inside the day is simulated: the app projects your real time of day onto
the conference day and ticks, so progress bars move and the live strip changes
while you watch. Outside 08:00–22:30 it settles on a mid-morning moment rather
than showing an empty venue at 3am. Pin it with `?at=YYYY-MM-DDTHH:MM`, taking
the date from the day tabs.

## What is in here

| Page | What it does |
| --- | --- |
| **Home** | You, right now: what you are in, what is next, waitlists, sessions to rate, suggestions for your next free slot |
| **Schedule** | Every session by day, as a room grid or a list, filtered by track, venue, level, format, topic or free text |
| **Session** | Abstract, takeaways, speakers, room, seats and waitlist, check-in and rating, feedback, what else is on at that hour |
| **Speakers** | 110 profiles, searchable, tiered so the headliners are not lost in the crowd |
| **My Agenda** | What you hold a seat or a waitlist place for, by day, with calendar export — and your own sessions if you are speaking |
| **Venues** | Both sites on a map, what is on in each room, and how long it takes to get between them |
| **Food** | 24 vendors with wait times, dietary filters and opening hours |
| **Expo** | Sponsors by tier, booths, perks |

Adding a session **takes a seat**: it moves the count for everyone, a full room
waitlists you, and you cannot hold two seats in the same slot. Check in when the
doors open, rate it once it is over, export the lot to your calendar.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Seed, then run the API and the web app together |
| `npm test` | Unit and API tests — no browser, under a second |
| `npm run verify` | Reseed, then the Playwright suite on desktop and mobile |
| `npm run shot` | Screenshot every route into `.screenshots/` |
| `npm run db:reset` | Throw the database away and rebuild it — Day 1 becomes today |
| `npm run avatars` | Re-download speaker portraits (already committed) |

## Stack

Node 22, Express and better-sqlite3 on the back end. React 18, Vite 6, React
Router and Tailwind CSS v4 on the front. Node's own test runner for the unit and
API suites, Playwright for the browser ones. No ORM, no state library, no
component kit.

## Documentation

- [CLAUDE.md](./CLAUDE.md) — architecture, conventions and the reasoning behind
  them. Read it before writing code here, human or agent.
- [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) — the schema, and what the
  interesting columns mean.
