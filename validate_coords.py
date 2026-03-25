import re
import json

BBOXES = {
    "NL": {"lat": (50.75, 53.60), "lon": (3.30, 7.30)},
    "BE": {"lat": (49.50, 51.55), "lon": (2.50, 6.55)},
    "LU": {"lat": (49.40, 50.20), "lon": (5.70, 6.55)},
    "FR": {"lat": (41.30, 51.10), "lon": (-5.20, 9.70)},
    "DE": {"lat": (47.27, 55.10), "lon": (5.87, 15.05)},
    "AT": {"lat": (46.37, 49.02), "lon": (9.53, 17.20)},
    "IT": {"lat": (35.49, 47.10), "lon": (6.62, 18.55)},
    "CH": {"lat": (45.82, 47.81), "lon": (5.95, 10.55)},
    "ES": {"lat": (35.17, 43.82), "lon": (-9.40, 4.60)},
    "PT": {"lat": (36.83, 42.20), "lon": (-9.52, -6.19)},
    "GB": {"lat": (49.87, 60.90), "lon": (-8.65, 1.77)},
}

filepath = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Strip JS module wrapper
content = re.sub(r"^\s*(?:export\s+default|module\.exports\s*=|const\s+\w+\s*=)\s*", "", content.strip())
content = content.rstrip(";")

try:
    data = json.loads(content)
except json.JSONDecodeError as e:
    print(f"JSON parse failed: {e}")
    # Try extracting the array
    m = re.search(r"(\[[\s\S]*\])", content)
    if m:
        data = json.loads(m.group(1))
    else:
        print("Could not extract JSON array")
        exit(1)

print(f"Total entries loaded: {len(data)}")
print()

stats = {}  # country -> {total, bad, entries}

for entry in data:
    country = entry.get("country", "")
    if country == "ZWIFT":
        continue
    if country not in BBOXES:
        continue
    
    lat = entry.get("lat")
    lon = entry.get("lon")
    
    if lat is None or lon is None:
        continue
    
    bbox = BBOXES[country]
    lat_min, lat_max = bbox["lat"]
    lon_min, lon_max = bbox["lon"]
    
    if country not in stats:
        stats[country] = {"total": 0, "bad": 0, "bad_entries": []}
    
    stats[country]["total"] += 1
    
    if not (lat_min <= lat <= lat_max and lon_min <= lon <= lon_max):
        stats[country]["bad"] += 1
        stats[country]["bad_entries"].append({
            "id": entry.get("id", "N/A"),
            "name": entry.get("name", "N/A"),
            "country": country,
            "lat": lat,
            "lon": lon,
            "source_verified": entry.get("source_verified", entry.get("source", "N/A"))
        })

print("=== PER-COUNTRY SUMMARY ===")
print(f"{'Country':<8} {'Total':>6} {'OK':>6} {'BAD':>6}")
print("-" * 30)
total_total = 0
total_bad = 0
for c in ["NL", "BE", "LU", "FR", "DE", "AT", "IT", "CH", "ES", "PT", "GB"]:
    if c in stats:
        s = stats[c]
        ok = s["total"] - s["bad"]
        print(f"{c:<8} {s['total']:>6} {ok:>6} {s['bad']:>6}")
        total_total += s["total"]
        total_bad += s["bad"]
    else:
        print(f"{c:<8} {0:>6} {0:>6} {0:>6}")

print("-" * 30)
print(f"{'TOTAL':<8} {total_total:>6} {total_total-total_bad:>6} {total_bad:>6}")

print()
print("=== BAD ENTRIES DETAIL ===")
for c in ["NL", "BE", "LU", "FR", "DE", "AT", "IT", "CH", "ES", "PT", "GB"]:
    if c in stats and stats[c]["bad"] > 0:
        print(f"\n--- {c} ({stats[c]['bad']} bad entries) ---")
        bbox = BBOXES[c]
        print(f"    bbox: lat {bbox['lat'][0]}-{bbox['lat'][1]}, lon {bbox['lon'][0]}-{bbox['lon'][1]}")
        for e in stats[c]["bad_entries"]:
            print(f"  BAD: {e['id']:<40} | {e['name']:<45} | lat {e['lat']:<18} | lon {e['lon']:<18} | source: {e['source_verified']}")
