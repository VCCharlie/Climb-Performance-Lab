"""
GPS Coordinate Validation Script for climbs_extended.js
Parses all climb entries and validates lat/lng against country bounding boxes.
"""
import re
from pathlib import Path
from datetime import datetime

BOUNDING_BOXES = {
    "FR": {"lat": (41.3, 51.1), "lng": (-5.1, 9.6)},
    "IT": {"lat": (36.6, 47.1), "lng": (6.6, 18.5)},
    "CH": {"lat": (45.8, 47.8), "lng": (5.9, 10.5)},
    "ES": {"lat": (35.9, 43.8), "lng": (-9.3, 4.3)},
    "BE": {"lat": (49.5, 51.5), "lng": (2.5, 6.4)},
    "NL": {"lat": (50.8, 53.6), "lng": (3.3, 7.2)},
    "DE": {"lat": (47.3, 55.1), "lng": (5.9, 15.0)},
    "AT": {"lat": (46.4, 49.0), "lng": (9.5, 17.2)},
    "PT": {"lat": (36.8, 42.2), "lng": (-9.5, -6.2)},
    "GB": {"lat": (49.9, 61.0), "lng": (-8.2, 2.0)},
}

def extract_field(block, field_name):
    """Extract a string or numeric field value from a JS object block."""
    pattern = rf'"{field_name}"\s*:\s*"([^"]*)"'
    match = re.search(pattern, block)
    if match:
        return match.group(1)
    pattern = rf'"{field_name}"\s*:\s*([^\s,\n\}}]+)'
    match = re.search(pattern, block)
    if match:
        return match.group(1).strip()
    return None

def parse_number(value):
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def parse_climbs(js_content):
    """Extract all climb objects from the RAW_CLIMBS array."""
    # Find the RAW_CLIMBS array content
    raw_match = re.search(r'const RAW_CLIMBS\s*=\s*\[', js_content)
    if not raw_match:
        raise ValueError("Could not find RAW_CLIMBS array in file")

    start = raw_match.end()

    # Split into individual objects by finding top-level { } blocks
    climbs = []
    depth = 0
    obj_start = None

    for i, ch in enumerate(js_content[start:], start=start):
        if ch == '{':
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and obj_start is not None:
                block = js_content[obj_start:i + 1]
                name = extract_field(block, 'name')
                country = extract_field(block, 'country')
                climb_id = extract_field(block, 'id')

                lat_raw = extract_field(block, 'lat')
                lon_raw = extract_field(block, 'lon') or extract_field(block, 'lng')

                lat = parse_number(lat_raw)
                lng = parse_number(lon_raw)

                if name or climb_id:
                    climbs.append({
                        'id': climb_id or '',
                        'name': name or climb_id or '(unnamed)',
                        'country': country or '',
                        'lat': lat,
                        'lng': lng,
                    })
                obj_start = None

        # Stop after the closing ] of RAW_CLIMBS
        if depth == 0 and obj_start is None and js_content[start:i + 1].count(']') > 0:
            # Check if we're past the array closing bracket
            pass

    return climbs

def validate_climb(climb):
    """Returns 'skip', 'valid', 'invalid', or 'missing'."""
    country = climb['country'].upper()
    if country == 'ZWIFT':
        return 'skip', None

    lat = climb['lat']
    lng = climb['lng']

    if lat is None or lng is None:
        return 'missing', None

    bbox = BOUNDING_BOXES.get(country)
    if bbox is None:
        # Unknown country — skip validation
        return 'skip', None

    lat_ok = bbox['lat'][0] <= lat <= bbox['lat'][1]
    lng_ok = bbox['lng'][0] <= lng <= bbox['lng'][1]

    if lat_ok and lng_ok:
        return 'valid', None
    else:
        return 'invalid', bbox

def generate_report(climbs):
    invalid = []
    missing = []
    valid_count = 0
    skipped_count = 0
    has_coords_count = 0

    for climb in climbs:
        country = climb['country'].upper()
        if country == 'ZWIFT':
            skipped_count += 1
            # Count as having coords if they exist
            if climb['lat'] is not None and climb['lng'] is not None:
                has_coords_count += 1
            continue

        if climb['lat'] is None or climb['lng'] is None:
            missing.append(climb)
        else:
            has_coords_count += 1
            status, bbox = validate_climb(climb)
            if status == 'valid':
                valid_count += 1
            elif status == 'invalid':
                invalid.append((climb, bbox))

    lines = [
        "GPS Coordinate Validation Report",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"Total climbs: {len(climbs)}",
        f"Climbs with coordinates: {has_coords_count}",
        f"Valid coordinates: {valid_count}",
        f"Invalid coordinates: {len(invalid)}",
        f"Missing coordinates: {len(missing)}",
        "",
    ]

    if invalid:
        lines.append("INVALID COORDINATES:")
        for climb, bbox in invalid:
            lines.append(
                f"- {climb['name']} ({climb['country']}): "
                f"lat={climb['lat']}, lng={climb['lng']} - OUTSIDE bounding box"
            )
            lines.append(
                f"  Expected: lat {bbox['lat'][0]}-{bbox['lat'][1]}, "
                f"lng {bbox['lng'][0]}-{bbox['lng'][1]}"
            )
        lines.append("")

    if missing:
        lines.append("MISSING COORDINATES:")
        for climb in missing:
            lines.append(f"- {climb['name']} ({climb['country']}): No GPS coordinates found")
        lines.append("")

    if not invalid and not missing:
        lines.append("All climbs with known countries have valid coordinates!")

    return "\n".join(lines)

def main():
    repo_root = Path(__file__).parent
    input_file = repo_root / "src" / "climbs_extended.js"
    output_file = repo_root / "validation_output.txt"

    print(f"Reading: {input_file}")
    content = input_file.read_text(encoding='utf-8')

    print("Parsing climbs...")
    climbs = parse_climbs(content)
    print(f"Found {len(climbs)} climbs")

    report = generate_report(climbs)
    output_file.write_text(report, encoding='utf-8')
    print(f"Report saved to: {output_file}")
    print()
    print(report)

if __name__ == '__main__':
    main()
