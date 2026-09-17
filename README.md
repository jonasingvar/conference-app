
https://github.com/user-attachments/assets/7f3ea661-2e85-4895-b7b2-63f3d77a1674

# ORBIT '26

The conference companion app for ORBIT '26 — a fictional applied-AI conference
in Las Vegas, October 12–15 2026. Four days, ~360 sessions, 180 speakers,
two venues six miles apart.

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
one has their own saved plan, followed speakers and interests, and two of them
are also speaking, which unlocks a speaker view.

## What is in here

| Page | What it does |
| --- | --- |
| **Home** | The conference at a glance: keynotes, tracks, your plan, the venue split |
| **Schedule** | All sessions by day, filterable by track, venue, level, format, topic and free text |
| **Session** | Full detail: abstract, takeaways, speakers, room, capacity, reviews, what else is on at the same time |
| **Speakers** | 180 speaker profiles, searchable, with their sessions |
| **My Plan** | Your saved sessions grouped by day, with clash detection — and your own sessions if you are speaking |
| **Venues** | Both sites, a stage map, and how long it takes to get between them |
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
