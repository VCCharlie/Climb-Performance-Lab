import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '../../utils/encryptedSecrets';

describe('encryptedSecrets', () => {
    const userId = 'test-user-abc';

    it('round-trips encrypt and decrypt', async () => {
        const plain = 'AIzaSyD_example_key_12345';
        const packed = await encryptSecret(plain, userId);
        expect(packed).toBeTruthy();
        expect(packed).not.toContain(plain);
        const out = await decryptSecret(packed, userId);
        expect(out).toBe(plain);
    });

    it('fails decrypt with wrong user id', async () => {
        const packed = await encryptSecret('secret-key', userId);
        await expect(decryptSecret(packed, 'other-user')).rejects.toThrow();
    });
});
