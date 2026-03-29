import re
import json
import sys

# ── Bounding boxes ────────────────────────────────────────────────────────────
BOXES = {
    "NL": dict(latMin=50.75, latMax=53.60, lonMin=3.30,  lonMax=7.30),
    "BE": dict(latMin=49.50, latMax=51.55, lonMin=2.50,  lonMax=6.55),
    "LU": dict(latMin=49.40, latMax=50.20, lonMin=5.70,  lonMax=6.55),
    "FR": dict(latMin=41.30, latMax=51.10, lonMin=-5.20, lonMax=9.70),
    "DE": dict(latMin=47.27, latMax=55.10, lonMin=5.87,  lonMax=15.05),
    "AT": dict(latMin=46.37, latMax=49.02, lonMin=9.53,  lonMax=17.20),
    "IT": dict(latMin=35.49, latMax=47.10, lonMin=6.62,  lonMax=18.55),
    "CH": dict(latMin=45.82, latMax=47.81, lonMin=5.95,  lonMax=10.55),
    "ES": dict(latMin=35.17, latMax=43.82, lonMin=-9.40, lonMax=4.60),
    "PT": dict(latMin=36.83, latMax=42.20, lonMin=-9.52, lonMax=-6.19),
    "GB": dict(latMin=49.87, latMax=60.90, lonMin=-8.65, lonMax=1.77),
}

# ── 1. Read source file ───────────────────────────────────────────────────────
src = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js'
with open(src, encoding='utf-8') as f:
    text = f.read()

# ── 2. Extract RAW_CLIMBS array ───────────────────────────────────────────────
m = re.search(r'const RAW_CLIMBS\s*=\s*(\[[\s\S]*?\])\s*;?\s*(?:export|$)', text)
if m:
    raw_str = m.group(1)
else:
    start        = text.index('const RAW_CLIMBS')
    bracket_start = text.index('[', start)
    export_idx   = text.find('\nexport', bracket_start)
    if export_idx == -1:
        export_idx = len(text)
    raw_str = text[bracket_start:export_idx].rstrip().rstrip(';')

# ── 3. Convert JS → JSON ──────────────────────────────────────────────────────
raw_str = re.sub(r'//[^\n]*', '', raw_str)          # strip // comments
raw_str = re.sub(r'/\*[\s\S]*?\*/', '', raw_str)    # strip /* */ comments

# Convert single-quoted strings to double-quoted
def sq_to_dq(m2):
    inner = m2.group(1).replace('"', '\\"')
    return '"' + inner + '"'
raw_str = re.sub(r"'([^'\\]*(?:\\.[^'\\]*)*)'", sq_to_dq, raw_str)

# Remove trailing commas before } or ]
raw_str = re.sub(r',\s*([\}\]])', r'\1', raw_str)

try:
    climbs = json.loads(raw_str)
except json.JSONDecodeError as e:
    print("JSON parse error:", e)
    print("Context:", raw_str[max(0, e.pos - 120):e.pos + 120])
    sys.exit(1)

# ── 4. Validate ───────────────────────────────────────────────────────────────
country_totals = {}   # country -> total count
country_bad    = {}   # country -> list of bad entry dicts

for entry in climbs:
    country = entry.get('country', '')

    # Skip Zwift and unknown countries
    if country == 'ZWIFT' or country not in BOXES:
        continue

    country_totals[country] = country_totals.get(country, 0) + 1

    lat = entry.get('lat')
    lon = entry.get('lon')
    box = BOXES[country]

    is_bad = (
        lat is None or lon is None
        or not (box['latMin'] <= lat <= box['latMax'])
        or not (box['lonMin'] <= lon <= box['lonMax'])
    )

    if is_bad:
        source = entry.get('url') or entry.get('bigUrl') or 'no source'
        country_bad.setdefault(country, []).append({
            'id':  entry.get('id',  'n/a'),
            'name': entry.get('name', 'n/a'),
            'lat': lat,
            'lon': lon,
            'source': source,
        })

# ── 5. Build output ───────────────────────────────────────────────────────────
total_entries = sum(country_totals.values())

lines = []
lines.append(f"Total entries: {total_entries}")
lines.append("")
lines.append("=== SUMMARY ===")
for country in sorted(country_totals.keys()):
    total = country_totals[country]
    bad   = len(country_bad.get(country, []))
    lines.append(f"{country}: {total} total, {bad} bad")

lines.append("")
lines.append("=== BAD ENTRIES ===")
for country in sorted(country_bad.keys()):
    if not country_bad[country]:
        continue
    lines.append(f"--- {country} ---")
    for e in country_bad[country]:
        lines.append(
            f"  {e['id']} | {e['name']} | lat={e['lat']} | lon={e['lon']} | {e['source']}"
        )

output = '\n'.join(lines) + '\n'

# ── 6. Write file ─────────────────────────────────────────────────────────────
out_path = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output_formatted.txt'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output)

# ── 7. Print to stdout ────────────────────────────────────────────────────────
print(output)

# ── 8. Read back & confirm ────────────────────────────────────────────────────
with open(out_path, encoding='utf-8') as f:
    readback = f.read()

print("=== FILE READBACK CONFIRMED ===")
print(f"(file size: {len(readback)} bytes, {readback.count(chr(10))} lines)")
