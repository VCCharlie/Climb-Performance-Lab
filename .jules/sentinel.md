## 2024-04-23 - [Fix DOM-based XSS in React Component]
**Vulnerability:** A `FlagIcon` React component used `e.target.parentElement.innerHTML` to mutate the DOM when an image `onError` event fired, incorporating an unescaped prop into the string.
**Learning:** Even in modern frontend frameworks like React that usually escape text automatically, falling back to direct DOM manipulation APIs like `innerHTML` completely bypasses these protections and opens up XSS vectors. It also causes stability issues as it destroys React's Virtual DOM representation.
**Prevention:** Always use framework-native state management (e.g. `useState` in React) for UI updates. Avoid direct DOM manipulation (like `innerHTML`, `outerHTML`, or `dangerouslySetInnerHTML`) unless absolutely necessary and only with thoroughly sanitized data.

## 2026-04-25 - [Remove hardcoded Firebase API key]
**Vulnerability:** The Firebase configuration in `src/firebase.js` contained a hardcoded API key (`AIzaSyBNWzcEXhzra-iCkHiZj_FdYUf0NcKvHAk`).
**Learning:** Hardcoding credentials, even if client-side API keys are sometimes considered less sensitive depending on the service's configuration, is a poor security practice. It exposes credentials in source control and makes rotation difficult.
**Prevention:** Always extract API keys and secrets into environment variables. In Vite-based applications, use `import.meta.env` to inject configuration values securely during the build process, and ensure  files are added to `.gitignore`.


## 2024-04-25 - [Remove hardcoded Firebase API key]
**Vulnerability:** The Firebase configuration in `src/firebase.js` contained a hardcoded API key (`AIzaSyBNWzcEXhzra-iCkHiZj_FdYUf0NcKvHAk`).
**Learning:** Hardcoding credentials, even if client-side API keys are sometimes considered less sensitive depending on the service's configuration, is a poor security practice. It exposes credentials in source control and makes rotation difficult.
**Prevention:** Always extract API keys and secrets into environment variables. In Vite-based applications, use `import.meta.env` to inject configuration values securely during the build process, and ensure `.env` files are added to `.gitignore`.
