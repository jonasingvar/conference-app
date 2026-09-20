---
name: review
description: >-
  Review a pull request another agent just opened, against the spec it was
  built from and the decisions CLAUDE.md records. Comments; never blocks. Use
  when asked to review a pull request in this repo, or when told "/review 42".
allowed-tools: Read, Glob, Grep, Bash
---

# Review a pull request

You did not write this. You have not seen the reasoning that produced it —
only the diff, the spec it claims to implement, and what this repo says about
itself. That is the point: the agent that built it cannot see its own
misreading, and you can.

You **comment, you never block**. A human merges.

**Your verdict is a file**: one line in `/tmp/review-verdict`, and nothing
else is read — a verdict written only in prose leaves the check *unproven*.

It carries a **confidence**, meaning how much of this change you could
actually judge. A clean review of a diff you did not understand is not a
clean review.

## 1. Gather everything before you look at the diff

**Read the ticket first.** Its **Done when:** clause is the contract, and
everything else is evidence about whether the contract was met. Opening the
diff first anchors you on what was built, and you end up asking whether the
code is good instead of whether it is the right code.

Take all of it — the whole issue body, not a summary, and every comment on
both the issue and the pull request:

```bash
gh pr view <pr> --json number,title,body,headRefName,additions,deletions
gh pr diff <pr>

# The issue the PR closes — body in full, and its comments
gh issue view <issue> --json number,title,body,labels
gh api repos/{owner}/{repo}/issues/<issue>/comments --jq '.[] | "\(.user.login): \(.body)"'

# The conversation on the pull request itself
gh api repos/{owner}/{repo}/issues/<pr>/comments --jq '.[] | "\(.user.login): \(.body)"'
```

Then the spec the branch added under `specs/`, and `CLAUDE.md`.

**The pull request conversation can legitimately change the scope.** A human
who commented "drop that button, the nav already covers it" has amended the
ticket, and the diff should follow *them*, not the original text. So read the
comments before you conclude anything contradicts the issue — what looks like
a broken criterion is often a decision someone made after the ticket was
written.

What it does mean is that the pull request may now close an issue it no longer
satisfies. That is worth raising. Someone changing their mind is not.

## 2. Look for these, in this order

1. **A Done-when criterion that is not actually met.** Take them one at a
   time and find the thing that satisfies each — a test, a line of the diff.
   A criterion nobody implemented, or one covered by a test that would have
   passed anyway, is the finding that matters most. If the pull request would
   auto-close an issue it does not satisfy, say so plainly.
2. **The diff contradicts a decision `CLAUDE.md` states.** This repo records
   what was tried and rejected — one action rather than bookmark-plus-reserve,
   no invented external links, no map coordinates, nothing claiming to be true
   that is not. A change can pass every test and still be wrong here, and this
   is the failure no test catches.
3. **The diff and its spec disagree.** The spec is the first commit on the
   branch. If the work drifted, either the spec is stale or the pull request
   no longer does what it says. Say which.
4. **Correctness.** A bug you can name with an input and a wrong output.
5. **A test that proves nothing.** One asserting the implementation's output
   against itself, or one that would pass before the change.

## 3. The bar: would this stop you merging?

Ask it of every finding before you write it down. If the answer is no, **do
not write it down.** Not as a nit, not as a note, not as "minor". A review
that mixes one blocker with six observations has buried the blocker, and the
next person skims all seven.

**At most three findings.** If you believe there are more, you have stopped
reviewing and started listing — pick the three that matter and drop the rest.

Never:

- style, naming, formatting, or preference — if it matches the surrounding
  code it is right, and `CLAUDE.md` settles the rest
- anything opening with "consider", "might want to", "could be cleaner", or
  "for future reference"
- anything the tests already cover
- refactors, abstractions, or how you would have written it
- praise

A reviewer asked to find problems will find some whether or not they are
there. **"Nothing to flag" is a good review**, and it is the most common
correct outcome for work that already passed a green gate. One line, and stop.

## Open your comment with the verdict

Before anything else, so it is visible without scrolling. GitHub renders
these as coloured callouts:

```markdown
> [!TIP]
> ### Review · high confidence &nbsp; `●●●`
> Every criterion traced to the test that satisfies it. 40 lines, one file.
```

| Verdict | Callout | Meter | Renders |
| --- | --- | --- | --- |
| pass, high | `> [!TIP]` | `●●●` | green |
| pass, medium | `> [!NOTE]` | `●●○` | blue |
| pass, low | `> [!WARNING]` | `●○○` | yellow — *unproven, a person should look* |
| fail | `> [!CAUTION]` | *none* | red |

One line under the heading saying what you covered, or what broke. Then the
detail below the callout, as normal prose.

No meter on a blocker: the dots measure how much you covered, and a bug you
reproduced is not a claim about coverage. `### Review · blocker` and the line
saying what breaks.

## 4. Comment

Inline on the line it concerns, where there is one:

```bash
gh pr comment <pr> --body "<your findings, or one line saying there are none>"
```

Lead each finding with what breaks and when. Do not raise anything you would
not defend out loud in review.

## 5. Write the verdict

Last thing you do, always. One line:

```bash
echo "PASS high every criterion maps to a test I read; diff is 40 lines in one file" > /tmp/review-verdict
echo "PASS low  the change is in the seeded PRNG; I cannot tell from the diff what it produces" > /tmp/review-verdict
echo "FAIL closes #12 but its third criterion is not implemented" > /tmp/review-verdict
```

`PASS <high|medium|low> <what you were able to judge>` or `FAIL <the blocker>`.

**Confidence is how much of the change you could evaluate**, not how sure you
feel about what you read:

- **high** — you traced every Done-when criterion to the thing that satisfies
  it, and the diff is within what you can reason about from source.
- **medium** — you judged the substance but something resisted: generated
  output, a timing-dependent path, a dependency you could not see into.
  Say which, in your comment.
- **low** — you could not meaningfully review this from the diff. **A low pass
  publishes as unproven rather than green**, which is honest: it says a human
  should look, rather than implying one need not.

A `FAIL` turns the check red. It does **not** stop anyone merging — a person
decides that, as they always have. It puts the blocker where someone skimming
will see it, instead of one comment among several.

The bar is the one you already applied: `FAIL` only for something that should
stop this merging. Three findings all worth reading, none of them a blocker,
is still a `PASS` — say so, and let the comment carry them.

Never approve, never request changes, never merge. The label stays
`ready-for-human`: a person reads your comments and decides.
