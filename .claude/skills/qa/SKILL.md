---
name: qa
description: >-
  Drive the running app in a browser and try to break a change that already
  passed its tests — the cases nobody wrote a test for. Reports what it finds
  on the pull request; never blocks. Use when asked to QA or exploratory-test
  a pull request in this repo, or when told "/qa 42".
allowed-tools: Read, Write, Glob, Grep, Bash
---

# QA a change

The suite is already green. **Running it again proves nothing** — the point of
this pass is everything nobody thought to write down.

You are looking for the case the author did not imagine. An attendee with an
empty agenda. A number that should be zero. A phone-width layout. The second
click. What happens on day four rather than day one.

**You can stop a merge.** A reproducible bug is not advice, so unlike the
review pass your verdict is a gate. That makes it your job to be certain: a
finding you cannot reproduce is not a finding.

**Your verdict is a file, not a sentence in your comment.** The run ends with
one line in `/tmp/qa-verdict` and nothing else is read — see step 5. Saying
"Verdict: PASS" in prose leaves the check reading *unproven*.

It carries a **confidence**, and confidence here means coverage, not feeling:
how much of what changed did you actually put a browser through? A pass you
could not really test is not a pass, so say so and let it read as unproven.

## 1. Learn what changed, and what is already covered

Read the ticket's **Done when:** clause, the diff, and the tests it added. The
tests tell you where *not* to spend time: whatever they assert is proven, and
repeating it is waste.

Then ask the question they do not answer — *what would make this wrong?*

## 2. Write probes where Playwright will find them

**Do not start the app yourself.** `playwright.config.js` has a `webServer`
block: it seeds the database and boots the API and Vite for you, and under CI
it refuses to reuse an existing server — so an `npm run dev &` of your own
collides with it and the run dies on a taken port.

**Do not put probes in `/tmp`.** `testDir` is `./tests`, so anything outside
it is never collected and `npx playwright test /tmp/probe.spec.js` reports
"no tests found" while looking like it passed.

Write them into `tests/` with a name that says what they are, run them, then
delete them:

```bash
cat > tests/qa-probe.spec.js <<'SPEC'
import { test, expect } from '@playwright/test';
import { visit, ATTENDEES, momentOn } from './helpers.js';
// …your probes…
SPEC

npx playwright test tests/qa-probe.spec.js --project=desktop
npx playwright test tests/qa-probe.spec.js --project=mobile   # half the layout differs

rm tests/qa-probe.spec.js
```

`tests/helpers.js` is what makes a probe cheap: `visit(page, path, { as, at })`
signs in as any seeded attendee and pins the conference clock, `momentOn(day,
time)` builds the timestamp, and `ATTENDEES` names the six — one with clashes,
one with almost nothing booked, two who are also speaking.

The checkout is thrown away when the job ends, so the file cannot reach the
repository. Delete it anyway: a probe left behind would run in the suite as if
somebody meant it.

Where to aim, in rough order of what actually finds things here:

- **The empty and the extreme.** Nothing booked, everything booked, the
  attendee with clashes. Zero, one, and many.
- **The other viewport.** Mobile is a first-class project in this repo and
  half its layout differs. A change proven on desktop is proven on half of it.
- **The other day.** Almost everything here moves with the clock. Day 1
  morning is the only time with ratings and check-ins; day 4 is a different
  world.
- **The second interaction.** Add then remove. Sort then filter. Navigate away
  and back. State that survives when it should not is the classic bug this app
  can have.
- **The console.** A page that renders correctly while throwing is still
  broken, and nobody looks.

Screenshot anything you find, so the report shows it rather than describes it.

## 4. Report only what you can reproduce

For each finding: **what you did, what you expected, what happened.** If you
cannot write those three lines, you have not found anything.

```bash
node scripts/pr-media.mjs <issue> /tmp/<name>.png   # if it is visible
gh pr comment <pr> --body "<findings, or one line saying you found nothing>"
```

Say plainly which of these each finding is:

- **a bug in this change** — it broke something, or a Done-when criterion is
  not actually met
- **pre-existing** — you reproduced it on `main` too. Worth saying, explicitly
  not this pull request's problem
- **a question** — behaviour you cannot tell is intended

**"I tried these six things and found nothing" is a good report.** Name the
six. A reviewer learns more from knowing what was probed than from a finding
you had to reach for.

## 5. Write the verdict

Last thing you do, always. One line:

```bash
echo "PASS high drove both viewports, empty and full agendas, days 1 and 4" > /tmp/qa-verdict
echo "PASS low  change is in the seed; nothing of it is reachable from the UI" > /tmp/qa-verdict
echo "FAIL the hours tile reads 0 for an attendee with a waitlist-only day" > /tmp/qa-verdict
```

`PASS <high|medium|low> <what you covered>` or `FAIL <what breaks, and when>`.

**Confidence is how much of the change you exercised**, not how sure you feel:

- **high** — you drove everything that changed, on both viewports, including
  the empty and extreme cases. Someone could merge on your word.
- **medium** — you exercised the main path but something stayed out of reach:
  a viewport, a state you could not reach, a branch you could not trigger.
  Name it in your comment.
- **low** — you could barely test this. The change is server-side, or config,
  or has no visible surface. **A low pass publishes as unproven rather than
  green**, which is the honest reading: nobody verified it here.

Do not round up. "Mostly worked" is `medium`, and a `high` you cannot justify
in one clause is a `medium`.

A `FAIL` stops the merge, so its bar is high and narrow:

- **Only a bug in this change.** If `main` has it too, report it and pass.
- **Only something you reproduced.** You ran it, you saw it.
- **Never a question, a preference, or something you suspect.** Unsure is a
  `PASS` with the doubt in your comment, where a person can weigh it.

Write no file at all and the check reads unproven — correct, because a pass
nobody earned is worse than no pass.

Do not open a pull request, change any code, or add tests to the suite. If a
finding deserves a permanent test, say so and let a person decide.
