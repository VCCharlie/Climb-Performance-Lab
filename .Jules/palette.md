
## 2024-04-26 - Icon-Only Button Accessibility Pattern in Modals
**Learning:** Found an icon-only close button (`<X size={20} />`) in `ActivityDetailModal.jsx` that lacked an `aria-label` and keyboard focus states. This pattern of using Lucide icons directly as children of buttons without screen reader text or focus indicators severely harms accessibility.
**Action:** Always add `aria-label` to buttons containing only icons. Use Tailwind's `focus-visible:ring-2 focus-visible:ring-[color] focus:outline-none` pattern to ensure clear visual focus indicators for keyboard navigation while avoiding default outlines on mouse click.

## 2024-04-30 - Modal and Overlay Icon-Only Close Buttons
**Learning:** Verified the previously discovered pattern: icon-only buttons (like close `X` icons) frequently lack `aria-label` and `focus-visible` styling across the application (e.g., in `ReviewModal`, `DuplicateReviewModal`, `SettingsModal`, `ImportModal`, `ClimbSelector`, `ClimbMap`). This limits accessibility for screen readers and keyboard navigation users.
**Action:** Always systematically check for and add `aria-label` and `focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none` to icon-only buttons globally.

## 2024-05-02 - Keyboard Access for Group-Hover Hidden Elements
**Learning:** When using `opacity-0 group-hover:opacity-100` to hide interactive elements (like icon buttons or links) until hovered, these elements become invisible to keyboard users who navigate via Tab. Simply adding `focus-visible:opacity-100` to the child element itself works, but often breaks the visual layout or container spacing because the parent container isn't aware of the focus.
**Action:** Always add `group-focus-within/name:opacity-100` (or `focus-within:opacity-100`) to the container and `focus-visible:opacity-100` to the interactive element to ensure it reliably appears when focused via keyboard navigation, while maintaining the correct layout.
