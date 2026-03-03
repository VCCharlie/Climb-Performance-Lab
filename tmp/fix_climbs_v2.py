
import re

file_path = r'c:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed_lines = []
for line in lines:
    new_line = line
    
    # 1. Fix numeric commas in lengthKm and avgGrade
    # We use a refined regex that matches the property and the numeric value with a comma
    new_line = re.sub(r'(lengthKm: )(\d+),(\d+)', r'\1\2.\3', new_line)
    new_line = re.sub(r'(avgGrade: )(\d+),(\d+)', r'\1\2.\3', new_line)
    
    # 2. Fix unescaped quotes in IDs
    # Example: id: 'col_d'aspin_west'
    # Check if the id part has three single quotes (indicating an internal one)
    # Match id: '...', then capture the content
    id_match = re.search(r"id: '([^']*)'([^']*)'", new_line)
    if id_match:
        # If there's content after the second quote before the comma/space, it's likely broken
        # Wait, if it matches "id: '([^']*)'([^']*)'", group 1 is the part before the second quote
        # and group 2 is the part after.
        # But if the line is healthy, group 2 will be empty because the quote after group 1 is the closing quote.
        # Wait, re.search(r"id: '([^']*)'([^']*)'") will match "id: 'abc'" where group 1 is 'abc' and group 2 is empty.
        # Actually it depends on how it matches. 
        # Let's try: match id: ' AND THEN match the shortest string until the next ', AND THEN see if there's ANOTHER ' before the next ,
        
        # Simpler: if id: ' has more than 2 single quotes on the line, it's likely broken.
        quotes = [m.start() for m in re.finditer("'", new_line)]
        # Usually an entry has id: '...' and name: "..." or name: '...'
        # If id is '...', but it's broken '... '...', we have 3 quotes in the ID section.
        
        if new_line.count("'") >= 3 and "id: '" in new_line:
             # Find the ID section: id: ' ... ',
             m = re.search(r"id: '(.*)',", new_line)
             if m:
                 id_content = m.group(1)
                 if "'" in id_content:
                     fixed_id = id_content.replace("'", "_")
                     new_line = new_line.replace(id_content, fixed_id)

    fixed_lines.append(new_line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print("Done fixing src/climbs.js (line-by-line)")
