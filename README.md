
https://github.com/user-attachments/assets/7f3ea661-2e85-4895-b7b2-63f3d77a1674

# ORBIT '26

The conference companion app for ORBIT '26 — a fictional applied-AI conference
in Las Vegas. Four days, ~140 sessions, 110 speakers, two venues six miles
apart. Day 1 is the day you seed the database.

This is the sample application for a workshop on using AI across the software
delivery lifecycle: you fork it, turn product requirements into GitHub Issues,
and let an engineering harness implement them.

## Quick start

```bash
npm install
npm run dev
```

That seeds a local SQLite database and starts both the API and the web app.
Open http://localhost:5173.

There is no login. Pick an attendee from the switcher in the top right — each
one has their own agenda, followed speakers and interests, and two of them
are also speaking, which unlocks a speaker view.

## What is in here

| Page | What it does |
| --- | --- |
| **Home** | You, right now: what you are in, what is next, waitlists, sessions to rate, suggestions for your next free slot |
| **Schedule** | All sessions by day as a room grid or a list, filterable by track, venue, level, format, topic and free text |
| **Session** | Full detail: abstract, takeaways, speakers, room, seats and waitlist, check-in and rating, feedback, what else is on at the same time |
| **Speakers** | 110 speaker profiles, searchable, with their sessions |
| **My Agenda** | The sessions you hold a seat (or a waitlist place) for, grouped by day, with calendar export — and your own sessions if you are speaking |
| **Venues** | Both sites on a map, what is on in each room, and how long it takes to get between them |
| **Food** | 24 vendors with wait times, dietary filters and opening hours |
| **Expo** | Sponsors by tier, booths, perks |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Seed the database, then run the API and web app together |
| `npm run verify` | Playwright suite across desktop and mobile |
| `npm run shot` | Screenshot every route into `.screenshots/` |
| `npm run db:reset` | Throw the database away and rebuild it |
| `npm run avatars` | Re-download speaker portraits (already committed) |

## Stack

Node 22, Express and better-sqlite3 on the back end. React 18, Vite 6, React
Router and Tailwind CSS v4 on the front end. Playwright for verification.
No ORM, no state library, no component kit.

## Documentation

- [CLAUDE.md](./CLAUDE.md) — architecture, conventions and house rules. Read
  this before writing code, whether you are a person or an agent.
- [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) — the database schema and what the
  interesting bits mean.
