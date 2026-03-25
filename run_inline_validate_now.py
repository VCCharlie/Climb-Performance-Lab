import re, json

with open(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract entries via regex
pattern = r'\{[^{}]*?"id"\s*:\s*"[^"]*"[^{}]*?"country"\s*:\s*"([^"]*)"[^{}]*?"lat"\s*:\s*([\d\.\-]+)[^{}]*?"lon"\s*:\s*([\d\.\-]+)[^{}]*?\}'

BBOXES = {
    'NL': (50.75, 53.60, 3.30, 7.30),
    'BE': (49.50, 51.55, 2.50, 6.55),
    'LU': (49.40, 50.20, 5.70, 6.55),
    'FR': (41.30, 51.10, -5.20, 9.70),
    'DE': (47.27, 55.10, 5.87, 15.05),
    'AT': (46.37, 49.02, 9.53, 17.20),
    'IT': (35.49, 47.10, 6.62, 18.55),
    'CH': (45.82, 47.81, 5.95, 10.55),
    'ES': (35.17, 43.82, -9.40, 4.60),
    'PT': (36.83, 42.20, -9.52, 6.19),
    'GB': (49.87, 60.90, -8.65, 1.77),
}

# More complete pattern that gets the id too
entries = re.findall(r'"id"\s*:\s*"([^"]*)".*?"country"\s*:\s*"([^"]*)".*?"lat"\s*:\s*([\d\.\-]+).*?"lon"\s*:\s*([\d\.\-]+)', content, re.DOTALL)

bad = []
for entry_id, country, lat_s, lon_s in entries:
    if country not in BBOXES:
        continue
    lat, lon = float(lat_s), float(lon_s)
    min_lat, max_lat, min_lon, max_lon = BBOXES[country]
    if not (min_lat <= lat <= max_lat and min_lon <= lon <= max_lon):
        bad.append(f"BAD: {entry_id} ({country}) lat={lat} lon={lon}")

print(f"Total bad entries: {len(bad)}")
for b in bad:
    print(b)
