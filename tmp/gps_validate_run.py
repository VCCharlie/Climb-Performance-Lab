#!/usr/bin/env python3
"""
GPS Coordinate Validation Script
Validates climb coordinates against country bounding boxes
"""

import re
import json
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

def read_climbs_file(filepath):
    """Read and parse the climbs_extended.js file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    return content

def extract_climbs(content):
    """Extract climb entries from JavaScript content"""
    climbs = []
    
    # Find the RAW_CLIMBS array
    match = re.search(r'const RAW_CLIMBS\s*=\s*\[(.*?)\](?:\s*;|\s*export)', content, re.DOTALL)
    if not match:
        print("ERROR: Could not find RAW_CLIMBS array")
        return climbs
    
    array_content = match.group(1)
    
    # Split by objects - look for patterns like { ... }
    # Find all complete climb objects
    obj_pattern = r'\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'
    objects = re.finditer(obj_pattern, array_content)
    
    for obj_match in objects:
        obj_str = '{' + obj_match.group(1) + '}'
        climb = parse_climb_object(obj_str)
        if climb:
            climbs.append(climb)
    
    return climbs

def parse_climb_object(obj_str):
    """Parse a single climb object"""
    climb = {}
    
    # Extract id
    id_match = re.search(r'"id"\s*:\s*["\']([^"\']+)["\']', obj_str)
    if id_match:
        climb['id'] = id_match.group(1)
    
    # Extract name
    name_match = re.search(r'"name"\s*:\s*["\']([^"\']+)["\']', obj_str)
    if name_match:
        climb['name'] = name_match.group(1)
    
    # Extract country
    country_match = re.search(r'"country"\s*:\s*["\']([^"\']+)["\']', obj_str)
    if country_match:
        climb['country'] = country_match.group(1)
    
    # Extract lat (can be decimal)
    lat_match = re.search(r'"lat"\s*:\s*([-+]?\d+\.?\d*)', obj_str)
    if lat_match:
        try:
            climb['lat'] = float(lat_match.group(1))
        except:
            pass
    
    # Extract lon (can be decimal)
    lon_match = re.search(r'"lon"\s*:\s*([-+]?\d+\.?\d*)', obj_str)
    if lon_match:
        try:
            climb['lon'] = float(lon_match.group(1))
        except:
            pass
    
    # Extract url
    url_match = re.search(r'"url"\s*:\s*["\']([^"\']+)["\']', obj_str)
    if url_match:
        climb['url'] = url_match.group(1)
    
    # Extract bigUrl
    bigurl_match = re.search(r'"bigUrl"\s*:\s*["\']([^"\']+)["\']', obj_str)
    if bigurl_match:
        climb['bigUrl'] = bigurl_match.group(1)
    
    # Only return if we have essential fields
    if 'id' in climb and 'country' in climb and 'lat' in climb and 'lon' in climb:
        return climb
    
    return None

def validate_coordinate(climb):
    """Check if a climb's coordinates are within its country's bounding box"""
    country = climb.get('country')
    lat = climb.get('lat')
    lon = climb.get('lon')
    
    if not country or not lat or not lon:
        return None, "Missing data"
    
    if country == "ZWIFT":
        return None, "ZWIFT entry (skipped)"
    
    if country not in BBOXES:
        return None, f"Unknown country: {country}"
    
    bbox = BBOXES[country]
    
    is_valid = (
        bbox['latMin'] <= lat <= bbox['latMax'] and
        bbox['lonMin'] <= lon <= bbox['lonMax']
    )
    
    return is_valid, "OK" if is_valid else "Out of bounds"

def main():
    filepath = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js'
    output_filepath = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt'
    
    # Read and parse
    print("Reading climbs_extended.js...")
    content = read_climbs_file(filepath)
    
    print("Extracting climb entries...")
    climbs = extract_climbs(content)
    print(f"Found {len(climbs)} climb entries")
    
    # Validate
    results = defaultdict(lambda: {'total': 0, 'bad': [], 'skipped': 0})
    
    for climb in climbs:
        country = climb.get('country', 'UNKNOWN')
        is_valid, reason = validate_coordinate(climb)
        
        if is_valid is None:
            results[country]['skipped'] += 1
            continue
        
        results[country]['total'] += 1
        
        if not is_valid:
            results[country]['bad'].append(climb)
    
    # Generate output
    output_lines = []
    output_lines.append(f"Total entries: {len(climbs)}\n")
    
    # Summary
    output_lines.append("=== SUMMARY ===")
    for country in sorted(results.keys()):
        if country == "UNKNOWN":
            continue
        data = results[country]
        total = data['total']
        bad_count = len(data['bad'])
        output_lines.append(f"{country}: {total} total, {bad_count} bad")
    
    output_lines.append("")
    
    # Bad entries
    output_lines.append("=== BAD ENTRIES ===")
    for country in sorted(results.keys()):
        if country == "UNKNOWN":
            continue
        data = results[country]
        if data['bad']:
            output_lines.append(f"--- {country} ---")
            for climb in data['bad']:
                lat = climb.get('lat', 'N/A')
                lon = climb.get('lon', 'N/A')
                name = climb.get('name', 'Unknown')
                url = climb.get('url', 'N/A')
                climb_id = climb.get('id', 'N/A')
                output_lines.append(f"  {climb_id} | {name} | lat={lat} | lon={lon} | {url}")
    
    # Write output
    output_text = '\n'.join(output_lines)
    
    with open(output_filepath, 'w', encoding='utf-8') as f:
        f.write(output_text)
    
    print(f"\nValidation complete. Results saved to {output_filepath}")
    print("\n" + "="*80)
    print(output_text)
    print("="*80)

if __name__ == "__main__":
    main()
