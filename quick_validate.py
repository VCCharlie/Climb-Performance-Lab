#!/usr/bin/env python3
import re
import os
from collections import defaultdict

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

filepath = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js'
output_filepath = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'const\s+RAW_CLIMBS\s*=\s*(\[[\s\S]*?\]);\s*export', content)
if match:
    try:
        jsonStr = match.group(1)
        import json
        climbs = json.loads(jsonStr)
    except:
        print("Error parsing JSON")
        exit(1)
else:
    print("Could not find RAW_CLIMBS array")
    exit(1)

stats = {}
bad_entries = {}

for entry in climbs:
    country = (entry.get('country') or "").upper()
    
    if country == "ZWIFT":
        continue
    
    if country not in BBOXES:
        continue
    
    if country not in stats:
        stats[country] = {'total': 0, 'bad': 0}
    stats[country]['total'] += 1
    
    lat = entry.get('lat')
    lon = entry.get('lon')
    
    if lat is None or lon is None:
        continue
    
    bbox = BBOXES[country]
    if not (bbox['latMin'] <= lat <= bbox['latMax'] and bbox['lonMin'] <= lon <= bbox['lonMax']):
        stats[country]['bad'] += 1
        if country not in bad_entries:
            bad_entries[country] = []
        bad_entries[country].append(entry)

output = []
total = sum(s['total'] for s in stats.values())
output.append(f"Total entries: {total}\n")
output.append("=== SUMMARY ===")

for country in sorted(stats.keys()):
    total_c = stats[country]['total']
    bad_c = stats[country]['bad']
    output.append(f"{country}: {total_c} total, {bad_c} bad")

if bad_entries:
    output.append("")
    output.append("=== BAD ENTRIES ===")
    for country in sorted(bad_entries.keys()):
        output.append(f"--- {country} ---")
        for entry in bad_entries[country]:
            entry_id = entry.get('id', 'N/A')
            name = entry.get('name', 'N/A')
            lat = entry.get('lat', 'N/A')
            lon = entry.get('lon', 'N/A')
            source = entry.get('url') or entry.get('bigUrl') or 'N/A'
            output.append(f"  {entry_id} | {name} | lat={lat} | lon={lon} | {source}")

output_text = '\n'.join(output)

with open(output_filepath, 'w', encoding='utf-8') as f:
    f.write(output_text)

print("Validation complete!")
print("="*80)
print(output_text)
print("="*80)
