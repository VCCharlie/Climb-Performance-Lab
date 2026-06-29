## 2026-04-24 - Speed up sorting of ISO dates
**Learning:** Comparing ISO date strings natively (`a.date < b.date`) instead of parsing them first via `new Date(a.date).getTime()` is extremely fast (around ~20x faster in Node.js/V8) and removes unnecessary overhead from the garbage collector during sorting, particularly when rendering tables or dashboards that sort large activity datasets multiple times on changes.
**Action:** When working with ISO formatted string dates, especially in frequently executed `.sort()` logic, use string comparison directly: `(a, b) => a < b ? -1 : (a > b ? 1 : 0)`.

## 2026-05-24 - Batched API Calls to Prevent Rate Limits

**Learning:** When fetching data via APIs (like Strava), sending too many concurrent requests using `Promise.all` can trigger rate limits or browser connection exhaustion.
**Action:** Use the `runInBatches` utility (from `src/utils`) instead of `Promise.all` to limit concurrent requests and improve reliability.

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

## 2026-05-29 - Batched API Calls for Gear Fetching
**Learning:** In DataHub.jsx, fetching gear details from Strava concurrently using Promise.all can cause rate limits and exhaust browser connections if the user has many bikes or gears.
**Action:** Replaced Promise.all with the local runInBatches utility to chunk external API requests and prevent throttling issues.## 2024-05-24 - [Avoid Spread Operator with Large Arrays in Math.max/min]
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
## 2026-05-25 - Extract expensive string operations from loops
**Learning:** In React components like `ActivityLogTab.jsx`, calling methods like `.toLowerCase()` inside array iteration callbacks (e.g., `array.filter`) for static values like a search query creates O(N) redundant string allocations and overhead.
**Action:** Pre-compute the transformed value outside the loop (e.g. `const lowerSearch = search.toLowerCase();`) to reduce the inner loop's complexity and improve rendering performance during rapid typing.
## 2025-05-26 - Hoisting repeated string operations out of React array iteration
**Learning:** In hot rendering paths like `useActivityFilter.js`, performing operations like `string.toLowerCase()` *inside* the array `.filter()` callback forces the runtime to re-allocate and process the string repeatedly for every item (O(N)). In an application that processes large numbers of activities on the client-side, this quickly becomes a hidden performance drain during every keystroke of a search input.
**Action:** Always hoist variables that rely solely on external state (like the search query) outside of iteration callbacks. Evaluate them once before the loop (O(1)) and pass the pre-computed value in.
## 2026-05-27 - Regex extraction instead of Date parsing inside loops
**Learning:** Instantiating `new Date(string)` inside hot filtering loops (like array.filter for search) to extract `getFullYear`, `getMonth`, or `getDate` generates massive memory overhead and reduces responsiveness for client-side search across thousands of records. Using regex capture groups (like `String(date).match(/^(\d{4})-(\d{2})-(\d{2})/`) to slice ISO-formatted dates is exponentially faster and reduces garbage collection pauses.
**Action:** Replace `new Date(dateString)` in hot iteration loops (such as filtering or mapping large activity arrays) with regex string extraction when you only need to read the year, month, and day parts, keeping the `new Date` call strictly as a fallback.
## 2026-06-25 - Avoid O(N^2) array.filter in pagination loops
**Learning:** Calling `array.filter` on an accumulated array inside a pagination while-loop (e.g. `allActivities.concat(data); allActivities.filter(...)`) recalculates the filter across the entire growing array repeatedly. This results in $O(N^2)$ time complexity as the array grows.
**Action:** Filter only the *newly fetched page data* (`data.filter(...)`) and add it to a running accumulator variable, keeping the complexity at $O(N)$.
## 2026-06-08 - Enforce Explicit Code Discovery Before Planning
**Learning:** Generating an execution plan that references internal file code structures (like variable names, specific loops, or specific hooks) before those structures have been explicitly revealed by a terminal command like `sed`, `cat`, or `grep` will be rejected due to a Groundedness Rule violation. Relying purely on partial trace outputs or assumptions leads to required plan revisions.
**Action:** When creating or revising a plan, ensure all referenced code elements have been concretely and completely revealed in the terminal output trace. Use targeted tools like `sed -n 'X,Yp' filename` to fetch required file chunks completely before planning rather than relying on truncated previews.

## 2024-05-24 - Avoid O(N * M) multiple array.filter.length calls in useMemo
**Learning:** In React components (like `BucketList.jsx`), executing multiple `.filter(...).length` statements sequentially inside a `useMemo` block creates unnecessary intermediate array allocations and causes O(N * M) time complexity where N is the data length and M is the number of filters.
**Action:** Replace sequential `.filter(...).length` calls with a single `for...of` loop to calculate multiple metrics simultaneously in one pass over the data, which reduces it to O(N) complexity and completely avoids intermediate array instantiations.

## 2024-05-18 - Single-pass reduce over chained array methods
**Learning:** Using chained array methods like `.filter().map()` or `.map().filter()` creates intermediate array allocations. For potentially large arrays, this can affect performance and increase memory usage.
**Action:** Replace chained array iteration methods with a single-pass `Array.prototype.reduce()` to track the desired output and avoid intermediate array allocations.

## 2024-06-13 - Optimize Math.max with Array.prototype.map and spread syntax
**Learning:** Using `Math.max(0, ...data.map(...))` on potentially large arrays can result in 'RangeError: Maximum call stack size exceeded' and causes unnecessary memory allocations due to intermediate array creation.
**Action:** Replace `Math.max(...array.map(...))` with a single-pass `reduce` call (e.g. `array.reduce((max, item) => Math.max(max, item.value), 0)`). This provides an O(n) calculation without the overhead of intermediate object creation.

## 2024-05-18 - Single-pass for...of loop over multiple filter().length
**Learning:** Using multiple `.filter().length` calls consecutively on the same array to calculate distinct counters causes redundant full iterations over the dataset and creates unnecessary intermediate array allocations, resulting in O(N * M) performance overhead and increased memory churn.
**Action:** Replace consecutive `.filter().length` statements with a single `for...of` loop or `.reduce()` to iterate the dataset exactly once, incrementing multiple counters simultaneously (O(N)).

## 2024-05-18 - Avoid nested O(N*M) array.find for time-threshold matching
**Learning:** Using `array.find()` inside a loop to match items based on a time threshold (e.g., `Math.abs(actTime - sTime) < 900000`) creates an O(N*M) time complexity, which can severely block the main thread for large datasets. Direct `Map` lookups aren't possible because the match is a range, not an exact key.
**Action:** Use a time-bucketed Map strategy. Pre-compute a Map where keys are bucket indices (e.g., `Math.floor(time / 900000)`). Inside the loop, calculate the target bucket and search only within `bucket - 1`, `bucket`, and `bucket + 1`. This reduces the search space to a constant number, lowering overall time complexity to O(N + M).
## 2026-06-25 - Avoid O(N*M) chained array methods inside mapping operations
**Learning:** Using chained array methods like `.map().filter().sort()` inside another array mapping operation (e.g. `arrayA.map(a => arrayB.map(...).filter(...).sort(...))`) creates O(N * M) time complexity and severe performance degradation, allocating huge amounts of intermediate arrays in memory.
**Action:** Pre-calculate needed data from the inner array in a single O(M) pass, and inside the outer mapping loop, use a standard `for...of` loop to determine the desired metric (like a minimum score) while skipping redundant array allocations.

## 2026-06-25 - Use single pass to avoid O(N) intermediate array iterations
**Learning:** In utility functions computing summary metrics (like `summarizeActivityWindow`), chaining or consecutive calls of `.reduce()` and `.filter()` result in unnecessary complete O(N) array iterations for every single metric and trigger repeated unneeded intermediate iterations.
**Action:** Replace multiple separate array passes with a single `for...of` loop to aggregate multiple metrics at once in an O(N) complexity overall, reducing memory footprint and main thread blocking.
