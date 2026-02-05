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