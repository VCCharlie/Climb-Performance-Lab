"""
verify-coordinates.py
Checks all climbs in climbs_extended.js against expected geographic
bounding boxes per country. Reports entries with coordinates outside
the expected range (likely Nominatim geocoding errors).

Usage: python scripts/verify-coordinates.py [--country NL] [--source-only]
"""

import json
import re
import sys
import os

CLIMB_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'climbs_extended.js')

# [minLat, maxLat, minLon, maxLon]
COUNTRY_BBOX = {
    'NL': [50.75, 53.60,  3.30,  7.30],
    'BE': [49.50, 51.55,  2.50,  6.55],
    'LU': [49.40, 50.20,  5.70,  6.55],
    'FR': [41.30, 51.10, -5.20,  9.70],
    'DE': [47.27, 55.10,  5.87, 15.05],
    'AT': [46.37, 49.02,  9.53, 17.20],
    'IT': [35.49, 47.10,  6.62, 18.55],
    'CH': [45.82, 47.81,  5.95, 10.55],
    'ES': [35.17, 43.82, -9.40,  4.60],
    'PT': [36.83, 42.20, -9.52, -6.19],
    'GB': [49.87, 60.90, -8.65,  1.77],
    'ZWIFT': None,
}

# CLI args
args = sys.argv[1:]
filter_country = None
nominatim_only = False
if '--country' in args:
    idx = args.index('--country')
    filter_country = args[idx + 1] if idx + 1 < len(args) else None
if '--source-only' in args:
    nominatim_only = True

with open(CLIMB_FILE, encoding='utf-8') as f:
    content = f.read()

# Try to extract the JSON array from the JS file
climbs = None

# Strategy 1: export default [...] or export const X = [...]
m = re.search(r'export\s+(?:default\s+|const\s+\w+\s*=\s*)(\[[\s\S]*\])', content)
if m:
    try:
        climbs = json.loads(m.group(1))
    except json.JSONDecodeError:
        pass

# Strategy 2: const/let/var X = [...]
if climbs is None:
    m = re.search(r'(?:const|let|var)\s+\w+\s*=\s*(\[[\s\S]*?\]);?\s*$', content, re.MULTILINE)
    if m:
        try:
            climbs = json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

# Strategy 3: bare array
if climbs is None:
    m = re.search(r'^\s*(\[[\s\S]*\])\s*;?\s*$', content)
    if m:
        try:
            climbs = json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

# Strategy 4: find the array portion by locating first '[' after the export/const declaration
if climbs is None:
    # Find the RAW_CLIMBS or CLIMB_DATABASE array
    m = re.search(r'(?:RAW_CLIMBS|CLIMB_DATABASE|CLIMBS)\s*=\s*(\[)', content)
    if m:
        start = m.start(1)
        # Count brackets to find the end
        depth = 0
        end = start
        for i, ch in enumerate(content[start:], start):
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        try:
            climbs = json.loads(content[start:end])
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}", file=sys.stderr)

if climbs is None:
    print("ERROR: Could not parse climbs_extended.js - unexpected format", file=sys.stderr)
    sys.exit(1)

print(f"Total entries: {len(climbs)}\n")

issues = {}
stats = {}

for climb in climbs:
    cid = climb.get('id', '?')
    name = climb.get('name', '?')
    country = climb.get('country')
    lat = climb.get('lat')
    lon = climb.get('lon')
    source_verified = climb.get('source_verified') or climb.get('source', 'unknown')

    if not country:
        continue
    if filter_country and country != filter_country:
        continue
    if nominatim_only and source_verified != 'Nominatim':
        continue

    if country not in stats:
        stats[country] = {'total': 0, 'ok': 0, 'bad': 0, 'noCoords': 0}
    stats[country]['total'] += 1

    bbox = COUNTRY_BBOX.get(country)
    if bbox is None and country in COUNTRY_BBOX:
        # ZWIFT or similar - skip
        stats[country]['ok'] += 1
        continue
    if bbox is None:
        # Unknown country - skip
        stats[country]['ok'] += 1
        continue

    if lat is None or lon is None:
        stats[country]['noCoords'] += 1
        continue

    min_lat, max_lat, min_lon, max_lon = bbox
    in_bounds = (min_lat <= lat <= max_lat) and (min_lon <= lon <= max_lon)

    if not in_bounds:
        stats[country]['bad'] += 1
        if country not in issues:
            issues[country] = []
        issues[country].append({
            'id': cid,
            'name': name,
            'lat': lat,
            'lon': lon,
            'source': source_verified,
        })
    else:
        stats[country]['ok'] += 1

# Print summary
print('=== SUMMARY PER COUNTRY ===')
for c in sorted(stats.keys()):
    s = stats[c]
    issue_count = len(issues.get(c, []))
    flag = ' ⚠️' if issue_count > 0 else ' ✅'
    print(f"{c:<6} total:{s['total']:>4}  ok:{s['ok']:>4}  bad:{issue_count:>4}{flag}")

# Print details per country
print('\n=== ISSUES PER COUNTRY ===\n')
for country in sorted(issues.keys()):
    lst = issues[country]
    if not lst:
        continue
    print(f'--- {country} ({len(lst)} issues) ---')
    for item in lst:
        src = str(item['source'])[:10].ljust(10)
        cid = str(item['id'])[:35].ljust(35)
        print(f"  [{src}] {cid} lat={item['lat']}, lon={item['lon']}  → \"{item['name']}\"")
    print()
