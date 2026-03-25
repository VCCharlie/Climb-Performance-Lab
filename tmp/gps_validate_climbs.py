#!/usr/bin/env python3
"""
GPS Coordinate Validation Script for Climb Performance Lab
Validates lat/lon coordinates against country bounding boxes
"""

import re
import json
from pathlib import Path
from collections import defaultdict

# Bounding boxes for European countries
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

def read_file(filepath):
    """Read the JavaScript file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def extract_climbs(content):
    """Extract all climb entries from RAW_CLIMBS"""
    climbs = []
    
    # Find the RAW_CLIMBS array
    match = re.search(r'const RAW_CLIMBS\s*=\s*\[(.*?)\];', content, re.DOTALL)
    if not match:
        print("ERROR: Could not find RAW_CLIMBS array")
        return climbs
    
    raw_climbs_content = match.group(1)
    
    # Split by objects (each object starts with { and ends with })
    # Use a more sophisticated approach to handle nested objects
    brace_count = 0
    current_object = ""
    
    for char in raw_climbs_content:
        current_object += char
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and current_object.strip():
                # Parse the object
                climb = parse_climb_object(current_object)
                if climb:
                    climbs.append(climb)
                current_object = ""
    
    return climbs

def parse_climb_object(obj_str):
    """Parse a single climb object"""
    climb = {}
    
    # Extract id
    id_match = re.search(r'"id"\s*:\s*["\']([^"\']+)["\']', obj_str)
    if id_match:
        climb['id'] = id_match.group(1)
    
    # Extract name
    name_match = re.search(r'"name"\s*:\s*"([^"]+)"', obj_str)
    if name_match:
        climb['name'] = name_match.group(1)
    
    # Extract country
    country_match = re.search(r'"country"\s*:\s*"([^"]+)"', obj_str)
    if country_match:
        climb['country'] = country_match.group(1)
    
    # Extract lat
    lat_match = re.search(r'"lat"\s*:\s*([-\d.]+)', obj_str)
    if lat_match:
        try:
            climb['lat'] = float(lat_match.group(1))
        except ValueError:
            pass
    
    # Extract lon
    lon_match = re.search(r'"lon"\s*:\s*([-\d.]+)', obj_str)
    if lon_match:
        try:
            climb['lon'] = float(lon_match.group(1))
        except ValueError:
            pass
    
    # Extract url
    url_match = re.search(r'"url"\s*:\s*"([^"]+)"', obj_str)
    if url_match:
        climb['url'] = url_match.group(1)
    
    # Extract bigUrl
    big_url_match = re.search(r'"bigUrl"\s*:\s*"([^"]+)"', obj_str)
    if big_url_match:
        climb['bigUrl'] = big_url_match.group(1)
    
    return climb if 'id' in climb else None

def is_valid_coordinate(climb):
    """Check if coordinate is within country bounding box"""
    country = climb.get('country')
    lat = climb.get('lat')
    lon = climb.get('lon')
    
    # Skip ZWIFT
    if country == 'ZWIFT':
        return True, 'ZWIFT'
    
    # Check if country is known
    if country not in BBOXES:
        return True, 'UNKNOWN_COUNTRY'
    
    # Check if lat/lon exist
    if lat is None or lon is None:
        return False, 'MISSING_COORDS'
    
    bbox = BBOXES[country]
    
    # Check bounds
    if bbox['latMin'] <= lat <= bbox['latMax'] and bbox['lonMin'] <= lon <= bbox['lonMax']:
        return True, 'VALID'
    else:
        return False, 'OUT_OF_BOUNDS'

def main():
    input_file = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js'
    output_file = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt'
    
    print(f"Reading from: {input_file}")
    print(f"Writing to: {output_file}")
    print()
    
    # Read and parse
    content = read_file(input_file)
    climbs = extract_climbs(content)
    
    print(f"Extracted {len(climbs)} climbs")
    print()
    
    # Categorize climbs
    summary = defaultdict(lambda: {'total': 0, 'bad': 0, 'skipped': 0})
    bad_entries = defaultdict(list)
    
    for climb in climbs:
        country = climb.get('country', 'UNKNOWN')
        is_valid, reason = is_valid_coordinate(climb)
        
        if reason in ['ZWIFT', 'UNKNOWN_COUNTRY']:
            summary[country]['skipped'] += 1
        else:
            summary[country]['total'] += 1
            if not is_valid:
                summary[country]['bad'] += 1
                bad_entries[country].append({
                    'climb': climb,
                    'reason': reason
                })
    
    # Generate output
    output_lines = []
    output_lines.append(f"Total entries: {len(climbs)}\n")
    output_lines.append("=== SUMMARY ===")
    
    # Sort countries for consistent output
    for country in sorted(summary.keys()):
        stats = summary[country]
        output_lines.append(f"{country}: {stats['total']} total, {stats['bad']} bad (skipped: {stats['skipped']})")
    
    output_lines.append("\n=== BAD ENTRIES ===")
    
    for country in sorted(bad_entries.keys()):
        if bad_entries[country]:
            output_lines.append(f"--- {country} ---")
            for item in bad_entries[country]:
                climb = item['climb']
                reason = item['reason']
                output_lines.append(
                    f"  {climb.get('id', 'N/A')} | {climb.get('name', 'N/A')} | "
                    f"lat={climb.get('lat', 'N/A')} | lon={climb.get('lon', 'N/A')} | "
                    f"{reason} | {climb.get('url', 'N/A')}"
                )
    
    # Write output
    output_text = '\n'.join(output_lines)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(output_text)
    
    print(f"\n✓ Results saved to {output_file}\n")
    print("=== OUTPUT ===")
    print(output_text)

if __name__ == '__main__':
    main()
