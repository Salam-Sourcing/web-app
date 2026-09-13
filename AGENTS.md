# Agent operating contract

This file is the default operating contract for every LLM working in this
repository. The human operator owns priorities, approvals, merges, and
production access. Agents own only the explicitly assigned work item.

## Before changing code

1. Read `README.md` and `docs/agent-framework.md`.
2. Inspect the current working tree; never discard changes you did not create.
3. Identify the assigned work item, its acceptance criteria, and its risk tier.
4. Claim a file or feature area in the work item before editing it. If another
   agent owns it, stop and ask the operator to coordinate.

## While working

- Keep changes scoped to the assigned outcome. Do not opportunistically refactor.
- Prefer existing Astro, React, Tailwind, and TypeScript patterns.
- Treat user input, external data, and environment variables as untrusted.
- Surface uncertainty, blockers, and failed checks; never hide them with a broad
  catch or a silent fallback.
- Update the work item with decisions and verification results as you go.
- Do not commit, merge, deploy, install dependencies, or change secrets unless
  the operator explicitly authorizes it.

## Before handoff

Run the smallest relevant existing checks, at minimum:

```bash
npm run check
npm run build
```

Report the exact commands and outcomes. Review the diff for unrelated changes,
accessibility regressions, responsive behavior, and accidental secrets. A task
is not complete until the acceptance criteria are either verified or explicitly
marked as not verified.

## Handoff format

End every task with:

- **Status:** complete, blocked, or needs-review
- **Implemented:** concise list of outcomes
- **Files:** files changed and why
- **Verification:** commands and results
- **Risks / follow-up:** known gaps, migrations, or operator decisions
- **Next action:** the precise action for the operator or next agent

When instructions conflict, follow this order: direct human instruction,
repository-specific work item, this contract, then general conventions.
