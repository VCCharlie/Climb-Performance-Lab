
import re

file_path = r'c:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs.js'

mappings = {
    'Frankrijk': 'FR',
    'Italië': 'IT',
    'Spanje': 'ES',
    'België': 'BE',
    'Oostenrijk': 'AT',
    'Duitsland': 'DE',
    'Zwitserland': 'CH',
    'Andorra': 'AD',
    'USA': 'US',
    'Zwift': 'ZWIFT',
    'Nederland': 'NL'
}

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_line = line
    if 'country:' in line:
        for full, code in mappings.items():
            # Match country: "Name" or country: 'Name'
            new_line = re.sub(fr'country: ["\']{full}["\']', f'country: "{code}"', new_line)
    new_lines.append(new_line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done standardizing countries in src/climbs.js")
