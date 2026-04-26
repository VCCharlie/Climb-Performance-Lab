
## 2024-04-26 - Icon-Only Button Accessibility Pattern in Modals
**Learning:** Found an icon-only close button (`<X size={20} />`) in `ActivityDetailModal.jsx` that lacked an `aria-label` and keyboard focus states. This pattern of using Lucide icons directly as children of buttons without screen reader text or focus indicators severely harms accessibility.
**Action:** Always add `aria-label` to buttons containing only icons. Use Tailwind's `focus-visible:ring-2 focus-visible:ring-[color] focus:outline-none` pattern to ensure clear visual focus indicators for keyboard navigation while avoiding default outlines on mouse click.
