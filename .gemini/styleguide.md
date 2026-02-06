# Gemini Generation & Review Standards

## CODE COMPLETENESS (CRITICAL)
- **STRICT_NO_TRUNCATION:** No matter the size of the file, never use placeholders like "// ... existing code" or "// rest of logic".
- **FULL_FILE_OUTPUT:** Always generate the complete, functional code block. Shortcuts are strictly prohibited.
- **READABILITY_OVER_BREVITY:** Prioritize long-form, readable code over condensed or obfuscated syntax.

## MODULARITY & STRUCTURE
- **LOGIC_SEPARATION:** Strictly separate business logic from UI and data access layers.
- **FILE_LIMITS:** If a logical unit grows complex, proactively suggest splitting it into separate modules or class files.
- **VBA_BEST_PRACTICES:** Apply professional naming conventions (PascalCase for procedures, camelCase for variables) and ensure all variables are explicitly declared.

## DOCUMENTATION & TYPES
- **EXPLICIT_TYPING:** If the language supports it, use strict types. Never use 'any' or 'variant' unless unavoidable.
- **INLINE_COMMENTS:** Document the 'why' behind complex logical branches, focusing on business rules.

## FORBIDDEN PATTERNS
- NEVER provide minified code.
- NEVER suggest "one-liner" solutions that sacrifice clarity.
- NEVER skip error handling blocks.