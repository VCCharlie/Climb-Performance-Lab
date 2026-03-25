import re, json

BOUNDS = {
    'NL': {'lat': (50.75, 53.60), 'lon': (3.30, 7.30)},
    'BE': {'lat': (49.50, 51.55), 'lon': (2.50, 6.55)},
    'LU': {'lat': (49.40, 50.20), 'lon': (5.70, 6.55)},
    'FR': {'lat': (41.30, 51.10), 'lon': (-5.20, 9.70)},
    'DE': {'lat': (47.27, 55.10), 'lon': (5.87, 15.05)},
    'AT': {'lat': (46.37, 49.02), 'lon': (9.53, 17.20)},
    'IT': {'lat': (35.49, 47.10), 'lon': (6.62, 18.55)},
    'CH': {'lat': (45.82, 47.81), 'lon': (5.95, 10.55)},
    'ES': {'lat': (35.17, 43.82), 'lon': (-9.40, 4.60)},
    'PT': {'lat': (36.83, 42.20), 'lon': (-9.52, 6.19)},
    'GB': {'lat': (49.87, 60.90), 'lon': (-8.65, 1.77)},
}

with open(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The file has COGGAN_ZONES first, then RAW_CLIMBS. Target RAW_CLIMBS directly.
m = re.search(r'const\s+RAW_CLIMBS\s*=\s*(\[)', content)
if m:
    start = m.start(1)
    end = content.rindex(']') + 1
    raw_json = content[start:end]
else:
    first = content.index('[')
    start = content.index('[', first + 1)
    end = content.rindex(']') + 1
    raw_json = content[start:end]

data = json.loads(raw_json)

print(f'Parsed {len(data)} climbs\n')

# Per-country stats
country_stats = {}
bad_entries = []

for climb in data:
    country = climb.get('country', 'UNKNOWN')
    if country == 'ZWIFT':
        continue
    lat = climb.get('lat')
    lon = climb.get('lon')
    
    if country not in country_stats:
        country_stats[country] = {'total': 0, 'ok': 0, 'bad': 0}
    country_stats[country]['total'] += 1
    
    if country not in BOUNDS:
        print(f"  UNKNOWN COUNTRY: {country} - {climb.get('id')} / {climb.get('name')}")
        country_stats[country]['bad'] += 1
        bad_entries.append(climb)
        continue
    
    bounds = BOUNDS[country]
    lat_ok = lat is not None and bounds['lat'][0] <= lat <= bounds['lat'][1]
    lon_ok = lon is not None and bounds['lon'][0] <= lon <= bounds['lon'][1]
    
    if lat_ok and lon_ok:
        country_stats[country]['ok'] += 1
    else:
        country_stats[country]['bad'] += 1
        bad_entries.append(climb)

print('=== SUMMARY PER COUNTRY ===')
for country, stats in sorted(country_stats.items()):
    print(f"  {country:5s}: total={stats['total']:3d}  ok={stats['ok']:3d}  bad={stats['bad']:3d}")

print(f'\nTotal bad entries: {len(bad_entries)}\n')
print('=== BAD ENTRIES ===')
for c in bad_entries:
    sv = c.get('source_verified', 'N/A')
    print(f"  id={c.get('id')}  name={c.get('name')}  country={c.get('country')}  lat={c.get('lat')}  lon={c.get('lon')}  source_verified={sv}")
