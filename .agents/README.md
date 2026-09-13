# `.agents`

This directory contains reusable guidance for the repository's prompt-first
agent workflow. The operator provides the prompt directly to an agent. The
agent keeps a local, resumable record of its work in `.agents/logs/`.

- `templates/agent-log.md` is the log format to copy for each task.
- `.agents/logs/` is intentionally ignored by Git because logs are local
  execution state, not application source.

Create a log with a task-specific filename such as
`.agents/logs/2026-09-13-update-agent-workflow.md`, update it as work
progresses, and finish it with verification results and a handoff when another
agent needs to continue. Read [`AGENTS.md`](../AGENTS.md) and
[`docs/agent-framework.md`](../docs/agent-framework.md) before starting.
