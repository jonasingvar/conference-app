
https://github.com/user-attachments/assets/7f3ea661-2e85-4895-b7b2-63f3d77a1674

# ORBIT '26

A conference companion app for a fictional applied-AI conference in Las Vegas:
four days, ~140 sessions, 110 speakers, two venues six miles apart, and an
attendee whose seat in a full room is somebody else's missed talk.

It is the sample application for a workshop on using AI across the software
delivery lifecycle. **You fork it, turn product requirements into GitHub
Issues, and label them.** Agents do the rest, and a human merges.

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

---

# How a ticket becomes code

Four labels. You apply the first one; agents move it through the rest.

```
  ready-for-ai  →  ai-working  →  ready-for-human  →  merged
     you            the agent        the agent          you
                         ↘
                     needs-human     it stopped, and said why
```

## 1. Write the ticket, label it `ready-for-ai`

Tickets say **why**, **what**, and **Done when** — observable criteria, not a
description of the code you imagined. That last clause is what the agent
builds against and what the review later checks, one criterion at a time.

Labelling it is the whole interaction. A runner starts within seconds.

## 2. The agent builds it

In order, and it will not skip a step:

- **Writes a spec first**, as the branch's first commit, in `specs/`. You read
  what it intends before you read the diff — and if it misread the ticket,
  that is the cheapest moment to find out.
- **Writes a check that fails**, at the cheapest layer that can prove the
  ticket, and confirms it fails for the reason expected.
- **Implements it**, running the fast suite after every edit.
- **Proves it** with `npm run verify` — Chromium, desktop and mobile.
  **No green, no pull request.** Not "probably fine".
- **Opens a pull request** carrying a screenshot of the change and a table of
  what went red then green.

If it cannot finish honestly it labels the ticket `needs-human`, says what
stopped it, and opens nothing. That is a normal outcome, not a failure — a
half-built ticket that looks complete costs more than one that is visibly
stuck.

## 3. Two more agents read it

Both start on their own when the pull request opens. Neither has seen the
reasoning that produced the change, which is the point: the agent that wrote
it cannot see its own misreading.

**Code review** starts from the issue's acceptance criteria — not the diff —
and takes them one at a time. Blockers only, three findings at most, every one
citing a line it actually read. It never flags style, anything CI already
catches, or a bug that was already on `main`.

**QA** boots the app and drives Chromium looking for what nobody wrote a test
for: the empty agenda, the phone viewport, the fourth day, the second click,
the callers of anything shared. Before it calls something a bug it re-runs it,
then reproduces it against `main` — so a pre-existing problem is never blamed
on your pull request.

Each publishes a check with a **confidence**, which means coverage rather than
conviction: how much of the change it could actually exercise or judge. A
low-confidence pass shows as *unproven* rather than green, because a pass
nobody could earn should not look like one.

Neither can block a merge. An agent asked to find problems will find some.

## 4. You merge

That rail never moves. Comment `@claude ...` on the pull request and the agent
picks it up, makes the change, and replies — but a person decides what lands.

---

## Setting it up on your fork

A fork inherits the workflows and the skills but not the labels, so start here:

**Actions → Set up the harness → Run workflow.** It creates the four labels and
tells you what else the fork needs.

Then two secrets, under Settings → Secrets and variables → Actions:

| Secret | |
| --- | --- |
| `ANTHROPIC_API_KEY` | **Required.** Must be scoped to a *workspace* — an organisation-level key is refused, and the error does not say which kind to make. |
| `AGENT_GITHUB_TOKEN` | Optional. A classic token with `repo` and `workflow` scope. Without it everything still works, but each agent pull request waits at *Approve and run* until you click. |

And install the [Claude GitHub App](https://github.com/apps/claude) on the
repository — or skip it, since supplying `AGENT_GITHUB_TOKEN` means the action
never needs it.

Then open an issue with a **Done when:** clause, label it `ready-for-ai`, and
watch the Actions tab.

---

## What is in the app

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

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Seed, then run the API and the web app together |
| `npm test` | Unit and API tests — no browser, under a second |
| `npm run verify` | Reseed, then the Playwright suite on desktop and mobile |
| `npm run shot` | Screenshot every route into `.screenshots/` |
| `npm run db:reset` | Throw the database away and rebuild it — Day 1 becomes today |
| `node scripts/lane.mjs claim 42` | Claim a port pair, so several agents can work at once on one machine |

## Stack

Node 22, Express and better-sqlite3 on the back end. React 18, Vite 6, React
Router and Tailwind CSS v4 on the front. Node's own test runner for the unit and
API suites, Playwright for the browser ones. No ORM, no state library, no
component kit.

## Documentation

- [CLAUDE.md](./CLAUDE.md) — architecture, conventions and the reasoning behind
  them. Read it before writing code here, human or agent. It is also what the
  review agent checks a change against.
- [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) — the schema, and what the
  interesting columns mean.
- [specs/](./specs/) — one file per ticket, written before the code. Together
  they record why this codebase is the way it is.
- `.claude/skills/` — what each agent actually does: `build`, `code-review`,
  `qa`. They are markdown, and they are the harness.
