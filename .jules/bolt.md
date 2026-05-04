## 2026-04-24 - Speed up sorting of ISO dates
**Learning:** Comparing ISO date strings natively (`a.date < b.date`) instead of parsing them first via `new Date(a.date).getTime()` is extremely fast (around ~20x faster in Node.js/V8) and removes unnecessary overhead from the garbage collector during sorting, particularly when rendering tables or dashboards that sort large activity datasets multiple times on changes.
**Action:** When working with ISO formatted string dates, especially in frequently executed `.sort()` logic, use string comparison directly: `(a, b) => a < b ? -1 : (a > b ? 1 : 0)`.

## 2026-05-24 - Batched API Calls to Prevent Rate Limits\n\n**Learning:** When fetching data via APIs (like Strava), sending too many concurrent requests using `Promise.all` can trigger rate limits or browser connection exhaustion.\n**Action:** Use the `runInBatches` utility (from `src/utils`) instead of `Promise.all` to limit concurrent requests and improve reliability.

## 2026-06-25 - Date comparison performance in loops
**Learning:** Instantiating `new Date(d.date)` within `array.filter()` or `.map()` loops is significantly slower than string lexicographical comparison when parsing ISO-8601 strings. However, naively comparing raw inputs like `d.date.slice(0, 10)` can crash if `d.date` is unexpectedly a timestamp number or Date object (e.g. from Firebase).
**Action:** When filtering dates by range in loops, compute string bounds outside the loop. Inside the loop, always safely sanitize the date value using a utility (like `normalizeDate` that safely returns `YYYY-MM-DD` strings) before applying lexicographical comparison operators `>=` and `<=`.

## 2026-04-27 - Date.toLocaleString array looping
**Learning:** Calling `Date.toLocaleString()` inside a loop over an array of items is notoriously slow in JavaScript because it repeatedly instantiates the `Intl.DateTimeFormat` API under the hood.
**Action:** Replace this with a simple array index lookup (e.g. `MONTH_ORDER[d.getMonth()]`). It is a classic, highly effective performance optimization.

## 2026-05-28 - O(N) Rolling Average
**Learning:** Found a performance bottleneck in `src/utils/analytics.js` where the rolling average computation had an O(N * W) time complexity due to nested iterations (`map` over array, and `slice().reduce()` inside).
**Action:** Replaced the nested loops with a single-pass O(N) sliding window that maintains a `currentSum`, substantially improving performance, especially on larger data sets.

## 2026-05-29 - Avoid Date.toLocaleString in loops
**Learning:** Calling `Date.toLocaleString()` inside loops or array maps (like chart data generation) creates huge performance bottlenecks because it repeatedly instantiates the `Intl.DateTimeFormat` API. This is especially true for dashboards rendering hundreds of data points.
**Action:** When creating text labels for months/dates inside loops, use array lookups with predefined text strings (e.g., `const NL_MONTHS = ['jan', 'feb', ...]`) and simple string manipulation instead.

## 2026-05-29 - Batched API Calls for Gear Fetching\n**Learning:** In DataHub.jsx, fetching gear details from Strava concurrently using Promise.all can cause rate limits and exhaust browser connections if the user has many bikes or gears.\n**Action:** Replaced Promise.all with the local runInBatches utility to chunk external API requests and prevent throttling issues.## 2024-05-24 - [Avoid Spread Operator with Large Arrays in Math.max/min]
**Learning:** Using the spread operator (`...`) with `Math.max()` or `Math.min()` on potentially large arrays can cause a `RangeError: Maximum call stack size exceeded` because JavaScript engines limit the number of arguments a function can accept. Chaining `.map()` and `.filter()` before spreading also creates unnecessary intermediate arrays, increasing memory usage and garbage collection overhead.
**Action:** Replace `Math.max(0, ...array.map().filter())` with a single-pass `for...of` loop to track the maximum value. This prevents call stack errors, eliminates intermediate array allocations, and is significantly faster for large datasets.
