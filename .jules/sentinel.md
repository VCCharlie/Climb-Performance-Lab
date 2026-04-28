## 2024-04-24 - Cross-Site Scripting (XSS) in `FlagIcon.jsx`
**Vulnerability:** A vulnerability was discovered in the `FlagIcon.jsx` component where `innerHTML` was dynamically constructed to render a country name fallback string upon image load error. A maliciously crafted `country` string like `<img src=x onerror=alert(1)>` would execute inline JS within the application.
**Learning:** React patterns that directly manipulate the DOM (like `e.target.parentElement.innerHTML = ...`) break the safety of React and bypass its automatic XSS protections. These are easily exploitable.
**Prevention:** Remove manual DOM manipulations, replacing them with React state (e.g., tracking `imageError` with `useState`) and standard JSX rendering. Reset error state when the input changes by remounting the image subtree (e.g., `key={country}`) rather than calling `setState` inside `useEffect`.

## 2026-04-25 - [Remove hardcoded Firebase API key]
**Vulnerability:** The Firebase configuration in `src/firebase.js` contained a hardcoded API key (`AIzaSyBNWzcEXhzra-iCkHiZj_FdYUf0NcKvHAk`).
**Learning:** Hardcoding credentials, even if client-side API keys are sometimes considered less sensitive depending on the service's configuration, is a poor security practice. It exposes credentials in source control and makes rotation difficult.
**Prevention:** Always extract API keys and secrets into environment variables. In Vite-based applications, use `import.meta.env` to inject configuration values securely during the build process, and ensure `.env` files are added to `.gitignore`.

## 2026-04-25 - [Sensitive Data Exposure in Console Logs]
**Vulnerability:** The application was logging the full configuration objects (`intervalsConfig` and `stravaConfig`) to the browser console when saving settings to the cloud (`src/App.jsx`). This included sensitive information such as the `apiKey` and `client_secret`.
**Learning:** Console logs are accessible to any script running on the page, including third-party scripts. Logging sensitive information, even temporarily for debugging purposes, exposes credentials and can lead to unauthorized access or data breaches.
**Prevention:** Always sanitize objects before logging them to the console. Explicitly redact or exclude sensitive fields (like passwords, API keys, and secrets) from the data being logged.

## 2024-11-20 - [Sensitive Data Exposure in Console Logs - User Settings]
**Vulnerability:** Similar to previous config leaks, the application was logging the full `userSettings` object to the browser console when saving settings to the cloud (`src/App.jsx`). This included sensitive information such as the `githubPat` and `openweatherApiKey`.
**Learning:** When adding new sensitive configurations to an existing settings object, it's easy to forget to update the corresponding console log sanitization steps, especially if they are logged in bulk (e.g. `body: userSettings`).
**Prevention:** Apply strict property picking for logs instead of logging the full object, or explicitly redact newly added secrets within the logging payload.
