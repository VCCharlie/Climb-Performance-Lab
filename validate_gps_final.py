#!/usr/bin/env python3
"""
GPS Coordinate Validation for Climb-Performance-Lab
This script validates coordinates for all climbs against country-specific bounding boxes
"""

import re
import sys
from pathlib import Path
from collections import defaultdict

# Bounding boxes for each country
BBOXES = {
    "NL": {"latMin": 50.75, "latMax": 53.60, "lonMin": 3.30, "lonMax": 7.30},
    "BE": {"latMin": 49.50, "latMax": 51.55, "lonMin": 2.50, "lonMax": 6.55},
    "LU": {"latMin": 49.40, "latMax": 50.20, "lonMin": 5.70, "lonMax": 6.55},
    "FR": {"latMin": 41.30, "latMax": 51.10, "lonMin": -5.20, "lonMax": 9.70},
    "DE": {"latMin": 47.27, "latMax": 55.10, "lonMin": 5.87, "lonMax": 15.05},
    "AT": {"latMin": 46.37, "latMax": 49.02, "lonMin": 9.53, "lonMax": 17.20},
    "IT": {"latMin": 35.49, "latMax": 47.10, "lonMin": 6.62, "lonMax": 18.55},
    "CH": {"latMin": 45.82, "latMax": 47.81, "lonMin": 5.95, "lonMax": 10.55},
    "ES": {"latMin": 35.17, "latMax": 43.82, "lonMin": -9.40, "lonMax": 4.60},
    "PT": {"latMin": 36.83, "latMax": 42.20, "lonMin": -9.52, "lonMax": -6.19},
    "GB": {"latMin": 49.87, "latMax": 60.90, "lonMin": -8.65, "lonMax": 1.77},
}

def parse_climbs_file(filepath):
    """Parse JavaScript climbs_extended.js file and extract climb entries"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    climbs = []
    
    # Match individual climb objects within RAW_CLIMBS array
    # Looking for patterns like: { "id": "...", "name": "...", "country": "...", ... "lat": X, "lon": Y, ... }
    pattern = r'"id":\s*"([^"]+)"\s*,\s*"name":\s*"([^"]+)"\s*,\s*"country":\s*"([^"]+)".*?"lat":\s*([-\d.]+)\s*,\s*"lon":\s*([-\d.]+)(?:.*?"url":\s*"([^"]*)")?(?:.*?"bigUrl":\s*"([^"]*)")?'
    
    for match in re.finditer(pattern, content, re.DOTALL):
        try:
            climb = {
                'id': match.group(1),
                'name': match.group(2),
                'country': match.group(3),
                'lat': float(match.group(4)),
                'lon': float(match.group(5)),
                'url': match.group(6) or '',
                'bigUrl': match.group(7) or ''
            }
            climbs.append(climb)
        except (ValueError, TypeError, IndexError) as e:
            # Skip entries that fail to parse
            continue
    
    return climbs

def is_coordinate_valid(lat, lon, bbox):
    """Check if coordinates fall within the bounding box"""
    try:
        lat = float(lat)
        lon = float(lon)
        return (bbox['latMin'] <= lat <= bbox['latMax'] and 
                bbox['lonMin'] <= lon <= bbox['lonMax'])
    except (ValueError, TypeError):
        return False

def validate_climbs(climbs):
    """Validate all climbs against their country bounding boxes"""
    summary = defaultdict(lambda: {'total': 0, 'bad': 0})
    bad_entries = defaultdict(list)
    total_valid = 0
    
    for climb in climbs:
        country = climb['country']
        
        # Skip ZWIFT entries
        if country == 'ZWIFT':
            continue
        
        # For unknown countries, just count them but don't validate
        if country not in BBOXES:
            summary[country]['total'] += 1
            continue
        
        summary[country]['total'] += 1
        total_valid += 1
        
        # Validate coordinates against country bounding box
        bbox = BBOXES[country]
        if not is_coordinate_valid(climb['lat'], climb['lon'], bbox):
            summary[country]['bad'] += 1
            bad_entries[country].append(climb)
    
    return total_valid, dict(summary), dict(bad_entries)

def format_output(total_valid, summary, bad_entries):
    """Format the validation results for output"""
    lines = []
    
    lines.append(f"Total entries: {total_valid}\n")
    lines.append("=== SUMMARY ===")
    
    # Sort countries and display summary
    for country in sorted(summary.keys()):
        stats = summary[country]
        lines.append(f"{country}: {stats['total']} total, {stats['bad']} bad")
    
    lines.append("\n=== BAD ENTRIES ===")
    
    if not bad_entries:
        lines.append("No bad entries found!")
    else:
        for country in sorted(bad_entries.keys()):
            lines.append(f"--- {country} ---")
            for entry in sorted(bad_entries[country], key=lambda e: e['id']):
                # Use url if available, otherwise bigUrl
                source_url = entry['url'] if entry['url'] else (entry['bigUrl'] or 'no source')
                lines.append(f"  {entry['id']} | {entry['name']} | lat={entry['lat']} | lon={entry['lon']} | {source_url}")
    
    return '\n'.join(lines)

def main():
    # File paths
    input_file = Path(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js')
    output_file = Path(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt')
    
    print(f"Reading {input_file}...")
    
    if not input_file.exists():
        print(f"ERROR: File not found: {input_file}")
        sys.exit(1)
    
    # Parse the climbs file
    climbs = parse_climbs_file(str(input_file))
    print(f"✓ Parsed {len(climbs)} climb entries")
    
    # Validate climbs
    print("Validating GPS coordinates...")
    total_valid, summary, bad_entries = validate_climbs(climbs)
    print(f"✓ Validation complete. Checked {total_valid} entries with known countries")
    
    # Generate formatted output
    output = format_output(total_valid, summary, bad_entries)
    
    # Save results to file
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"✓ Results saved to {output_file}\n")
    
    # Display results
    print("=" * 80)
    print(output)
    print("=" * 80)

if __name__ == '__main__':
    main()
