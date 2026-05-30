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

## 2025-05-20 - Missing keyboard accessibility on data visualization components
**Learning:** Found that custom data visualizations (like the power curve in `ActivityDetailModal.jsx` and the squares in `ActivityHeatmap.jsx`) relying on hover states to show tooltips are inaccessible to keyboard users and screen readers. Specifically, `opacity-0 group-hover:opacity-100` was missing equivalent focus states, and the interactive graphical elements lacked `tabIndex="0"` and focus outlines.
**Action:** Always add `tabIndex="0"`, standard focus rings (`focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none`), and `focus-within:opacity-100` to make custom chart tooltips readable for keyboard navigators. For iterating elements like heatmap cells, only apply `tabIndex="0"` to valid interactive cells (skipping empty placeholder cells).
## 2024-05-24 - Screen-Reader Tab Accessibility with React Conditional Rendering
**Learning:** When using React conditional rendering for tab content (e.g., `{activeTab === 'overview' && <OverviewTab />}`), screen readers may not announce the active panel properly if each panel is conditionally mounted without a wrapper. The standard WAI-ARIA tab pattern expects the `role="tabpanel"` element to be clearly associated with the active `role="tab"`.
**Action:** Always wrap conditionally rendered tab content in a single persistent container with `role="tabpanel"`, `id={`tabpanel-${activeTab}`}`, and `aria-labelledby={`tab-${activeTab}`}` to ensure robust screen-reader support.

## 2025-05-24 - Screen-Reader Tab Accessibility with React Conditional Rendering
**Learning:** When using React conditional rendering for tab content (e.g., `{activeTab === 'overview' && <OverviewTab />}`), wrapping all conditionally rendered panels inside a single `div` that dynamically changes its `id` and `aria-labelledby` based on the active tab breaks the WAI-ARIA tab pattern. Screen readers can lose context of the active tabpanel if the `tabpanel` does not have a stable ID corresponding to the `aria-controls` of the tabs.
**Action:** Always wrap each individual conditionally rendered tab panel component in its own static `<div role="tabpanel" id="tabpanel-[name]" aria-labelledby="tab-[name]">` container to ensure robust screen-reader support and prevent dangling `aria-controls` references on inactive tabs.

## 2025-05-24 - Screen-Reader Tab Accessibility on Deeply Nested Tabs
**Learning:** Sub-tab navigations deep within a UI (such as those appearing conditionally after authentication) often miss WAI-ARIA tab attributes because developers treat them as generic toggle buttons rather than primary navigation. This causes screen readers to announce them merely as buttons, hiding their relationship to the panels below.
**Action:** When implementing sub-tab toggles, ensure standard WAI-ARIA tab patterns are applied: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, and individual static `role="tabpanel"` wrappers for conditionally rendered content sections.
