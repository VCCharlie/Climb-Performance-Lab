import re, json

BOUNDS = {
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

with open('src/climbs_extended.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The file contains COGGAN_ZONES first, then RAW_CLIMBS. Target RAW_CLIMBS directly.
import re as _re
m = _re.search(r'const\s+RAW_CLIMBS\s*=\s*(\[)', content)
if m:
    start = m.start(1)
    end = content.rindex(']') + 1
    raw_json = content[start:end]
else:
    # Fallback: second '[' skips COGGAN_ZONES
    first = content.index('[')
    start = content.index('[', first + 1)
    end = content.rindex(']') + 1
    raw_json = content[start:end]

climbs = json.loads(raw_json)

stats = {}
bad = []

for c in climbs:
    country = c.get('country', '')
    if country == 'ZWIFT':
        continue
    lat = c.get('lat')
    lon = c.get('lon')
    if country not in stats:
        stats[country] = {'total': 0, 'ok': 0, 'bad': 0}
    stats[country]['total'] += 1
    if lat is None or lon is None:
        stats[country]['bad'] += 1
        bad.append({'id': c.get('id'), 'name': c.get('name'), 'country': country, 'lat': lat, 'lon': lon, 'source_verified': c.get('source_verified'), 'issue': 'missing'})
        continue
    if country in BOUNDS:
        lat_min, lat_max, lon_min, lon_max = BOUNDS[country]
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            stats[country]['ok'] += 1
        else:
            stats[country]['bad'] += 1
            bad.append({'id': c.get('id'), 'name': c.get('name'), 'country': country, 'lat': lat, 'lon': lon, 'source_verified': c.get('source_verified'), 'issue': 'out_of_bounds'})
    else:
        stats[country]['ok'] += 1

print('=== SUMMARY PER COUNTRY ===')
for country, s in sorted(stats.items()):
    print(f'{country}: total={s["total"]} ok={s["ok"]} bad={s["bad"]}')

print()
print('=== BAD ENTRIES ===')
for b in bad:
    print(f'id={b["id"]} | name={b["name"]} | country={b["country"]} | lat={b["lat"]} | lon={b["lon"]} | source_verified={b["source_verified"]} | issue={b["issue"]}')

print()
print(f'Total bad: {len(bad)}')
