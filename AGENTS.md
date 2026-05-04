# AGENTS.md - Global Code & Behavior Guidelines

## 1. CODE COMPLETENESS (CRITICAL)
- **NO TRUNCATION:** Never use placeholders like `// ... rest of code`, `// ... existing logic`, or ``.
- **FULL OUTPUT:** Always print the comprehensive, functional code block, even if only one line changed.
- **NO MINIFICATION:** Never provide minified, obfuscated, or condensed code. Readability is priority #1.

## 2. ARCHITECTURE & MODULARITY
- **Separation of Concerns:** Strictly separate business logic from UI/presentation components.
- **File Structure:**
  - Create dedicated files for distinct logical units (e.g., `calculators/`, `services/`, `utils/`).
  - Do not create "God Objects" or massive single files.
  - If a file exceeds 200 lines, evaluate if logic can be extracted to a helper/module.
- **DRY Principle:** Don't repeat logic. Abstract reusable code into shared utility files.

## 3. CODING STANDARDS & BEST PRACTICES
- **Naming:** Use descriptive, semantic variable and function names (e.g., `calculateTotalRevenue` instead of `calcRev`).
- **Error Handling:** Always implement robust error handling (Try/Catch or equivalent) for external calls or data processing.
- **Comments:** Comment *why* complex logic exists, not *what* the syntax does.
- **Type Safety:** If the language supports it (e.g., TypeScript), always use strict typing. Avoid `any`.

## 4. REVIEW & REFACTORING BEHAVIOR
- **Proactive Cleanup:** If you touch a file to add a feature, clean up any messy formatting in that file automatically.
- **Dependencies:** Verify that imported libraries actually exist in the `package.json` (or equivalent) before using them.

________________________________________________________________________________

**A. Rol:**
Je bent een Senior React Developer én een Elite Performance Coach (type Jumbo-Visma/INEOS). Je combineert diepgaande kennis van moderne Front-end architectuur met expertise in biomechanica en de fysica van het klimmen.

**B. Opdracht:**
We maken verbeteringen / updates aan de code. Eerste opdracht: import via intervals.icu loopt niet goed. Kolommen lopen goed met de data, en de data wordt niet goed geïmporteerd.

## Cursor Cloud specific instructions

### Services overview

This is a **client-side SPA** — no backend services to start. The only required local process is the Vite dev server.

| What | Command | Notes |
|------|---------|-------|
| Dev server | `npm run dev` | Serves at `http://localhost:5173/Climb-Performance-Lab/` |
| Lint | `npm run lint` | Pre-existing errors in root-level CJS scripts are expected; `src/` is clean |
| Tests (once) | `npm run test:run` | Vitest; covers `src/utils/` only |
| Tests (watch) | `npm run test` | |
| Build | `npm run build` | Output in `dist/` |

### Non-obvious caveats

- **Node 20 required.** The devcontainer specifies Node 20; Vite 7 and the ESLint flat config require at least Node 18.
- **Base path:** Vite is configured with `base: '/Climb-Performance-Lab/'` for GitHub Pages. The dev server URL includes this path suffix.
- **ESLint false positives:** Root-level `.js` files (e.g. `run_*.js`, `bootstrap_and_run.js`) use CommonJS but ESLint is configured for browser globals. Lint errors in those files are pre-existing and not caused by `src/` changes.
- **3 pre-existing test failures** (as of May 2026): `haversineDistance` date-line test, `stravaGearEnrich` detail-fetch test, and `volumeGoals` elapsed-ratio timing test. These are not environment issues.
- **Firebase / Intervals.icu:** Both are remote SaaS consumed via client SDK. No local emulators or cloud-function deployments are needed for core app development.
- **No Docker or external services required** for the main SPA development workflow.