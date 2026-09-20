
https://github.com/user-attachments/assets/7f3ea661-2e85-4895-b7b2-63f3d77a1674

# ORBIT '26

A conference companion app for a fictional applied-AI conference in Las Vegas —
four days, ~140 sessions, 110 speakers, two venues six miles apart.

It is the sample application for a workshop on using AI across the software
delivery lifecycle. **A voice note goes in one end. A merged pull request comes
out the other.** You decide what to build and what to ship; agents do the rest.

```mermaid
flowchart TB
    V["🎙️ transcript · voice note · screenshot"]
    I["GitHub Issue<br/><i>why · what · Done when…</i>"]
    G{"npm run verify<br/>desktop + mobile"}
    NH["🔴 needs-human<br/><i>says what stopped it</i>"]
    PR["pull request<br/><i>screenshot · red→green · spec</i>"]
    H{"you merge"}

    V -->|process-requirements| P["proposal"]
    P -->|create-tasks| I
    I -->|"you label <b>ready-for-ai</b>"| B(["build<br/><i>spec → failing test → code</i>"])
    B --> G
    G -->|red| NH
    NH -.->|you answer, relabel| I
    G -->|green| PR

    PR --> gates
    subgraph gates["both run on every pull request · neither can block a merge"]
        direction LR
        CR(["code review · Opus<br/><i>starts from the criteria,<br/>not the diff</i>"])
        QA(["qa · Sonnet<br/><i>drives Chromium for what<br/>no test covers</i>"])
    end
    gates --> V2["verdict + <b>confidence</b><br/><i>coverage, not conviction</i>"]
    V2 --> H
    H --> M["main"]

    style V fill:#8250DF,color:#fff
    style I fill:#8250DF,color:#fff
    style NH fill:#A40E26,color:#fff
    style PR fill:#BF8700,color:#fff
    style H fill:#BF8700,color:#fff
    style M fill:#1A7F37,color:#fff
```mermaid
flowchart LR
    V["🎙️ transcript<br/>voice note<br/>screenshot"]
    P["proposal"]
    I["GitHub Issue<br/><i>Done when…</i>"]
    G{"npm run verify<br/>green?"}
    NH["needs-human<br/><i>says what stopped it</i>"]
    PR["pull request<br/>screenshot · red→green"]
    M["main"]

    V -->|process-requirements| P
    P -->|create-tasks| I
    I -->|"you label<br/><b>ready-for-ai</b>"| B(["build"])
    B --> G
    G -->|no| NH
    NH -.->|you answer, relabel| I
    G -->|yes| PR
    PR --> CR(["code review"])
    PR --> QA(["qa"])
    CR --> H{"you<br/>merge"}
    QA --> H
    H --> M

    style V fill:#8250DF,color:#fff
    style I fill:#8250DF,color:#fff
    style NH fill:#A40E26,color:#fff
    style PR fill:#BF8700,color:#fff
    style H fill:#BF8700,color:#fff
    style M fill:#1A7F37,color:#fff
```mermaid
flowchart TB
    V["🎙️ transcript · voice note · screenshot"]
    I["GitHub Issue<br/><i>why · what · Done when…</i>"]
    G{"npm run verify<br/>desktop + mobile"}
    NH["🔴 needs-human<br/><i>says what stopped it</i>"]
    PR["pull request<br/><i>screenshot · red→green · spec</i>"]
    H{"you merge"}

    V -->|process-requirements| P["proposal"]
    P -->|create-tasks| I
    I -->|"you label <b>ready-for-ai</b>"| B(["build<br/><i>spec → failing test → code</i>"])
    B --> G
    G -->|red| NH
    NH -.->|you answer, relabel| I
    G -->|green| PR

    PR --> gates
    subgraph gates["both run on every pull request · neither can block a merge"]
        direction LR
        CR(["code review · Opus<br/><i>starts from the criteria,<br/>not the diff</i>"])
        QA(["qa · Sonnet<br/><i>drives Chromium for what<br/>no test covers</i>"])
    end
    gates --> V2["verdict + <b>confidence</b><br/><i>coverage, not conviction</i>"]
    V2 --> H
    H --> M["main"]

    style V fill:#8250DF,color:#fff
    style I fill:#8250DF,color:#fff
    style NH fill:#A40E26,color:#fff
    style PR fill:#BF8700,color:#fff
    style H fill:#BF8700,color:#fff
    style M fill:#1A7F37,color:#fff
```

```mermaid
flowchart TB
    V["🎙️ transcript · voice note · screenshot"]
    I["GitHub Issue<br/><i>why · what · Done when…</i>"]
    G{"npm run verify<br/>desktop + mobile"}
    NH["🔴 needs-human<br/><i>says what stopped it</i>"]
    PR["pull request<br/><i>screenshot · red→green · spec</i>"]
    H{"you merge"}

    V -->|process-requirements| P["proposal"]
    P -->|create-tasks| I
    I -->|"you label <b>ready-for-ai</b>"| B(["build<br/><i>spec → failing test → code</i>"])
    B --> G
    G -->|red| NH
    NH -.->|you answer, relabel| I
    G -->|green| PR

    PR --> gates
    subgraph gates["both run on every pull request · neither can block a merge"]
        direction LR
        CR(["code review · Opus<br/><i>starts from the criteria,<br/>not the diff</i>"])
        QA(["qa · Sonnet<br/><i>drives Chromium for what<br/>no test covers</i>"])
    end
    gates --> V2["verdict + <b>confidence</b><br/><i>coverage, not conviction</i>"]
    V2 --> H
    H --> M["main"]

    style V fill:#8250DF,color:#fff
    style I fill:#8250DF,color:#fff
    style NH fill:#A40E26,color:#fff
    style PR fill:#BF8700,color:#fff
    style H fill:#BF8700,color:#fff
    style M fill:#1A7F37,color:#fff
```bash
npm install && npm run dev     # seeds, starts API + web on :5173
```mermaid
flowchart TB
    V["🎙️ transcript · voice note · screenshot"]
    I["GitHub Issue<br/><i>why · what · Done when…</i>"]
    G{"npm run verify<br/>desktop + mobile"}
    NH["🔴 needs-human<br/><i>says what stopped it</i>"]
    PR["pull request<br/><i>screenshot · red→green · spec</i>"]
    H{"you merge"}

    V -->|process-requirements| P["proposal"]
    P -->|create-tasks| I
    I -->|"you label <b>ready-for-ai</b>"| B(["build<br/><i>spec → failing test → code</i>"])
    B --> G
    G -->|red| NH
    NH -.->|you answer, relabel| I
    G -->|green| PR

    PR --> gates
    subgraph gates["both run on every pull request · neither can block a merge"]
        direction LR
        CR(["code review · Opus<br/><i>starts from the criteria,<br/>not the diff</i>"])
        QA(["qa · Sonnet<br/><i>drives Chromium for what<br/>no test covers</i>"])
    end
    gates --> V2["verdict + <b>confidence</b><br/><i>coverage, not conviction</i>"]
    V2 --> H
    H --> M["main"]

    style V fill:#8250DF,color:#fff
    style I fill:#8250DF,color:#fff
    style NH fill:#A40E26,color:#fff
    style PR fill:#BF8700,color:#fff
    style H fill:#BF8700,color:#fff
    style M fill:#1A7F37,color:#fff
```

No login — pick an attendee from the switcher. Two of them are also speaking.

---

## Two harnesses

**Product** decides what to build. **Engineering** builds it. They meet at a
GitHub Issue.

| | Skill | What it does |
| --- | --- | --- |
| 🎙️ | `listen-to-meeting` | Listens live, flags contradictions and gaps while they can still be resolved in the room |
| 🎙️ | `transcribe-audio` | Whisper, locally — no hosted service, no account |
| 📋 | `process-requirements` | Distils a transcript into durable knowledge and actionable work; surfaces conflicts |
| 📋 | `create-tasks` | Raises the tickets — goal first, deduplicated, one goal each |
| 📋 | `update-context` | Folds agreed knowledge back into the project's docs |
| ⚙️ | `build` | Ticket → spec → failing test → code → green gate → pull request |
| ⚙️ | `code-review` | Fresh context, starts from the acceptance criteria, blockers only |
| ⚙️ | `qa` | Boots the app, drives Chromium, hunts what no test covers |

They are markdown files in `.claude/skills/`. That is the whole harness.

---

## How a ticket moves

```mermaid
flowchart TB
    V["🎙️ transcript · voice note · screenshot"]
    I["GitHub Issue<br/><i>why · what · Done when…</i>"]
    G{"npm run verify<br/>desktop + mobile"}
    NH["🔴 needs-human<br/><i>says what stopped it</i>"]
    PR["pull request<br/><i>screenshot · red→green · spec</i>"]
    H{"you merge"}

    V -->|process-requirements| P["proposal"]
    P -->|create-tasks| I
    I -->|"you label <b>ready-for-ai</b>"| B(["build<br/><i>spec → failing test → code</i>"])
    B --> G
    G -->|red| NH
    NH -.->|you answer, relabel| I
    G -->|green| PR

    PR --> gates
    subgraph gates["both run on every pull request · neither can block a merge"]
        direction LR
        CR(["code review · Opus<br/><i>starts from the criteria,<br/>not the diff</i>"])
        QA(["qa · Sonnet<br/><i>drives Chromium for what<br/>no test covers</i>"])
    end
    gates --> V2["verdict + <b>confidence</b><br/><i>coverage, not conviction</i>"]
    V2 --> H
    H --> M["main"]

    style V fill:#8250DF,color:#fff
    style I fill:#8250DF,color:#fff
    style NH fill:#A40E26,color:#fff
    style PR fill:#BF8700,color:#fff
    style H fill:#BF8700,color:#fff
    style M fill:#1A7F37,color:#fff
```mermaid
stateDiagram-v2
    direction LR
    [*] --> ready_for_ai: you label it
    ready_for_ai --> ai_working: agent claims it
    ai_working --> ready_for_human: PR open, suite green
    ai_working --> needs_human: it stopped, and said why
    ready_for_human --> [*]: you merge
    needs_human --> ready_for_ai: you answer, relabel
```mermaid
flowchart TB
    V["🎙️ transcript · voice note · screenshot"]
    I["GitHub Issue<br/><i>why · what · Done when…</i>"]
    G{"npm run verify<br/>desktop + mobile"}
    NH["🔴 needs-human<br/><i>says what stopped it</i>"]
    PR["pull request<br/><i>screenshot · red→green · spec</i>"]
    H{"you merge"}

    V -->|process-requirements| P["proposal"]
    P -->|create-tasks| I
    I -->|"you label <b>ready-for-ai</b>"| B(["build<br/><i>spec → failing test → code</i>"])
    B --> G
    G -->|red| NH
    NH -.->|you answer, relabel| I
    G -->|green| PR

    PR --> gates
    subgraph gates["both run on every pull request · neither can block a merge"]
        direction LR
        CR(["code review · Opus<br/><i>starts from the criteria,<br/>not the diff</i>"])
        QA(["qa · Sonnet<br/><i>drives Chromium for what<br/>no test covers</i>"])
    end
    gates --> V2["verdict + <b>confidence</b><br/><i>coverage, not conviction</i>"]
    V2 --> H
    H --> M["main"]

    style V fill:#8250DF,color:#fff
    style I fill:#8250DF,color:#fff
    style NH fill:#A40E26,color:#fff
    style PR fill:#BF8700,color:#fff
    style H fill:#BF8700,color:#fff
    style M fill:#1A7F37,color:#fff
```

**The build agent will not skip a step.** It writes a spec into `specs/` as the
branch's first commit, so you read what it intends before the diff. It writes a
check that fails first. It gates on `npm run verify` — Chromium, desktop and
mobile — and **opens no pull request without a green one.** If it can't finish
honestly it says so and opens nothing.

**Then two agents read it**, neither having seen the reasoning that produced it
— the point being that the agent who wrote it can't see its own misreading.
Code review takes the acceptance criteria one at a time; QA drives the browser
for the empty agenda, the phone viewport, the fourth day, the second click. Each
publishes a **confidence**, meaning coverage rather than conviction — a
low-confidence pass shows as *unproven*, not green.

**Neither can block a merge.** An agent asked to find problems will find some.

Comment `@claude …` on the pull request and it makes the change and replies.
You still merge.

---

## Set up your fork

1. **Actions → Set up the harness → Run workflow** — creates the four labels
   (a fork doesn't inherit them) and tells you what's missing.
2. Add `ANTHROPIC_API_KEY` as a repository secret. **It must be scoped to a
   workspace** — an org-level key is refused and the error doesn't say why.
3. Optional: `AGENT_GITHUB_TOKEN`, a classic token with `repo` + `workflow`.
   Without it every agent pull request waits at *Approve and run*.

Then open an issue with a **Done when:** clause, label it `ready-for-ai`, and
watch the Actions tab.

---

## Commands

| | |
| --- | --- |
| `npm run dev` | Seed, then API + web together |
| `npm test` | Unit + API — no browser, under a second |
| `npm run verify` | The gate: Playwright, desktop and mobile |
| `npm run shot -- /schedule` | Screenshot a route |
| `npm run db:reset` | Rebuild the database — Day 1 becomes today |
| `node scripts/lane.mjs claim 42` | A port pair, so several agents can work at once |

Node 22 · Express · better-sqlite3 · React 18 · Vite 6 · Tailwind v4 ·
Playwright. No ORM, no state library, no component kit.

**The conference is always today.** Seeding makes Day 1 the day you run it, so
you arrive mid-conference and the clock ticks while you watch. Pin it with
`?at=YYYY-MM-DDTHH:MM`.

## Read next

- **[CLAUDE.md](./CLAUDE.md)** — architecture, conventions, and *why*. What the
  review agent checks a change against.
- **[specs/](./specs/)** — one file per ticket, written before the code.
  Together, the record of how this codebase got this way.
- **[docs/DATA_MODEL.md](./docs/DATA_MODEL.md)** — the schema.
