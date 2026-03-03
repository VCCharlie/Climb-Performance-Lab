
import re

file_path = r'c:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix numeric commas: lengthKm: 18,9 -> lengthKm: 18.9
# We look for lengthKm: X,Y and avgGrade: X,Y
# Also sometimes just X,Y in a context that looks like data
# Using a regex that finds digits-comma-digits within the RAW_CLIMBS array context
def fix_numbers(match):
    return match.group(1) + '.' + match.group(2)

# Find all occurrences of digit(s) comma digit(s) that are preceded by a colon and space
# and probably part of lengthKm or avgGrade
content = re.sub(r'(lengthKm: \d+),(\d+)', fix_numbers, content)
content = re.sub(r'(avgGrade: \d+),(\d+)', fix_numbers, content)

# Also handle cases where there might not be a space or it's different
content = re.sub(r'(\d+),(\d+)(?=, [a-z])', fix_numbers, content) # e.g. 18,9, elevation
content = re.sub(r'(\d+),(\d+)(?= })', fix_numbers, content)   # e.g. avgGrade: 7,4 }

# 2. Fix unescaped quotes in IDs
# Example: id: 'col_d'aspin_west' -> id: 'col_d_aspin_west'
# We look for id: '...' where there's an extra quote
def fix_ids(match):
    id_val = match.group(1)
    fixed_id = id_val.replace("'", "_")
    return f"id: '{fixed_id}'"

content = re.sub(r"id: '([^']*)'([^']*)'", fix_ids, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done fixing src/climbs.js")
