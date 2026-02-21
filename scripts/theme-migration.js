import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');

// Function to recursively find all JSX/JS files
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach((file) => {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });

    return arrayOfFiles;
}

// Migration rules mapping old classes to new ones based on Cycling-Dashboard theme
const MIGRATION_RULES = [
    // Backgrounds
    { regex: /bg-slate-950/g, replacement: 'bg-cdbg' },
    { regex: /bg-slate-900/g, replacement: 'bg-cdbg' },
    { regex: /bg-slate-800\/50/g, replacement: 'bg-cdsurface/80' },
    { regex: /bg-slate-800\/80/g, replacement: 'bg-cdsurface/80' },
    { regex: /bg-slate-800/g, replacement: 'bg-cdsurface' },
    { regex: /bg-slate-700\/50/g, replacement: 'bg-cdborder/50' },
    { regex: /bg-slate-700/g, replacement: 'bg-cdborder' },
    { regex: /bg-gray-800/g, replacement: 'bg-cdsurface' },
    { regex: /bg-gray-900/g, replacement: 'bg-cdbg' },

    // Text Colors
    { regex: /text-slate-100/g, replacement: 'text-cdtext' },
    { regex: /text-slate-200/g, replacement: 'text-cdtext' },
    { regex: /text-slate-300/g, replacement: 'text-cdtext' },
    { regex: /text-slate-400/g, replacement: 'text-cdmuted' },
    { regex: /text-slate-500/g, replacement: 'text-cdmuted' },
    { regex: /text-gray-200/g, replacement: 'text-cdtext' },
    { regex: /text-gray-300/g, replacement: 'text-cdtext' },
    { regex: /text-gray-400/g, replacement: 'text-cdmuted' },
    { regex: /text-white/g, replacement: 'text-cdtext' }, // Needs manual review usually, but good conservative default for dark-mode apps

    // Borders
    { regex: /border-slate-700/g, replacement: 'border-cdborder' },
    { regex: /border-slate-800/g, replacement: 'border-cdborder' },
    { regex: /border-slate-600/g, replacement: 'border-cdborder' },
    { regex: /border-gray-700/g, replacement: 'border-cdborder' },
    { regex: /border-gray-800/g, replacement: 'border-cdborder' },
    { regex: /divide-slate-700/g, replacement: 'divide-cdborder' },
    { regex: /divide-slate-800/g, replacement: 'divide-cdborder' },

    // Hover states
    { regex: /hover:bg-slate-700/g, replacement: 'hover:bg-slate-50' },
    { regex: /hover:bg-slate-800/g, replacement: 'hover:bg-slate-50' },
    { regex: /hover:text-white/g, replacement: 'hover:text-cdaccent' },
];

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    MIGRATION_RULES.forEach((rule) => {
        content = content.replace(rule.regex, rule.replacement);
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.relative(SRC_DIR, filePath)}`);
    }
}

function runMigration() {
    console.log('Starting Tailwind class migration...');
    const files = getAllFiles(SRC_DIR);

    files.forEach((file) => {
        migrateFile(file);
    });

    console.log('Migration completed.');
}

runMigration();
