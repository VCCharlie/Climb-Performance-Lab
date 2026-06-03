## 2024-04-24 - Cross-Site Scripting (XSS) in `FlagIcon.jsx`
**Vulnerability:** A vulnerability was discovered in the `FlagIcon.jsx` component where `innerHTML` was dynamically constructed to render a country name fallback string upon image load error. A maliciously crafted `country` string like `<img src=x onerror=alert(1)>` would execute inline JS within the application.
**Learning:** React patterns that directly manipulate the DOM (like `e.target.parentElement.innerHTML = ...`) break the safety of React and bypass its automatic XSS protections. These are easily exploitable.
**Prevention:** Remove manual DOM manipulations, replacing them with React state (e.g., tracking `imageError` with `useState`) and standard JSX rendering. Reset error state when the input changes by remounting the image subtree (e.g., `key={country}`) rather than calling `setState` inside `useEffect`.

## 2026-04-25 - [Remove hardcoded Firebase API key]
**Vulnerability:** The Firebase configuration in `src/firebase.js` contained a hardcoded API key (`AIzaSyBNWzcEXhzra-iCkHiZj_FdYUf0NcKvHAk`).
**Learning:** Hardcoding credentials, even if client-side API keys are sometimes considered less sensitive depending on the service's configuration, is a poor security practice. It exposes credentials in source control and makes rotation difficult.
**Prevention:** Always extract API keys and secrets into environment variables. In Vite-based applications, use `import.meta.env` to inject configuration values securely during the build process, and ensure `.env` files are added to `.gitignore`.

## 2025-04-26 - Add Explicit Noopener Noreferrer to External Links
**Vulnerability:** External links opening in a new tab (`target="_blank"`) without explicit `rel="noopener noreferrer"` attributes.
**Learning:** While modern browsers often implicitly apply `noopener` to `target="_blank"` links, older browsers do not, and explicit declaration remains a security best practice to prevent Reverse Tabnabbing. React/JSX linters will flag this if explicitly omitted or incorrectly formatted. A common mistake during regex updates is creating duplicate `rel` attributes if a file had `rel="noopener"` on a separate line below `target="_blank"`.
**Prevention:** Use strict AST parsing or careful multi-line regex when globally replacing link attributes in JSX to prevent duplicate attribute syntax errors. Always verify builds with `npm run build` or linters to catch JSX syntax errors immediately.

## 2026-04-25 - [Sensitive Data Exposure in Console Logs]
**Vulnerability:** The application was logging the full configuration objects (`intervalsConfig` and `stravaConfig`) to the browser console when saving settings to the cloud (`src/App.jsx`). This included sensitive information such as the `apiKey` and `client_secret`.
**Learning:** Console logs are accessible to any script running on the page, including third-party scripts. Logging sensitive information, even temporarily for debugging purposes, exposes credentials and can lead to unauthorized access or data breaches.
**Prevention:** Always sanitize objects before logging them to the console. Explicitly redact or exclude sensitive fields (like passwords, API keys, and secrets) from the data being logged.

## 2024-11-20 - [Sensitive Data Exposure in Console Logs - User Settings]
**Vulnerability:** Similar to previous config leaks, the application was logging the full `userSettings` object to the browser console when saving settings to the cloud (`src/App.jsx`). This included sensitive information such as the `githubPat` and `openweatherApiKey`.
**Learning:** When adding new sensitive configurations to an existing settings object, it's easy to forget to update the corresponding console log sanitization steps, especially if they are logged in bulk (e.g. `body: userSettings`).
**Prevention:** Apply strict property picking for logs instead of logging the full object, or explicitly redact newly added secrets within the logging payload.

## 2024-05-18 - Prevent Reverse Tabnabbing Vulnerabilities
**Vulnerability:** External links created with `target="_blank"` did not include the `rel="noopener noreferrer"` attribute across the application.
**Learning:** This exposes the application to reverse tabnabbing, a security risk where the newly opened tab can potentially manipulate the original page (e.g. via `window.opener.location`), leading to phishing or redirection attacks.
**Prevention:** Ensure that every anchor tag utilizing `target="_blank"` natively includes `rel="noopener noreferrer"`.
## 2026-04-29 - Overly Permissive CORS Policy Fixed
**Vulnerability:** The Python cloud function (`sync-intervals`) had an overly permissive CORS policy set with `Access-Control-Allow-Origin: *`, allowing potential unauthorized cross-origin requests.
**Learning:** Hardcoding wildcard CORS domains can expose server resources to unwanted domains. Allowing it dynamically via whitelists read from environment variables ensures security and portability across environments. Additionally, returning `Vary: Origin` prevents caching systems from returning cached wildcard/wrong origin responses.
**Prevention:** Implement checks on the `Origin` header from incoming requests. Reflect the `Origin` header dynamically back into `Access-Control-Allow-Origin` if it's explicitly matched within an `ALLOWED_CORS_ORIGINS` environment variable whitelist. If it doesn't match, gracefully fall back to the first allowed origin or drop the header. Add `Vary: Origin` for correctly handled responses.

## 2026-05-01 - [Add missing CSRF token validation to Strava OAuth]
**Vulnerability:** The Strava OAuth flow implemented in `src/hooks/useStravaAuth.js` lacked validation of the `state` parameter, leaving the application vulnerable to Cross-Site Request Forgery (CSRF).
**Learning:** During OAuth, without a `state` parameter properly generated and verified, an attacker can trick a user into logging into the attacker’s account, or similarly disrupt the intended user’s account linking state. A cryptographically secure random value must be generated before redirecting to the authorization server and strictly validated upon the return redirect.
**Prevention:** Always append a `state` parameter derived from a cryptographically secure RNG (`crypto.getRandomValues`) to the OAuth request and verify that the returned `state` parameter exactly matches the one stored in `sessionStorage` (or another secure mechanism) before processing the code grant.

## 2025-02-27 - [Sensitive Data Exposure in Console Logs - OAuth Tokens]
**Vulnerability:** The application was logging `stravaConfig` to the browser console when saving settings to the cloud (`src/App.jsx`). While `client_secret` was redacted, the `access_token` and `refresh_token` were not.
**Learning:** When redacting sensitive configuration objects for logging, it's easy to overlook fields that are populated later or dynamically (like OAuth tokens obtained after the initial setup), focusing only on the manually entered secrets (like client secrets).
**Prevention:** Thoroughly review all fields within an object being logged, considering its state across the entire application lifecycle, not just its initial shape. Redact all forms of credentials, including short-lived and long-lived tokens.

## 2024-05-24 - [Replace Insecure Math.random for ID Generation]
**Vulnerability:** The application was using `Math.random().toString(36)` to generate pseudo-random IDs for activities in `src/utils/intervals.js` and `src/utils/parsers.js`.
**Learning:** `Math.random()` is not cryptographically secure, and the IDs it generates are predictable and more prone to collisions than true UUIDs. When creating unique identifiers, especially for objects that may be stored or synchronized, it's safer and more robust to use standardized UUIDs.
**Prevention:** Use `crypto.randomUUID()` when generating unique identifiers in modern browser environments or Node.js. It generates a cryptographically secure UUIDv4 string directly.

## 2026-05-01 - Add rel="noopener noreferrer" to external attribution links
**Vulnerability:** External OpenStreetMap attribution links in Leaflet map components lacked `rel="noopener noreferrer"`, introducing a Reverse Tabnabbing risk when users clicked them.
**Learning:** Leaflet `L.tileLayer` config typically receives an HTML string for attribution. These statically defined external links are just as vulnerable to Reverse Tabnabbing as JSX anchor tags and must be manually secured when passed as strings.
**Prevention:** When injecting static HTML strings that contain external links into 3rd-party libraries (like Leaflet or chart configs), always ensure `target="_blank"` is accompanied by `rel="noopener noreferrer"`.

## 2026-05-11 - [Hardcoded Firebase API Key Removal]
**Vulnerability:** A hardcoded API key for Firebase (`AIzaSyBNWzcEXhzra-iCkHiZj_FdYUf0NcKvHAk`) was discovered in `src/firebase.js`.
**Learning:** Hardcoding credentials, even if client-side API keys are sometimes considered less sensitive depending on the service's configuration, is a poor security practice. It exposes credentials in source control and makes rotation difficult.
**Prevention:** Always extract API keys and secrets into environment variables. In Vite-based applications, use `import.meta.env` to inject configuration values securely during the build process. Ensure `.env` files are added to `.gitignore`.
## 2026-05-14 - [Fix overly permissive CORS configuration]
**Vulnerability:** The Python cloud function previously included an overly permissive CORS setup that allowed the wildcard `*` origin and failed to correctly drop CORS response headers for unmatched origins, risking unwanted cross-origin access.
**Learning:** Proper implementation of CORS logic must explicitly reject wildcards for sensitive endpoints, and when an origin is unmatched against the allowlist, the server should completely omit the `Access-Control-Allow-Origin` header rather than falling back to a default allowed origin.
**Prevention:** Strictly validate incoming `Origin` headers against a defined list, omitting CORS response headers entirely if the validation fails.

## 2026-05-26 - [Sensitive Data Exposure in Console Logs - User Settings]
**Vulnerability:** Similar to previous config leaks, the application was logging the full `userSettings` object to the browser console when saving settings to the cloud (`src/App.jsx`). This included sensitive information such as the `githubPat` and `openweatherApiKey`.
**Learning:** When adding new sensitive configurations to an existing settings object, it's easy to forget to update the corresponding console log sanitization steps, especially if they are logged in bulk (e.g. `body: userSettings`).
**Prevention:** Apply strict property picking for logs instead of logging the full object, or explicitly redact newly added secrets within the logging payload.

## 2026-06-05 - [Sensitive Data Serialization - OAuth Tokens]
**Vulnerability:** The application was serializing the full `stravaConfig` object to the cloud database when saving settings (`src/App.jsx`). While `client_secret` was redacted, the `access_token` and `refresh_token` were inadvertently being sent to the database.
**Learning:** When redacting sensitive configuration objects for persistence, it's critical to redact all forms of credentials, including OAuth tokens (access and refresh tokens). Focusing only on manually entered secrets like `client_secret` leaves dynamically obtained tokens exposed in the database payload.
**Prevention:** Thoroughly review all fields within an object being serialized to the database. Explicitly redact all forms of credentials, including short-lived and long-lived OAuth tokens, alongside primary secrets.
