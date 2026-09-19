---
name: build
description: >-
  Take one GitHub issue from this repo to a verified draft pull request:
  claim it, work it in an isolated workspace, prove it in the browser, and
  hand it back to a human — or stop and say why. Use when asked to build,
  implement or pick up an issue, when told "/build 42", or when a ticket is
  labelled ready-for-ai.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Build an issue

One issue in, one draft pull request out, with the evidence attached. If it
cannot be finished honestly, it comes back labelled `needs-human` and says
what stopped it — never a smaller version of the ticket presented as the
whole thing.

Read `CLAUDE.md` first. It is the specification for this repo, and most of
what looks like a judgement call is already settled there.

## The labels are the state

Exactly one at a time:

| Label | Means |
| --- | --- |
| `ready-for-ai` | groomed, nobody has started |
| `ai-working` | you have it |
| `ready-for-human` | draft PR open and verified |
| `needs-human` | you stopped, and said why |

Move the label as you go. A board somewhere is reading it, and a run that
dies without moving it off `ai-working` leaves a ticket nobody knows is
stranded.

## 1. Read the ticket

```bash
gh issue view <n> --json number,title,body,labels,state
```

The **Done when:** clause is the acceptance criteria — that is what you are
building, and later, what you prove. Stop now and label `needs-human` if:

- the issue is closed, or already has an open PR that closes it
- there is no stated outcome you could write a check against
- it asks for two unrelated things (it needs splitting, which is not your call)

## 2. Claim it

Swap `ready-for-ai` for `ai-working`, and comment on the issue saying you have
started and what you understand the job to be. One short paragraph. If your
understanding is wrong, this is the cheapest possible moment for someone to
say so.

## 3. Get an isolated workspace

**In a GitHub Actions runner** (`$GITHUB_ACTIONS` is set) the machine is
already yours. Just branch:

```bash
git checkout -b issue-<n>-<short-slug> origin/main
```

**On a laptop**, other agents may be working other tickets, so take a
worktree and a lane:

```bash
git worktree add -b issue-<n>-<short-slug> ../orbit-wt-<n> origin/main
cd ../orbit-wt-<n> && npm install
eval "$(node scripts/lane.mjs claim <n>)"
```

The lane gives you `PORT`, `WEB_PORT` and `ORBIT_LANE` that nobody else holds.
Without it you will eventually test another branch's code and pass.

## 4. Understand before you change anything

Find the code that owns the behaviour the ticket describes. `CLAUDE.md` has
the layout and, more usefully, the reasoning behind it — including several
decisions that look arbitrary and are not. A change that contradicts a stated
decision is wrong even when every test passes.

## 5. Write the check before the change

Derive a check from the ticket's **Done when:**, at the cheapest layer that
can prove it — `CLAUDE.md` says which layer that is. Run it, and **confirm it
fails** for the reason you expect. A check that passes before you have written
anything is proving something other than the ticket.

Three rules, and they are not negotiable:

- **Never edit an existing test to make it pass.** If an existing test fails,
  your change is wrong, not the test. The only exception is a ticket that
  explicitly changes that behaviour.
- **Never delete, skip or `.only` a test.**
- **Never assert a value you copied out of your own implementation's output.**
  The expected value comes from the ticket or from reasoning about it.

## 6. Implement

Run `npm test` after every edit — it is 159 tests in under a second, so there
is no excuse for finding out later. Match the surrounding code; this repo has
a strong house style and `CLAUDE.md` describes it.

## 7. Prove it

```bash
npm test          # must be green
npm run verify    # the gate: real browser, desktop and mobile
```

If anything visual moved, look at it:

```bash
npm run shot -- /the-route
```

**No green `verify`, no pull request.** Not "it should be fine", not "the
failure looks unrelated" — a red gate means you are not done. If you cannot
get it green, go to step 9.

## 8. Open the draft pull request

Push the branch and open it **as a draft** — a human marks it ready, which is
what keeps every change going through review.

Write the body to a file and pass it, rather than reaching for `--fill`:
the evidence below is the point of the pull request, and `--fill` would
replace it with your commit message.

```bash
git push -u origin HEAD
gh pr create --draft --base main --title "<the issue's title>" --body-file /tmp/pr-body.md
```

The body carries the evidence, because a reviewer should not have to re-run
anything to believe you:

```markdown
Closes #<n>

## What changed
<two or three sentences, in terms of what an attendee now sees>

## How it is proved
- `<test name>` — failed before the change, passes now
- `npm test` — 159 passed
- `npm run verify` — 153 passed, desktop and mobile

## Anything a reviewer should look at closely
<or "nothing" — but say so deliberately>
```

Attach the screenshot if the change was visual.

Then swap `ai-working` for `ready-for-human`. You are done.

## 9. If you cannot finish

This is a normal outcome, not a failure. Label it `needs-human`, remove
`ai-working`, and comment with:

- what you were trying to do
- what you tried
- the actual output that stopped you
- what you think it needs from a person

Do not open a pull request. Do not narrow the ticket to something you *can*
finish and present that as done — a half-built ticket that looks complete
costs more than one that is honestly stuck.

## 10. Clean up

On a laptop only:

```bash
node scripts/lane.mjs release
git worktree remove ../orbit-wt-<n>
```

In a runner there is nothing to clean up — the machine goes away.
