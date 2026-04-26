## 2024-04-24 - Cross-Site Scripting (XSS) in `FlagIcon.jsx`
**Vulnerability:** A vulnerability was discovered in the `FlagIcon.jsx` component where `innerHTML` was dynamically constructed to render a country name fallback string upon image load error. A maliciously crafted `country` string like `<img src=x onerror=alert(1)>` would execute inline JS within the application.
**Learning:** React patterns that directly manipulate the DOM (like `e.target.parentElement.innerHTML = ...`) break the safety of React and bypass its automatic XSS protections. These are easily exploitable.
**Prevention:** Remove manual DOM manipulations, replacing them with React state (e.g., tracking `imageError` with `useState`) and standard JSX rendering. Reset error state when the input changes by remounting the image subtree (e.g., `key={country}`) rather than calling `setState` inside `useEffect`.

## 2026-04-25 - [Remove hardcoded Firebase API key]
**Vulnerability:** The Firebase configuration in `src/firebase.js` contained a hardcoded API key (`AIzaSyBNWzcEXhzra-iCkHiZj_FdYUf0NcKvHAk`).
**Learning:** Hardcoding credentials, even if client-side API keys are sometimes considered less sensitive depending on the service's configuration, is a poor security practice. It exposes credentials in source control and makes rotation difficult.
**Prevention:** Always extract API keys and secrets into environment variables. In Vite-based applications, use `import.meta.env` to inject configuration values securely during the build process, and ensure `.env` files are added to `.gitignore`.
