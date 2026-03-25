import json
from collections import defaultdict

path = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

start = content.index("[")
end   = content.rindex("]") + 1
climbs = json.loads(content[start:end])

BOXES = {
    "NL": (50.75, 53.60, 3.30,  7.30),
    "BE": (49.50, 51.55, 2.50,  6.55),
    "LU": (49.40, 50.20, 5.70,  6.55),
    "FR": (41.30, 51.10,-5.20,  9.70),
    "DE": (47.27, 55.10, 5.87, 15.05),
    "AT": (46.37, 49.02, 9.53, 17.20),
    "IT": (35.49, 47.10, 6.62, 18.55),
    "CH": (45.82, 47.81, 5.95, 10.55),
    "ES": (35.17, 43.82,-9.40,  4.60),
    "PT": (36.83, 42.20,-9.52, -6.19),
    "GB": (49.87, 60.90,-8.65,  1.77),
}

totals  = defaultdict(int)
issues  = defaultdict(list)

for c in climbs:
    country = (c.get("country") or "").strip().upper()
    if country == "ZWIFT":
        continue
    lat = c.get("lat")
    lon = c.get("lon")
    totals[country] += 1

    if lat is None or lon is None:
        issues[country].append(
            f"{c.get('id','?')} | {c.get('name','?')} | lat=MISSING lon=MISSING"
        )
        continue

    box = BOXES.get(country)
    if box is None:
        continue

    lat_min, lat_max, lon_min, lon_max = box
    if not (lat_min <= lat <= lat_max and lon_min <= lon <= lon_max):
        src = c.get("source_verified") or c.get("source") or "-"
        issues[country].append(
            f"{c.get('id','?')} | {c.get('name','?')} | lat={lat} lon={lon} | source={src}"
        )

# Summary
print("=== SUMMARY ===")
all_countries = sorted(set(list(totals.keys()) + list(issues.keys())))
for cc in all_countries:
    tot = totals.get(cc, 0)
    bad = len(issues.get(cc, []))
    print(f"{cc:<6} total: {tot:>4}  bad: {bad:>3}")

# Per-country detail
for cc in all_countries:
    bad_list = issues.get(cc, [])
    if not bad_list:
        continue
    print(f"\n=== {cc} ISSUES ({len(bad_list)}) ===")
    for line in bad_list:
        print(line)
