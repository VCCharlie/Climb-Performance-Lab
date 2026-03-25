import re
from pathlib import Path

# Bounding boxes for each country
BBOXES = {
    "NL": {"latMin": 50.75, "latMax": 53.60, "lonMin": 3.30, "lonMax": 7.30},
    "BE": {"latMin": 49.50, "latMax": 51.55, "lonMin": 2.50, "lonMax": 6.55},
    "LU": {"latMin": 49.40, "latMax": 50.20, "lonMin": 5.70, "lonMax": 6.55},
    "FR": {"latMin": 41.30, "latMax": 51.10, "lonMin": -5.20, "lonMax": 9.70},
    "DE": {"latMin": 47.27, "latMax": 55.10, "lonMin": 5.87, "lonMax": 15.05},
    "AT": {"latMin": 46.37, "latMax": 49.02, "lonMin": 9.53, "lonMax": 17.20},
    "IT": {"latMin": 35.49, "latMax": 47.10, "lonMin": 6.62, "lonMax": 18.55},
    "CH": {"latMin": 45.82, "latMax": 47.81, "lonMin": 5.95, "lonMax": 10.55},
    "ES": {"latMin": 35.17, "latMax": 43.82, "lonMin": -9.40, "lonMax": 4.60},
    "PT": {"latMin": 36.83, "latMax": 42.20, "lonMin": -9.52, "lonMax": -6.19},
    "GB": {"latMin": 49.87, "latMax": 60.90, "lonMin": -8.65, "lonMax": 1.77},
}

def read_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def extract_climbs(content):
    """Extract all climb objects from JavaScript"""
    climbs = []
    
    # Find RAW_CLIMBS array
    match = re.search(r'const RAW_CLIMBS\s*=\s*\[(.*?)\];', content, re.DOTALL)
    if not match:
        return climbs
    
    array_content = match.group(1)
    
    # Split by object boundaries
    depth = 0
    current_obj = ""
    
    for char in array_content:
        if char == '{':
            depth += 1
            current_obj += char
        elif char == '}':
            current_obj += char
            depth -= 1
            if depth == 0 and current_obj.strip():
                # Parse the object
                climb = parse_object(current_obj)
                if climb:
                    climbs.append(climb)
                current_obj = ""
        else:
            if depth > 0:
                current_obj += char
    
    return climbs

def parse_object(obj_str):
    """Parse a JavaScript object string"""
    climb = {}
    
    # Extract fields
    fields = {
        'id': r'"id"\s*:\s*["\']?([^"\']*)["\']?',
        'name': r'"name"\s*:\s*"([^"]*)"',
        'country': r'"country"\s*:\s*"([^"]*)"',
        'lat': r'"lat"\s*:\s*(-?[\d.]+)',
        'lon': r'"lon"\s*:\s*(-?[\d.]+)',
        'url': r'"url"\s*:\s*"([^"]*)"',
    }
    
    for field, pattern in fields.items():
        match = re.search(pattern, obj_str)
        if match:
            value = match.group(1)
            if field in ('lat', 'lon'):
                try:
                    climb[field] = float(value)
                except:
                    pass
            else:
                climb[field] = value
    
    return climb if 'id' in climb and 'country' in climb else None

def validate(climbs):
    """Validate coordinates"""
    stats = {}
    bad = {}
    
    for climb in climbs:
        if 'country' not in climb or climb['country'] == 'ZWIFT':
            continue
        
        country = climb['country']
        if country not in BBOXES:
            continue
        
        if country not in stats:
            stats[country] = 0
            bad[country] = []
        
        stats[country] += 1
        
        if 'lat' in climb and 'lon' in climb:
            bbox = BBOXES[country]
            lat, lon = climb['lat'], climb['lon']
            
            if not (bbox['latMin'] <= lat <= bbox['latMax'] and bbox['lonMin'] <= lon <= bbox['lonMax']):
                bad[country].append(climb)
    
    return stats, bad

# Main
filepath = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js"
output_filepath = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt"

content = read_file(filepath)
climbs = extract_climbs(content)
stats, bad_entries = validate(climbs)

# Generate output
lines = []
total = sum(stats.values())
lines.append(f"Total entries: {total}\n")
lines.append("=== SUMMARY ===")

for country in sorted(stats.keys()):
    bad_count = len(bad_entries.get(country, []))
    lines.append(f"{country}: {stats[country]} total, {bad_count} bad")

lines.append("\n=== BAD ENTRIES ===")

for country in sorted(bad_entries.keys()):
    if bad_entries[country]:
        lines.append(f"--- {country} ---")
        for entry in bad_entries[country]:
            lines.append(f"  {entry.get('id', 'N/A')} | {entry.get('name', 'N/A')} | lat={entry.get('lat', 'N/A')} | lon={entry.get('lon', 'N/A')} | {entry.get('url', 'N/A')}")

output_text = '\n'.join(lines)

# Save
with open(output_filepath, 'w', encoding='utf-8') as f:
    f.write(output_text)

print(output_text)
