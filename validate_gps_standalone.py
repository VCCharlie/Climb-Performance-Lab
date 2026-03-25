#!/usr/bin/env python3
"""
GPS Coordinate Validation for Climb-Performance-Lab
Standalone validation script
"""

import re
import json
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# Bounding boxes for each country (from task requirements)
BBOXES = {
    "FR": {"latMin": 41.3, "latMax": 51.1, "lonMin": -5.1, "lonMax": 9.6},
    "IT": {"latMin": 36.6, "latMax": 47.1, "lonMin": 6.6, "lonMax": 18.5},
    "CH": {"latMin": 45.8, "latMax": 47.8, "lonMin": 5.9, "lonMax": 10.5},
    "ES": {"latMin": 35.9, "latMax": 43.8, "lonMin": -9.3, "lonMax": 4.3},
    "BE": {"latMin": 49.5, "latMax": 51.5, "lonMin": 2.5, "lonMax": 6.4},
    "NL": {"latMin": 50.8, "latMax": 53.6, "lonMin": 3.3, "lonMax": 7.2},
    "DE": {"latMin": 47.3, "latMax": 55.1, "lonMin": 5.9, "lonMax": 15.0},
    "AT": {"latMin": 46.4, "latMax": 49.0, "lonMin": 9.5, "lonMax": 17.2},
    "PT": {"latMin": 36.8, "latMax": 42.2, "lonMin": -9.5, "lonMax": -6.2},
    "GB": {"latMin": 49.9, "latMax": 61.0, "lonMin": -8.2, "lonMax": 2.0},
}

def parse_climbs_file(filepath):
    """Parse the JavaScript climbs_extended.js file"""
    print(f"Reading {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    climbs = []
    
    # Find all climb objects - match from "id" to the closing brace
    # Pattern: matches climb objects in the RAW_CLIMBS array
    pattern = r'\{\s*"id":\s*"([^"]+)"\s*,\s*"name":\s*"([^"]+)"\s*,\s*"country":\s*"([^"]+)"[^}]*?"lat":\s*([-\d.]+)[^}]*?"lon":\s*([-\d.]+)[^}]*?\}'
    
    for match in re.finditer(pattern, content, re.DOTALL):
        try:
            climb = {
                'id': match.group(1),
                'name': match.group(2),
                'country': match.group(3),
                'lat': float(match.group(4)),
                'lon': float(match.group(5)),
            }
            climbs.append(climb)
        except (ValueError, TypeError, IndexError) as e:
            print(f"  Warning: Failed to parse entry: {e}")
            continue
    
    print(f"✓ Parsed {len(climbs)} climb entries\n")
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
    total_climbs = len(climbs)
    climbs_with_coords = 0
    valid_count = 0
    invalid_entries = []
    missing_entries = []
    unknown_countries = defaultdict(list)
    zwift_entries = []
    
    for climb in climbs:
        country = climb['country']
        
        # Check for ZWIFT entries
        if country == 'ZWIFT':
            zwift_entries.append(climb)
            continue
        
        # Check for unknown countries
        if country not in BBOXES:
            unknown_countries[country].append(climb)
            continue
        
        # Check if coordinates exist
        lat = climb.get('lat')
        lon = climb.get('lon')
        
        if lat is None or lon is None:
            missing_entries.append(climb)
            continue
        
        climbs_with_coords += 1
        
        # Validate coordinates against country bounding box
        bbox = BBOXES[country]
        if is_coordinate_valid(lat, lon, bbox):
            valid_count += 1
        else:
            invalid_entries.append((climb, bbox))
    
    return {
        'total_climbs': total_climbs,
        'climbs_with_coords': climbs_with_coords,
        'valid_count': valid_count,
        'invalid_count': len(invalid_entries),
        'missing_count': len(missing_entries),
        'invalid_entries': invalid_entries,
        'missing_entries': missing_entries,
        'zwift_entries': zwift_entries,
        'unknown_countries': dict(unknown_countries)
    }

def format_output(results):
    """Format validation results for output"""
    lines = []
    
    lines.append("GPS Coordinate Validation Report")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append(f"Total climbs: {results['total_climbs']}")
    lines.append(f"Climbs with coordinates: {results['climbs_with_coords']}")
    lines.append(f"Valid coordinates: {results['valid_count']}")
    lines.append(f"Invalid coordinates: {results['invalid_count']}")
    lines.append(f"Missing coordinates: {results['missing_count']}")
    
    if results['zwift_entries']:
        lines.append(f"ZWIFT entries (skipped): {len(results['zwift_entries'])}")
    
    if results['unknown_countries']:
        lines.append(f"Unknown countries: {len(results['unknown_countries'])}")
        for country, entries in sorted(results['unknown_countries'].items()):
            lines.append(f"  {country}: {len(entries)} entries")
    
    # Invalid entries section
    if results['invalid_entries']:
        lines.append("")
        lines.append("INVALID COORDINATES:")
        for climb, bbox in sorted(results['invalid_entries'], key=lambda x: x[0]['id']):
            country = climb['country']
            lat = climb.get('lat', 'N/A')
            lon = climb.get('lon', 'N/A')
            lines.append(f"- {climb['name']} ({country}): lat={lat}, lng={lon} - OUTSIDE bounding box")
            lines.append(f"  Expected: lat {bbox['latMin']}-{bbox['latMax']}, lng {bbox['lonMin']}-{bbox['lonMax']}")
    
    # Missing entries section
    if results['missing_entries']:
        lines.append("")
        lines.append("MISSING COORDINATES:")
        for climb in sorted(results['missing_entries'], key=lambda x: x['id']):
            lines.append(f"- {climb['name']} ({climb['country']}): No GPS coordinates found")
    
    return '\n'.join(lines)

def main():
    # File paths
    input_file = Path(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js')
    output_file = Path(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt')
    
    if not input_file.exists():
        print(f"ERROR: File not found: {input_file}")
        return False
    
    # Parse the climbs file
    climbs = parse_climbs_file(str(input_file))
    
    # Validate climbs
    print("Validating GPS coordinates against bounding boxes...")
    results = validate_climbs(climbs)
    print(f"✓ Validation complete\n")
    
    # Generate formatted output
    output = format_output(results)
    
    # Save results to file
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"✓ Results saved to {output_file}\n")
    
    # Display results
    print("=" * 80)
    print(output)
    print("=" * 80)
    
    return True

if __name__ == '__main__':
    try:
        success = main()
        exit(0 if success else 1)
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
