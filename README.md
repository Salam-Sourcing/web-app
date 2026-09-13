# Salam Sourcing web app

The Salam Sourcing web application is built with Astro, React, Tailwind CSS, and
ShadCN-compatible UI primitives.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:4321` to view the app.

## Project structure

- `src/pages/` - File-based Astro routes.
- `src/layouts/` - Shared page shells and document metadata.
- `src/components/` - Shared Astro components and React UI primitives.
- `src/lib/` - Shared utilities, including the `cn` helper used by ShadCN components.
- `src/styles/` - Global Tailwind and design-token styles.

Run `npm run check` for Astro and TypeScript diagnostics, or `npm run build` to
create a production build.

## Agent workflow

This repository is designed for human-directed, multi-agent development. Read
[`AGENTS.md`](AGENTS.md) for the agent operating contract and
[`docs/agent-framework.md`](docs/agent-framework.md) for the lifecycle,
ownership, risk policy, handoff format, and scaling path. Work items can be
started from the GitHub issue template or
[`.agents/templates/work-item.md`](.agents/templates/work-item.md).
