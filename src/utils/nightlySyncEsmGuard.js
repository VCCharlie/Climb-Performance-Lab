/**
 * Static guard: relative ESM imports under scripts/nightlySync.js must use explicit .js extensions.
 * Prevents GitHub Actions nightly job failing at runtime (Node ESM resolution).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NIGHTLY_ENTRY = path.join(REPO_ROOT, 'scripts/nightlySync.js');

const IMPORT_RE = /^\s*import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]\s*;?\s*$/gm;

/**
 * @param {string} filePath absolute path to a .js file
 * @returns {string[]} absolute paths of local dependencies
 */
function localImportsFromFile(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const dir = path.dirname(filePath);
    /** @type {string[]} */
    const out = [];
    let match;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(text)) !== null) {
        const spec = match[1];
        if (!spec.startsWith('.') && !spec.startsWith('/')) continue;
        const resolved = path.resolve(dir, spec);
        out.push(resolved);
    }
    return out;
}

/**
 * @param {string} [entryPath]
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function verifyNightlySyncEsmImports(entryPath = NIGHTLY_ENTRY) {
    /** @type {string[]} */
    const errors = [];
    /** @type {Set<string>} */
    const queue = new Set([entryPath]);
    /** @type {Set<string>} */
    const seen = new Set();

    while (queue.size > 0) {
        const current = queue.values().next().value;
        queue.delete(current);

        const normalized = path.normalize(current);
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        if (!fs.existsSync(normalized)) {
            errors.push(`Missing module file: ${path.relative(REPO_ROOT, normalized)}`);
            continue;
        }

        let stat;
        try {
            stat = fs.statSync(normalized);
        } catch {
            errors.push(`Cannot stat: ${path.relative(REPO_ROOT, normalized)}`);
            continue;
        }

        if (stat.isDirectory()) {
            const indexJs = path.join(normalized, 'index.js');
            if (fs.existsSync(indexJs)) {
                queue.add(indexJs);
            } else {
                errors.push(`Directory import without index.js: ${path.relative(REPO_ROOT, normalized)}`);
            }
            continue;
        }

        if (!normalized.endsWith('.js')) {
            errors.push(`Local import target must be a .js file: ${path.relative(REPO_ROOT, normalized)}`);
            continue;
        }

        for (const dep of localImportsFromFile(normalized)) {
            if (dep.startsWith(REPO_ROOT) && !dep.endsWith('.js')) {
                let depStat = null;
                try {
                    if (fs.existsSync(dep)) {
                        depStat = fs.statSync(dep);
                    }
                } catch {
                    depStat = null;
                }

                if (depStat?.isDirectory()) {
                    errors.push(
                        `Import resolves to a directory (use explicit .js file): ${path.relative(REPO_ROOT, normalized)} → ${path.relative(REPO_ROOT, dep)}`,
                    );
                } else if (!depStat) {
                    const withJs = `${dep}.js`;
                    if (fs.existsSync(withJs)) {
                        errors.push(
                            `Import missing .js extension: ${path.relative(REPO_ROOT, normalized)} → ${path.relative(REPO_ROOT, dep)} (use ${path.relative(path.dirname(normalized), withJs)})`,
                        );
                    } else {
                        errors.push(
                            `Unresolved local import: ${path.relative(REPO_ROOT, normalized)} → ${path.relative(REPO_ROOT, dep)}`,
                        );
                    }
                }
            }
            queue.add(dep.endsWith('.js') ? dep : `${dep}.js`);
        }
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Collect absolute paths of all local .js modules reachable from the nightly sync entry.
 * @param {string} [entryPath]
 * @returns {string[]}
 */
export function collectNightlySyncModulePaths(entryPath = NIGHTLY_ENTRY) {
    /** @type {Set<string>} */
    const queue = new Set([entryPath]);
    /** @type {Set<string>} */
    const seen = new Set();

    while (queue.size > 0) {
        const current = queue.values().next().value;
        queue.delete(current);

        const normalized = path.normalize(current);
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        if (!fs.existsSync(normalized)) continue;

        let stat;
        try {
            stat = fs.statSync(normalized);
        } catch {
            continue;
        }

        if (stat.isDirectory()) {
            const indexJs = path.join(normalized, 'index.js');
            if (fs.existsSync(indexJs)) queue.add(indexJs);
            continue;
        }

        if (!normalized.endsWith('.js')) continue;

        for (const dep of localImportsFromFile(normalized)) {
            if (dep.startsWith(REPO_ROOT)) {
                queue.add(dep.endsWith('.js') ? dep : `${dep}.js`);
            }
        }
    }

    return [...seen].filter((p) => p.endsWith('.js') && fs.existsSync(p));
}

/**
 * Flag direct `import.meta.env.FOO` access (without `?.`) in the nightly sync module graph.
 * Node ESM does not define `import.meta.env`; Vite injects it only in browser builds.
 * @param {string} [entryPath]
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function verifyNightlySyncImportMetaSafe(entryPath = NIGHTLY_ENTRY) {
    /** @type {string[]} */
    const errors = [];

    for (const filePath of collectNightlySyncModulePaths(entryPath)) {
        const rel = path.relative(REPO_ROOT, filePath);
        const lines = fs.readFileSync(filePath, 'utf8').split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.includes('import.meta.env.')) continue;
            if (line.includes('import.meta.env?.')) continue;
            errors.push(`${rel}:${i + 1}: use import.meta.env?.PROP or isViteDevBuild() — Node nightly sync has no Vite env`);
        }
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
