---
name: build
description: >-
  Take one GitHub issue from this repo to a verified pull request:
  claim it, work it in an isolated workspace, prove it in the browser, and
  hand it back to a human — or stop and say why. Use when asked to build,
  implement or pick up an issue, when told "/build 42", or when a ticket is
  labelled ready-for-ai.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Build an issue

One issue in, one reviewable pull request out, with the evidence attached. If it
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
| `ready-for-human` | PR open, verified, waiting on review |
| `needs-human` | you stopped, and said why |

Move the label as you go. A board somewhere is reading it, and a run that
dies without moving it off `ai-working` leaves a ticket nobody knows is
stranded.

## What a step costs

Worth knowing before you start, because it changes what a good run looks like.
The model re-reads the whole conversation on every step, so anything you pull
in early is paid for again on every step after it. A measured run spent 96% of
its budget re-reading context it had already gathered.

So: **ask for the narrowest thing that answers the question.** Not
`gh pr list --json body`, the one field you need. Not `cat` a file, the lines
around a match. Not a command twice to grep it the second time — capture what
you need the first time. Fewer, better-aimed steps is the whole game.

## 1. Read the ticket

```bash
gh issue view <n> --json number,title,body,labels,state
gh pr list --state open --json number,headRefName \
  --jq '.[] | select(.headRefName | startswith("issue-<n>-"))'
```

The second command is the already-being-worked check. Ask for
`headRefName` only — pulling every open pull request's body costs more than
the rest of this step put together.

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

`CLAUDE.md` is the map. It already describes the layout, the conventions, the
three test layers and which one a change belongs in — **take its word for it
rather than re-deriving any of that from source.** It also carries the
reasoning behind several decisions that look arbitrary and are not; a change
contradicting a stated decision is wrong even when every test passes.

Then grep for the behaviour the ticket names and read only the file or two
that own it. Reading `playwright.config.js`, the test helpers or the seed to
work out how this repo is organised is the expensive mistake here: it is all
in `CLAUDE.md`, and every speculative file you open is re-read on every
remaining step.

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

**Run each of these once.** Read everything you need from the first run rather
than running it again to grep the output — a second `verify` is a minute of
wall clock and a suite's worth of output for something you already had.

**In CI, Chromium is already installed.** Never run `playwright install`; the
workflow does it before you start, and doing it again costs a minute and
proves nothing.

If anything visual moved, take one screenshot — the desktop view, unless the
change is specifically about how it behaves narrow:

```bash
npm run shot -- /the-route
```

**No green `verify`, no pull request.** Not "it should be fine", not "the
failure looks unrelated" — a red gate means you are not done. If you cannot
get it green, go to step 9.

## 8. Open the pull request

Open it **ready for review**, not as a draft. You only get here with a green
gate, so it is ready by definition — and a draft is worse than it looks:
review tooling skips drafts, reviewers are not requested, and it sits outside
everyone's review queue. The rail that matters is that a human merges it, not
that a human un-drafts it first.

Write the body to a file and pass it, rather than reaching for `--fill`:
the evidence below is the point of the pull request, and `--fill` would
replace it with your commit message.

```bash
git push -u origin HEAD
gh pr create --base main --title "<the issue's title>" --body-file /tmp/pr-body.md
```

The body carries the evidence, because a reviewer should not have to re-run
anything to believe you. Keep it **short and scannable** — it is read in a
narrow column beside the diff, so a wall of prose is a wall. Use this shape
and resist adding to it:

```markdown
Closes #<n>

<One sentence. What an attendee sees now that they did not before.>

### Changed
- <file or area> — <what, in a few words>
- <one line per change, three or four at most>

### Proof
| Check | Result |
| --- | --- |
| `<the test that proves the ticket>` | red before, green after |
| `npm test` | 161 passed |
| `npm run verify` | 155 passed · desktop + mobile |

<details>
<summary>Worth a closer look</summary>

<Only if something genuinely needs a decision from the reviewer — a trade-off
you made, a criterion you could not test, something in the ticket that turned
out to be wrong. Two short paragraphs at most. Omit the whole block if there
is nothing.>
</details>
```

Three rules for the body, all of them about the reader:

- **A sentence, not a summary of your session.** Nobody wants the narrative.
- **The table is the point.** It is the bit a reviewer actually checks, and a
  table stays readable in a narrow column where paragraphs do not.
- **`<details>` for anything long.** A reviewer who wants it opens it; one who
  does not is not scrolling past it to reach the diff.

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
