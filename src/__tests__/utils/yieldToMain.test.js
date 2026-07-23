import { describe, it, expect } from 'vitest';
import { yieldToMain } from '../../utils/yieldToMain';

describe('yieldToMain', () => {
    it('resolves and allows the event loop to run', async () => {
        let ran = false;
        const promise = yieldToMain().then(() => {
            ran = true;
        });
        expect(ran).toBe(false);
        await promise;
        expect(ran).toBe(true);
    });
});
