
import { isSameActivity, findDuplicatesInList } from './utils.js';

console.log("=== STARTING DEDUPLICATION VERIFICATION ===\n");

// 1. Mock Data
const act1 = { id: '1', date: '2024-02-10T10:00:00', type: 'Ride', moving_time: 3600, distance: 30.5 };
const act2 = { id: '2', date: '2024-02-10T10:00:00', type: 'VirtualRide', moving_time: 3605, distance: 30.4 }; // Duplicate (Close time/dist, same day)
const act3 = { id: '3', date: '2024-02-10T15:00:00', type: 'run', moving_time: 1800, distance: 5.0 };
const act4 = { id: '4', date: '2024-02-11T10:00:00', type: 'Ride', moving_time: 3600, distance: 30.5 }; // Different Day

// 2. Test isSameActivity
console.log("Test 1: Identical match (except ID/Source) -> Should be TRUE");
const res1 = isSameActivity(act1, act2);
console.log(`Result: ${res1} [EXPECTED: true]\n`);

console.log("Test 2: Different Type (Ride vs Run) -> Should be FALSE");
const res2 = isSameActivity(act1, act3);
console.log(`Result: ${res2} [EXPECTED: false]\n`);

console.log("Test 3: Different Day -> Should be FALSE");
const res3 = isSameActivity(act1, act4);
console.log(`Result: ${res3} [EXPECTED: false]\n`);

// 3. Test findDuplicatesInList
console.log("Test 4: Find Duplicates in List");
const list = [act1, act2, act3, act4];
const dups = findDuplicatesInList(list);
console.log(`Found ${dups.length} duplicates [EXPECTED: 1 pair]`);
if (dups.length > 0) {
    console.log(`Pair: ${dups[0].a.id} vs ${dups[0].b.id}`);
} else {
    console.log("FAILED: No duplicates found");
}

console.log("\n=== VERIFICATION COMPLETE ===");
