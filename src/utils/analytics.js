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

    let currentSum = 0;
    const result = new Array(sorted.length);

    for (let i = 0; i < sorted.length; i++) {
        const val = Number(sorted[i][key]) || 0;
        currentSum += val;

        const startIdx = i - windowSize + 1;
        if (startIdx > 0) {
            currentSum -= Number(sorted[startIdx - 1][key]) || 0;
        }

        const count = Math.min(i + 1, windowSize);
        result[i] = {
            ...sorted[i],
            [`${key}_avg`]: Math.round(currentSum / count)
        };
    }

    return result;
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

    const denominator = n * sumXX - sumX * sumX;
    if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-10) {
        const flatY = Math.round(sumY / n);
        return data.map((d) => ({
            ...d,
            [`${key}_trend`]: flatY,
        }));
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return data.map(d => {
        const x = new Date(d.date).getTime();
        const y = slope * x + intercept;
        const trend = Number.isFinite(y) ? Math.round(y) : Math.round(sumY / n);
        return {
            ...d,
            [`${key}_trend`]: trend,
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
