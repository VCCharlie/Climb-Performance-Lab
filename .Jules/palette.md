## 2024-05-08 - Accessible Collapsible Section Headers
**Learning:** Collapsible accordion-style sections (like the Strava import review lists) often lack semantic attributes (`aria-expanded`, dynamic `aria-label`) and explicit keyboard focus states (`focus-visible`), making them hard for keyboard/screen reader users to navigate and understand their state. SVG icons within these buttons also need `aria-hidden="true"` so they aren't redundantly announced.
**Action:** When creating collapsible section headers or toggles, always bind `aria-expanded` to the state boolean, provide a dynamic `aria-label` that includes the section title, ensure `focus-visible:ring-2 focus-visible:ring-yellow-400` is applied on the `<button>`, and hide purely decorative SVGs.

## 2024-05-09 - Accessible Dropdown Menus
**Learning:** Dropdown menus toggled by buttons lack crucial screen reader context if they omit `aria-expanded` and `aria-haspopup`. Users with screen readers won't know if the menu is open or closed, or that the button controls a menu.
**Action:** When creating custom dropdown toggles, always include `aria-expanded={state}` and `aria-haspopup="menu"`.
## 2024-05-11 - Explicit Button Types Prevent Accidental Submissions
**Learning:** React `<button>` elements default to `type="submit"` in standard HTML. This causes unintended page reloads or form submissions when buttons are used for custom UI actions (like modals, toggles, or clearing data) inside implicit or explicit forms.
**Action:** Always verify that `<button>` elements acting as generic triggers have `type="button"` explicitly set to prevent side effects, especially in complex applications with nested forms.
## 2023-10-27 - Icon-only buttons accessibility pattern
**Learning:** React components (like `StravaMap.jsx`) using lucide-react icons for expand/collapse actions often lack `aria-label`, `type="button"`, and explicit `aria-hidden="true"` on the SVG, breaking screen reader UX.
**Action:** Always verify icon-only buttons have descriptive `aria-label`s, `type="button"`, `aria-hidden="true"` on the icon itself, and keyboard focus classes like `focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none`.
