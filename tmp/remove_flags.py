
import re

file_path = r'c:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Remove flag: "..." or flag: '...' including the following comma and space
    # Example: flag: "🇫🇷", 
    new_line = re.sub(r'flag: "[^"]*",\s*', '', line)
    new_line = re.sub(r"flag: '[^']*',\s*", '', new_line)
    new_lines.append(new_line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done removing redundant flags from src/climbs.js")
