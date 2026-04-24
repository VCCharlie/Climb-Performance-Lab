/**
 * Calculate a rolling average for a dataset.
 * @param {Array} data - Array of objects (e.g. { date, ftp, load })
 * @param {String} key - Key to average (e.g. 'ftp')
 * @param {Number} windowSize - Number of items (or days) to average
 * @returns {Array} - Data with new property `${key}_avg`
 */
export const calculateRollingAverage = (data, key, windowSize = 30) => {
    if (!data || data.length === 0) return [];

    // Sort by date just in case
    // Optimization: use string comparison for ISO dates to speed up sort
    const sorted = [...data].sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));

    return sorted.map((item, index) => {
        // Get window of items ending at current index
        // Limit start to avoid negative index
        const start = Math.max(0, index - windowSize + 1);
        const subset = sorted.slice(start, index + 1);

        const sum = subset.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
        const avg = sum / subset.length;

        return {
            ...item,
            [`${key}_avg`]: Math.round(avg)
        };
    });
};

/**
 * Calculate Linear Regression Trend Line (y = mx + b)
 * @param {Array} data - Array of objects
 * @param {String} key - Key to analyze
 * @returns {Array} - Data with new property `${key}_trend`
 */
export const calculateTrendLine = (data, key) => {
    if (!data || data.length < 2) return data;

    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    // We use index as X because date gaps might skew a strictly linear visual rep 
    // but for time-series usually X is timestamp. Let's use timestamp for accuracy.
    const points = data.map(d => ({
        x: new Date(d.date).getTime(),
        y: Number(d[key]) || 0
    }));

    points.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += (p.x * p.y);
        sumXX += (p.x * p.x);
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map(d => {
        const x = new Date(d.date).getTime();
        const y = slope * x + intercept;
        return {
            ...d,
            [`${key}_trend`]: Math.round(y)
        };
    });
};

/**
 * Optimize data for charting - enrich with rolling avg and trend
 */
export const enrichChartData = (data) => {
    let result = data.map(d => ({ ...d, date: new Date(d.date).getTime() })); // Convert date to timestamp

    result = calculateRollingAverage(result, 'ftp', 30);
    result = calculateRollingAverage(result, 'eFTP', 30); // NEW: Rolling avg for eFTP

    result = calculateTrendLine(result, 'ftp');
    result = calculateTrendLine(result, 'eFTP'); // NEW: Trend for eFTP
    result = calculateTrendLine(result, 'load');
    return result;
};
