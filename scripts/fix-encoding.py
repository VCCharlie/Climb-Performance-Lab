import os

directory = './src/components'

replacements = {
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
    'efficiÃ«ntie': 'efficiëntie',
    'Ã—': '×'
}

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            changed = False
            for bad, good in replacements.items():
                if bad in content:
                    content = content.replace(bad, good)
                    changed = True
            
            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed encoding in {filepath}")
