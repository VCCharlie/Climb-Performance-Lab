## 2024-04-24 - Cross-Site Scripting (XSS) in `FlagIcon.jsx`
**Vulnerability:** A vulnerability was discovered in the `FlagIcon.jsx` component where `innerHTML` was dynamically constructed to render a country name fallback string upon image load error. A maliciously crafted `country` string like `<img src=x onerror=alert(1)>` would execute inline JS within the application.
**Learning:** React patterns that directly manipulate the DOM (like `e.target.parentElement.innerHTML = ...`) break the safety of React and bypass its automatic XSS protections. These are easily exploitable.
**Prevention:** Remove manual DOM manipulations, replacing them with React state (e.g., tracking `imageError` with `useState`) and standard JSX rendering.
