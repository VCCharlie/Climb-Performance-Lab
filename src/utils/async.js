/**
 * src/utils/async.js
 * Helpers voor asynchrone bewerkingen
 */

/**
 * Voert een array van taken (functies) uit in batches.
 * Handig om browser throttling of API rate limiting te voorkomen.
 * 
 * @param {Array} items - De data items om te verwerken
 * @param {number} batchSize - Hoeveel items tegelijk
 * @param {Function} taskFn - Functie die een item verwerkt (moet Promise teruggeven)
 */
export const runInBatches = async (items, batchSize, taskFn) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(taskFn));
        results.push(...batchResults);
    }
    return results;
};
