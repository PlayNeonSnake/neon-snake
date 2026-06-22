# Project conventions

This project is **already scaffolded** as **Vite 6 + React 19 + TypeScript 5.6**. Do NOT recreate it.

## Paths

- **Always use RELATIVE paths** in tool calls (e.g. `src/App.tsx`). NEVER absolute paths like `/var/folders/...`, `/private/...`, or `/tmp/...`. Your working directory is already the project root.

## What exists

- `index.html` — entry HTML (don't edit unless necessary)
- `src/main.tsx` — bootstraps React (don't edit unless necessary)
- `src/App.tsx` — root component — **edit this to build the user's feature**
- `src/index.css` — global styles
- `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — build config (don't touch)
- `package.json` — edit to add deps

## Rules

- **Do not run** `npm install`, `bun install`, `npm run dev`, `vite`, or any dev-server command. The playground runtime installs deps and runs Vite; HMR reflects your changes automatically.
- **Do not run** `npm init`, `create-vite`, or any scaffolding command.
- **Read before editing.** Use `Read` to inspect a file, then `Edit` to change it. Only use `Write` for NEW files.
- Add dependencies by editing `package.json` — the runtime will reinstall.
- Env vars go in `.env.local`; Vite exposes `VITE_*` vars via `import.meta.env`.
- TypeScript + React 19 function components + hooks. No class components.
- When you finish, tell the user what you built and what to try next.
