#!/usr/bin/env python3
"""GPS Coordinate Validation for Climb-Performance-Lab"""

import re
import json
from pathlib import Path
from collections import defaultdict

# Bounding boxes for validation
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
    """Parse the JavaScript climbs_extended.js file using regex"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    climbs = []
    
    # Match all object literals in the RAW_CLIMBS array
    # Pattern matches { ... } objects
    pattern = r'\{\s*"id":\s*"([^"]+)"\s*,\s*"name":\s*"([^"]+)"\s*,\s*"country":\s*"([^"]+)".*?"lat":\s*([-\d.]+)\s*,\s*"lon":\s*([-\d.]+).*?"url":\s*"([^"]*)"\s*(?:,\s*"bigUrl":\s*"([^"]*)")?'
    
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
        except (ValueError, IndexError):
            # Skip entries with invalid coordinate format
            pass
    
    return climbs

def is_coordinate_valid(lat, lon, bbox):
    """Check if coordinates are within bounding box"""
    return (bbox['latMin'] <= lat <= bbox['latMax'] and 
            bbox['lonMin'] <= lon <= bbox['lonMax'])

def validate_climbs(climbs):
    """Validate all climbs and return summary and bad entries"""
    summary = defaultdict(lambda: {'total': 0, 'bad': 0})
    bad_entries = defaultdict(list)
    total = 0
    
    for climb in climbs:
        country = climb['country']
        
        # Skip ZWIFT
        if country == 'ZWIFT':
            continue
        
        # Skip unknown countries but still track them
        if country not in BBOXES:
            summary[country]['total'] += 1
            continue
        
        # Initialize country in summary if not exists
        summary[country]['total'] += 1
        total += 1
        
        # Check if coordinates are valid
        bbox = BBOXES[country]
        if not is_coordinate_valid(climb['lat'], climb['lon'], bbox):
            summary[country]['bad'] += 1
            bad_entries[country].append(climb)
    
    return total, dict(summary), dict(bad_entries)

def generate_output(total, summary, bad_entries):
    """Generate formatted output"""
    lines = []
    
    lines.append(f"Total entries: {total}\n")
    lines.append("=== SUMMARY ===")
    
    # Sort by country code
    for country in sorted(summary.keys()):
        stats = summary[country]
        lines.append(f"{country}: {stats['total']} total, {stats['bad']} bad")
    
    lines.append("\n=== BAD ENTRIES ===")
    
    if not bad_entries:
        lines.append("No bad entries found!")
    else:
        for country in sorted(bad_entries.keys()):
            lines.append(f"--- {country} ---")
            for entry in bad_entries[country]:
                url = entry['url'] or entry['bigUrl'] or 'no source'
                lines.append(f"  {entry['id']} | {entry['name']} | lat={entry['lat']} | lon={entry['lon']} | {url}")
    
    return '\n'.join(lines)

def main():
    # Read the climbs file
    filepath = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js'
    
    print(f"Reading {filepath}...")
    climbs = parse_climbs_file(filepath)
    print(f"Parsed {len(climbs)} climb entries")
    
    # Validate climbs
    print("Validating coordinates...")
    total, summary, bad_entries = validate_climbs(climbs)
    
    # Generate output
    output = generate_output(total, summary, bad_entries)
    
    # Save to file
    output_filepath = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt'
    with open(output_filepath, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"\nResults saved to {output_filepath}\n")
    print("=" * 80)
    print(output)
    print("=" * 80)

if __name__ == '__main__':
    main()
