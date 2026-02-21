const fs = require('fs');
const path = require('path');

const dir = './src';

const replacements = {
    'â„¹ï¸': 'ℹ️',
    'â€¢': '•',
    'BeÃ¯nvloedt': 'Beïnvloedt',
    'Â°C': '°C',
    'Ã©n': 'én',
    'ðŸ’¡': '💡',
    'â˜€ï¸': '☀️',
    'â†’': '→',
    'âš ï¸': '⚠️',
    'âˆž': '∞',
    'â†”': '↔',
    'âœ“': '✓',
    'â­ ': '⭐',
    'â›°ï¸': '⛰️',
    'Ã«': 'ë',
    'ðŸš´': '🚴',
    'ðŸ …': '🏅',
    'ðŸ‘‘': '👑',
    'ðŸ¦…': '🦅',
    'ðŸ‡«ðŸ‡·': '🇫🇷',
    'ðŸ‡®ðŸ‡¹': '🇮🇹',
    'ðŸ‡¨ðŸ‡­': '🇨🇭',
    'ðŸŽ®': '🎮',
    'ðŸ †': '🏆',
    'ðŸ“ˆ': '📈',
    'creÃ«ren': 'creëren',
    'efficiÃ«nt': 'efficiënt',
    'Ã—': '×'
};

function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);
    for (const file of files) {
        const fullPath = path.join(currentPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            for (const [bad, good] of Object.entries(replacements)) {
                if (content.includes(bad)) {
                    content = content.split(bad).join(good);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Fixed encoding in ${fullPath}`);
            }
        }
    }
}

walkDir(dir);
console.log('Done fixing encoding.');
