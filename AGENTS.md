# Repository Guidelines

## Project Structure & Module Organization

Tempo Reminder is an Electron desktop app for Windows and macOS, with a React and TypeScript interface.

- `src/main/`: Electron lifecycle, notifications, tray, and IPC handlers.
- `src/preload/`: typed bridge between Electron and the renderer.
- `src/renderer/src/`: React components and CSS.
- `src/core/`: scheduling, settings validation, and local persistence.
- `src/shared/`: shared TypeScript types.
- `tests/`: core unit tests; `resources/` and `scripts/build-icons.mjs`: icons, licenses, and asset generation.
- `out/` and `dist/`: generated build and packaging output. Published Windows archives live in `releases/windows/` and use Git LFS.

## Build, Test, and Development Commands

Use Node.js 24 (minimum 22.12). Prefix shell commands with `rtk`; use `rtk proxy <command>` when unfiltered output is needed.

- `rtk npm ci`: install locked dependencies.
- `rtk npm run dev`: launch the Electron development app.
- `rtk npm run typecheck`: check strict TypeScript types.
- `rtk npm test`: run Vitest once.
- `rtk npm run build`: type-check and build into `out/`.
- `rtk npm run check`: run type checks, tests, and the application build before submitting changes.
- `rtk npm run pack`: regenerate icons and create an unpacked application.
- `rtk npm run dist`: generate installers in `dist/`; build macOS packages on macOS.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, two-space indentation, LF endings, and a final newline. `.prettierrc.json` specifies single quotes, no semicolons, no trailing commas, and a 100-character print width. No formatter or lint script is configured. Use PascalCase for components and types, camelCase for functions and variables, and descriptive lowercase utility filenames. Keep core logic independent of the UI.

## Testing Guidelines

Vitest runs `tests/**/*.test.ts` in Node; no coverage threshold is configured. Use behavior-focused `describe`/`it` cases, explicit local dates, and temporary directories cleaned after tests. Cover scheduling boundaries, daily deduplication, validation, and persistence failures when changing those behaviors. Manually verify affected Electron interactions, including notifications, tray behavior, and settings restoration.

## Commit & Pull Request Guidelines

History uses concise conventional subjects such as `feat: polish reminder UI with a dark desktop theme` and `build: add Windows installer ZIP with Git LFS`. Follow that pattern. PRs should describe behavior changes, link relevant issues, report validation and platforms tested, and include screenshots for UI changes. Ensure Windows and macOS CI passes.
