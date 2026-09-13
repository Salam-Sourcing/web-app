# Agent framework

This repository uses a prompt-first, human-directed multi-agent workflow.
The operator starts work by giving an agent a prompt. The agent owns the
implementation, its verification, and a local log that makes the work
resumable without adding process overhead to every task.

## Goals and boundaries

- Start work from a direct prompt instead of a required work-item form.
- Keep progress, decisions, changed files, and verification in one local log.
- Make handoff possible when a task outlives an agent session.
- Keep the human operator responsible for priorities, approvals, merges,
  production access, and release decisions.

The framework does not prescribe a model vendor, agent runtime, database, or
dashboard. Logs are local execution state and are intentionally ignored by Git.
Use GitHub issues and pull requests when a durable, shared record is needed.

## Roles

| Role | Human responsibility | Agent responsibility |
| --- | --- | --- |
| Operator | Provide the prompt, set priorities, approve risk, merge, release | Clarify ambiguity and coordinate agents |
| Implementer | Approve sensitive access and meaningful scope changes | Execute the prompt and keep the log current |
| Reviewer | Approve the diff and behavior | Find correctness, security, accessibility, and regression issues |
| Verifier | Decide release gates | Run existing checks and report reproducible evidence |

One agent can hold multiple roles for low-risk work, but the operator should
keep implementation and final approval conceptually separate.

## Task flow

```text
Prompt -> Log -> Implement -> Verify -> Complete
                         \-> Handoff when needed
```

1. **Prompt:** the operator describes the desired outcome directly to an
   agent. The agent asks a clarifying question when a safe implementation
   cannot be inferred.
2. **Log:** the agent creates a file with a relevant name in
   `.agents/logs/`, using [the log template](../.agents/templates/agent-log.md).
3. **Implement:** the agent records a short plan, makes scoped changes, and
   updates the log with decisions, progress, and changed files.
4. **Verify:** the agent runs the smallest relevant existing checks and records
   exact commands and outcomes.
5. **Complete:** the agent marks the log status and reports the result. If more
   work is needed, the log's handoff section states the next smallest action.

Use a descriptive filename, for example:

```text
.agents/logs/2026-09-13-improve-search-filter.md
```

Logs are ignored by Git through `.agents/logs/`. Do not commit them. If a task
needs a shared audit trail, link the pull request or issue from the final
response instead.

## Log requirements

Each log should contain:

- the prompt or a concise description of it;
- the agent and start date;
- current status: `in-progress`, `complete`, `blocked`, or `needs-review`;
- the plan and meaningful progress updates;
- files changed and why;
- verification commands and results;
- decisions, risks, and failed attempts;
- a precise handoff action, or `None`.

The log is a working record, not a second approval system. Do not delay a
small task waiting for a form, issue, or branch convention unless the operator
explicitly requests one.

## Quality gates

The minimum web-app gate is:

```bash
npm run check
npm run build
```

Use `npm run format:check` when formatting is part of the change. The agent
must also manually inspect rendered behavior for UI work and consider keyboard
access, focus states, responsive layouts, loading/error states, and
user-facing text. Record checks that were not run and why.

## Handoff and resumability

When context is running low or the task is blocked, stop at a coherent
checkpoint. Update the log before handing off. The next agent should be able to
continue from the log without access to the previous chat. Include the current
status, files touched, decisions, failed attempts, command results, risks, and
one precise next action.

## Scope and safety

- Keep changes scoped to the prompt. Do not opportunistically refactor.
- Inspect the working tree first and never discard changes you did not create.
- Prefer existing Astro, React, Tailwind, and TypeScript patterns.
- Treat user input, external data, and environment variables as untrusted.
- Surface uncertainty, blockers, and failed checks; never hide them with broad
  catches or silent fallbacks.
- Do not commit, merge, deploy, install dependencies, or change secrets unless
  the operator explicitly authorizes it.
- High-risk work involving authentication, authorization, payments, personal
  data, secrets, migrations, dependency upgrades, deployment, or destructive
  operations requires explicit human approval.
