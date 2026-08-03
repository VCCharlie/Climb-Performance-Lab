/**
 * Client-side encryption for optional cloud-synced secrets (Firestore).
 * Key is derived from the signed-in user's UID — only that account can decrypt.
 * This is not server-side HSM security; it prevents casual exposure in Firestore docs.
 */

const APP_PEPPER = 'cpl-v1-gemini-key-sync';
const PBKDF2_ITERATIONS = 100000;

function encoder() {
    return new TextEncoder();
}

/**
 * @param {string} userId
 */
async function deriveAesKey(userId) {
    if (!userId) throw new Error('User id required for encryption');
    const material = await crypto.subtle.importKey(
        'raw',
        encoder().encode(`${APP_PEPPER}:${userId}`),
        'PBKDF2',
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder().encode(APP_PEPPER),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

function toBase64(bytes) {
    const bin = String.fromCharCode(...new Uint8Array(bytes));
    return btoa(bin);
}

function fromBase64(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

/**
 * @param {string} plaintext
 * @param {string} userId
 * @returns {Promise<string>} base64(iv + ciphertext)
 */
export async function encryptSecret(plaintext, userId) {
    const text = String(plaintext || '').trim();
    if (!text) return '';
    const key = await deriveAesKey(userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder().encode(text),
    );
    const packed = new Uint8Array(iv.length + cipher.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(cipher), iv.length);
    return toBase64(packed);
}

/**
 * @param {string} packedB64
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function decryptSecret(packedB64, userId) {
    const raw = String(packedB64 || '').trim();
    if (!raw) return '';
    const packed = fromBase64(raw);
    if (packed.length < 13) throw new Error('Invalid encrypted payload');
    const iv = packed.slice(0, 12);
    const cipher = packed.slice(12);
    const key = await deriveAesKey(userId);
    const plainBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipher,
    );
    return new TextDecoder().decode(plainBuf);
}
