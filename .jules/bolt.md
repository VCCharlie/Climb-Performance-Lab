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

## $(date +%Y-%m-%d) - Optimize Math.max spread usage
**Learning:** Using `Math.max(...array.map(...))` on potentially large arrays can result in 'RangeError: Maximum call stack size exceeded' and causes unnecessary memory allocations due to intermediate array creation.
**Action:** Replace `Math.max(...array.map(...))` with a single-pass `reduce` call (e.g. `array.reduce((max, item) => Math.max(max, item.value), 0)`).
## 2026-05-30 - Optimize chained array allocations
**Learning:** Chaining `.map().filter().map()` or `.map().filter()` causes unnecessary intermediate array allocations, increasing memory usage and garbage collection pressure, particularly when processing large data sets in React components like `DataHub.jsx`.
**Action:** Replace these chained array operations with a single-pass `.reduce()` to iterate the data only once and populate the accumulator directly, yielding better performance and less memory bloat.

## 2026-06-25 - Avoid O(N) array.find inside iteration loops
**Learning:** Calling `array.find` inside a loop (like `.map()` or `.forEach()`) creates an O(N * M) time complexity. When processing large data sets (like bulk activity syncing or importing), this severely blocks the main thread and causes UI jank.
**Action:** Before the loop, pre-compute a JavaScript `Map` keyed by a unique identifier (e.g. `id`). Inside the loop, replace the `array.find()` with a `map.get()` lookup. This reduces the time complexity to O(N + M).

## 2024-05-10 - Optimizing Map/Filter Chains
**Learning:** Chaining multiple `.map().filter()` calls on large arrays (like `allActivities` when calculating unique gear names) creates unnecessary intermediate array allocations, adding overhead and memory churn.
**Action:** Replace multiple chained `.map().filter()` on hot paths with a single-pass `for...of` loop and a `Set` to track unique entries directly without intermediate arrays.
## 2026-06-25 - Avoid O(N) array.findIndex inside iteration loops
**Learning:** Similar to `array.find`, calling `array.findIndex` inside an array iteration creates an O(N * M) time complexity overhead, particularly noticeable on large loops in React components like `DataHub.jsx`.
**Action:** Pre-compute a `Map` of existing elements keyed by an identifier and use `map.get()` logic to modify elements in place with an O(1) time complexity, and loop over the original array via traditional `for...` loops to maintain indices properly if direct index lookup is required.

## 2026-06-25 - Maintain clean workspaces
**Learning:** Using tools like `cat` to create `.diff` files and patching them directly can leave unwanted garbage files in the repository if not explicitly removed.
**Action:** Always clean up temporary workspace files (e.g., `patch.diff`, `test.js`) created during the development process to avoid inadvertently introducing them into version control.
## 2026-06-25 - Avoid O(N*M) lookups and chained reduce in React Component State Derivations
**Learning:** In React components (like `BucketList.jsx`), deriving complex state (e.g. tracking done items, counting statuses, calculating max scores/totals) through multiple consecutive chained `.filter()`, `.map()`, and nested `.find()` iterations causes enormous GC pressure and algorithmic overhead $O(N \times M)$.
**Action:** Replace multiple sequential array iterations and aggregations with a single `useMemo` block containing a unified `for...of` loop. Pre-compute multiple metrics simultaneously (like counts, totals, maximums) in one pass through the data.
## 2026-05-22 - Avoid redundant aggregate calculations in array.map loops
**Learning:** In React components, performing aggregate calculations like `array.reduce(Math.max)` inside an `array.map` loop is highly inefficient. It recalculates the exact same aggregate value for every element in the array, resulting in O(N²) time complexity and redundant memory allocations. This is particularly wasteful when the aggregate value is a constant for the duration of the loop.
**Action:** Extract aggregate calculations (like `Math.max`, sum, average) so they are computed only once *before* the `array.map` loop. Use an IIFE `(() => { ... })()` or a `useMemo` hook to cleanly scope the extracted variable if it's within a JSX block.
