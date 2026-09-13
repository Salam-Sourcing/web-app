# Agent framework

This repository uses a human-directed, issue-backed multi-agent workflow. The
framework is intentionally provider-agnostic: agents may run in an IDE, a CI
worker, or an external orchestrator, while GitHub issues, branches, and pull
requests remain the durable source of truth.

## Goals and boundaries

### Goals

- Let one operator safely coordinate many agents in parallel.
- Make agent work resumable after a context window, model, or machine changes.
- Keep changes reviewable, testable, and attributable.
- Support fast "vibe coded" iteration without making correctness optional.
- Scale from a solo developer to independent feature teams.

### Boundaries

The framework does not prescribe a model vendor, agent runtime, database, or
dashboard. Those can be added later without changing the work contract.
GitHub is the default control plane because it supplies identity, discussion,
labels, branch protection, CI, and an audit trail.

## Roles

| Role        | Human responsibility                                         | Agent responsibility                                             |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Operator    | Prioritize, decompose, assign, approve risk, merge, release  | Never delegate these decisions implicitly                        |
| Planner     | Define outcome, acceptance criteria, dependencies, risk tier | Ask clarifying questions and split work into independent slices  |
| Implementer | Approve scope and sensitive access                           | Make the smallest coherent code change                           |
| Reviewer    | Approve the diff and behavior                                | Find correctness, security, accessibility, and regression issues |
| Verifier    | Decide release gates                                         | Run existing checks and report reproducible evidence             |

One agent can hold multiple roles for low-risk work, but the operator should
keep planning, implementation, and final approval conceptually separate.

## Control-plane objects

Every piece of work must have a durable record. Use the GitHub issue template
in `.github/ISSUE_TEMPLATE/agent-work.yml` or copy
`.agents/templates/work-item.md`.

Required fields:

- **Outcome:** user or business result, not an implementation wish
- **Acceptance criteria:** observable pass/fail statements
- **Scope:** included and explicitly excluded areas
- **Risk tier:** `low`, `medium`, or `high`
- **Owner:** one agent at a time; the operator can reassign
- **Files / surfaces:** intended ownership boundary
- **Dependencies:** issue IDs, decisions, or external access
- **Verification plan:** checks to run before handoff

Recommended labels:

`agent:ready`, `agent:claimed`, `agent:blocked`, `agent:review`,
`agent:verified`, `risk:low`, `risk:medium`, `risk:high`, and an area label
such as `area:ui` or `area:content`.

The issue is the queue. The branch and pull request are the execution record.
Chat messages are useful context but are not durable state.

## Lifecycle

```text
Draft -> Ready -> Claimed -> Implementing -> Review -> Verified -> Merged
                    |             |             |
                    +---------- Blocked <-------+
```

1. **Draft:** operator or planner writes the outcome and acceptance criteria.
2. **Ready:** dependencies are known and the work can be assigned safely.
3. **Claimed:** one agent, branch, and file ownership boundary are recorded.
4. **Implementing:** the agent edits only the agreed scope and records decisions.
5. **Review:** a pull request links the issue and includes the handoff checklist.
6. **Verified:** checks and acceptance criteria have evidence; reviewer comments
   are resolved or explicitly accepted by the operator.
7. **Merged:** only the operator or an explicitly authorized release agent merges.
8. **Blocked:** missing requirements, access, dependency, or a conflicting owner
   is recorded with the exact unblock action.

An agent must not silently move a work item backwards or declare another agent's
work complete.

## Parallelism and ownership

Use one branch and one pull request per work item:

```text
agent/<issue-number>-<short-slug>
```

Parallel work is safe when agents have disjoint ownership boundaries. Prefer
vertical slices over multiple agents editing the same component. If overlap is
unavoidable, the operator chooses a sequencing order and records it as a
dependency.

The operator may use a simple coordination table:

| Issue | Agent   | Branch            | Owned surfaces          | State        | Last update |
| ----- | ------- | ----------------- | ----------------------- | ------------ | ----------- |
| #123  | agent-a | `agent/123-login` | `src/pages/login.astro` | implementing | 2026-09-13  |

An agent that has no update after the agreed heartbeat is not automatically
cancelled. The operator should inspect its session, then reassign or resume it
explicitly.

## Risk policy

### Low

Copy, styling, isolated UI, documentation, or tests with no data/auth/deploy
impact. One implementer and normal review.

### Medium

Shared components, navigation, validation, state, or changes with meaningful
regression risk. Require targeted checks and a second review where practical.

### High

Authentication, authorization, payments, personal data, secrets, migrations,
dependency upgrades, deployment, or destructive operations. Require explicit
human approval before implementation and before merge; use a security review
when applicable. Agents must not invent production values or bypass controls.

## Handoff and resumability

Use `.agents/templates/handoff.md` in the issue or pull request. A handoff must
be sufficient for a new agent with no access to the previous chat to continue.
It should include current state, files touched, decisions, failed attempts,
commands, test output summary, and the next smallest action.

When context is running low, stop at a coherent checkpoint and hand off rather
than widening scope or leaving a half-applied migration. When a check fails,
preserve the failure, explain the likely cause, and either fix it or mark the
work item blocked.

## Quality gates

The minimum web-app gate is:

```bash
npm run check
npm run build
```

Use `npm run format:check` when formatting is part of the change. The agent
must also manually inspect the rendered behavior for UI work and consider
keyboard access, focus states, responsive layouts, loading/error states, and
user-facing text. CI should enforce these commands as the repository grows.

## Operator playbook

### Start a work cycle

1. Triage incoming issues and split independent outcomes.
2. Add acceptance criteria, risk, ownership surfaces, and dependencies.
3. Mark only dependency-free work `agent:ready`.
4. Assign one agent per ready issue and record the branch.
5. Keep high-risk work in a separate lane requiring approval.

### During execution

1. Prefer independent agents on disjoint surfaces.
2. Ask agents for checkpoint updates at a consistent interval.
3. Resolve ownership conflicts through the issue, never by overwriting files.
4. Review small pull requests continuously instead of batching a large queue.

### Close a cycle

1. Confirm acceptance criteria and verification evidence.
2. Review the diff and security-sensitive changes.
3. Merge only after required checks and approvals pass.
4. Close the issue with the release note, follow-up items, and lessons learned.

## Scaling path

Start with GitHub issues, branches, pull requests, and this document. Add
automation only when a repeated human step is well understood:

1. **Stage 1:** labels, templates, branch protection, and CI checks.
2. **Stage 2:** a dispatcher that claims ready issues and starts isolated agents.
3. **Stage 3:** an event store for agent heartbeats, tool calls, costs, and
   artifacts; keep GitHub links as the human-facing projection.
4. **Stage 4:** policy gates for risk, approvals, concurrency, and automatic
   retries. Agents remain unable to merge or deploy without explicit policy.

Useful metrics are lead time, review wait time, verification failure rate,
reopened issues, ownership conflicts, and operator interventions. Do not
optimize for number of agent turns or lines changed.
