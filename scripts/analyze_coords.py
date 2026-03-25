"""
analyze_coords.py
Checks all climbs in climbs_extended.js against geographic bounding boxes.
Reports entries with wrong coordinates per country.
"""
import json, re, sys

FILE = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js"

BBOX = {
    "NL": (50.75, 53.60,  3.30,  7.30),
    "BE": (49.50, 51.55,  2.50,  6.55),
    "LU": (49.40, 50.20,  5.70,  6.55),
    "FR": (41.30, 51.10, -5.20,  9.70),
    "DE": (47.27, 55.10,  5.87, 15.05),
    "AT": (46.37, 49.02,  9.53, 17.20),
    "IT": (35.49, 47.10,  6.62, 18.55),
    "CH": (45.82, 47.81,  5.95, 10.55),
    "ES": (35.17, 43.82, -9.40,  4.60),
    "PT": (36.83, 42.20, -9.52, -6.19),
    "GB": (49.87, 60.90, -8.65,  1.77),
}

with open(FILE, encoding="utf-8") as f:
    content = f.read()

# Extract the JSON array (between first '[' after 'RAW_CLIMBS = ' and matching ']')
m = re.search(r'const RAW_CLIMBS\s*=\s*(\[.*?\]);', content, re.DOTALL)
if not m:
    print("ERROR: Could not find RAW_CLIMBS array"); sys.exit(1)

climbs = json.loads(m.group(1))
print(f"Total entries: {len(climbs)}\n")

issues = {}
stats  = {}

for c in climbs:
    country = c.get("country","")
    if not country or country == "ZWIFT":
        continue
    stats.setdefault(country, {"total":0,"bad":0})
    stats[country]["total"] += 1

    if country not in BBOX:
        continue

    lat = c.get("lat")
    lon = c.get("lon")
    if lat is None or lon is None:
        continue

    minLat, maxLat, minLon, maxLon = BBOX[country]
    if not (minLat <= lat <= maxLat and minLon <= lon <= maxLon):
        stats[country]["bad"] += 1
        issues.setdefault(country, []).append(c)

# Summary
print("=== SUMMARY PER COUNTRY ===")
for country in sorted(stats):
    s = stats[country]
    flag = " ⚠️" if s["bad"] else " ✅"
    print(f"  {country:<6} total:{s['total']:>5}  bad:{s['bad']:>4}{flag}")

print()
# Details
for country in sorted(issues):
    lst = issues[country]
    if not lst:
        continue
    print(f"=== {country} ISSUES ({len(lst)}) ===")
    for c in lst:
        src = c.get("source_verified","?")
        reg = c.get("region","?")
        print(f"  {c['id']:<42} lat={c.get('lat','?'):<12} lon={c.get('lon','?'):<12} [{src}]  \"{c['name']}\"  (region: {reg})")
    print()
