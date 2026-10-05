import { describe, it, expect } from 'vitest';
import {
    getActivityDetailNavSlice,
    findActivityByIdInList,
} from '../../utils/activityDetailNavigation.js';

describe('activityDetailNavigation', () => {
    it('getActivityDetailNavSlice returns neighbors in log order', () => {
        const ids = ['a', 'b', 'c'];
        expect(getActivityDetailNavSlice('b', ids)).toEqual({
            index: 1,
            total: 3,
            prevId: 'a',
            nextId: 'c',
        });
        expect(getActivityDetailNavSlice('a', ids).prevId).toBeNull();
        expect(getActivityDetailNavSlice('c', ids).nextId).toBeNull();
    });

    it('findActivityByIdInList resolves activity object', () => {
        const list = [{ id: 'x', title: 'One' }, { id: 42, title: 'Two' }];
        expect(findActivityByIdInList('42', list)?.title).toBe('Two');
        expect(findActivityByIdInList('missing', list)).toBeNull();
    });
});
