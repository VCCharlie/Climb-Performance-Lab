import re
filepath = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js'
with open(filepath, encoding='utf-8') as f:
    content = f.read()

flat_obj_pattern = re.compile(r'\{([^{}]+)\}', re.DOTALL)

# Count big_ entries with BE (the fixed ones)
be_fixed = 0
# Count remaining wrong big_ NL entries
wrong_nl = []

for m in flat_obj_pattern.finditer(content):
    obj_text = m.group(0)
    id_match = re.search(r'"id"\s*:\s*"(big_[^"]+)"', obj_text)
    if not id_match:
        continue
    country_match = re.search(r'"country"\s*:\s*"(NL|BE)"', obj_text)
    if not country_match:
        continue
    lat_match = re.search(r'"lat"\s*:\s*([0-9.-]+)', obj_text)
    lon_match = re.search(r'"lon"\s*:\s*([0-9.-]+)', obj_text)
    if lat_match and lon_match:
        lat = float(lat_match.group(1))
        lon = float(lon_match.group(1))
        country = country_match.group(1)
        if country == 'BE' and (lat < 50.75 or lon < 3.30):
            be_fixed += 1
        if country == 'NL' and (lat < 50.75 or lon < 3.30):
            wrong_nl.append(f"{id_match.group(1)}: lat={lat}, lon={lon}")

print(f"Fixed big_ entries (now BE, lat<50.75 or lon<3.30): {be_fixed}")
print(f"Remaining wrong (big_ NL with lat<50.75 or lon<3.30): {len(wrong_nl)}")
for w in wrong_nl:
    print(f"  {w}")
