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

## 1. Learn what changed, and what is already covered

Read the ticket's **Done when:** clause, the diff, and the tests it added. The
tests tell you where *not* to spend time: whatever they assert is proven, and
repeating it is waste.

Then ask the question they do not answer — *what would make this wrong?*

## 2. Get the app up

```bash
npm run db:seed
npm run dev &                  # NO_OPEN is already set in CI
```

`CLAUDE.md` describes the clock, the attendees and the two venues. Use them:
`?at=` pins the conference clock to any day and time, and each seeded attendee
has a different agenda — one with clashes, one with almost nothing booked, two
who are also speaking.

## 3. Write throwaway checks and run them

Put them in `/tmp`, never in `tests/` — these are probes, not suite members,
and they must not land in the pull request:

```bash
npx playwright test /tmp/qa.spec.js --config=playwright.config.js --project=desktop
```

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

Last thing you do, always:

```bash
echo "PASS" > /tmp/qa-verdict
# or
echo "FAIL <one line: what breaks, and when>" > /tmp/qa-verdict
```

A `FAIL` stops the merge, so the bar for it is high and narrow:

- **Only a bug in this change.** If `main` has it too, it is not this pull
  request's fault and it does not block — report it and pass.
- **Only something you reproduced.** You ran it, you saw it. Twice, if the
  first was a surprise.
- **Never a question, a preference, or something you suspect.** Unsure means
  `PASS` with the doubt written in your comment, where a person can weigh it.

Write no file and the pull request is marked unproven rather than passed —
which is correct, because a pass you did not earn is worse than no pass.

Do not open a pull request, change any code, or add tests to the suite. If a
finding deserves a permanent test, say so and let a person decide.
