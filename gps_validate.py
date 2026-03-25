#!/usr/bin/env python3
"""
GPS Coordinate Validation Script
Validates climb data from climbs_extended.js against country bounding boxes
"""

import re
import json
from pathlib import Path
from collections import defaultdict

# Define bounding boxes for each country
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

def read_js_file(filepath):
    """Read and parse JavaScript climbs data"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    return content

def extract_climbs(js_content):
    """Extract RAW_CLIMBS array from JavaScript content using regex"""
    # Find the RAW_CLIMBS array start
    match = re.search(r'const\s+RAW_CLIMBS\s*=\s*\[(.*?)\]\s*;', js_content, re.DOTALL)
    if not match:
        print("ERROR: Could not find RAW_CLIMBS array")
        return []
    
    array_content = match.group(1)
    climbs = []
    
    # Split by opening braces to identify objects
    # More robust: find each {... } object
    object_pattern = r'\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'
    
    for obj_match in re.finditer(r'\{(?:[^{}]++|(?:\{(?:[^{}]++|(?:\{[^{}]*+\}))*+\}))*+\}', array_content):
        obj_str = obj_match.group(0)
        
        climb = {}
        
        # Extract each field
        id_match = re.search(r'"id"\s*:\s*["\']([^"\']*)["\']', obj_str)
        if id_match:
            climb['id'] = id_match.group(1)
        
        name_match = re.search(r'"name"\s*:\s*["\']([^"\']*)["\']', obj_str)
        if name_match:
            climb['name'] = name_match.group(1)
        
        country_match = re.search(r'"country"\s*:\s*["\']([^"\']*)["\']', obj_str)
        if country_match:
            climb['country'] = country_match.group(1)
        
        # Extract lat - must handle floats
        lat_match = re.search(r'"lat"\s*:\s*([-+]?\d*\.?\d+)', obj_str)
        if lat_match:
            climb['lat'] = float(lat_match.group(1))
        
        # Extract lon - must handle floats
        lon_match = re.search(r'"lon"\s*:\s*([-+]?\d*\.?\d+)', obj_str)
        if lon_match:
            climb['lon'] = float(lon_match.group(1))
        
        url_match = re.search(r'"url"\s*:\s*["\']([^"\']*)["\']', obj_str)
        if url_match:
            climb['url'] = url_match.group(1)
        
        # Only add if we have essential fields
        if 'id' in climb and 'country' in climb and 'lat' in climb and 'lon' in climb:
            climbs.append(climb)
    
    return climbs

def validate_coordinates(climbs):
    """Validate coordinates against bounding boxes"""
    stats = defaultdict(lambda: {'total': 0, 'bad': []})
    
    for climb in climbs:
        country = climb.get('country', '').strip()
        
        # Skip ZWIFT
        if country == 'ZWIFT':
            continue
        
        # Skip unknown countries
        if country not in BBOXES:
            continue
        
        stats[country]['total'] += 1
        
        bbox = BBOXES[country]
        lat = climb.get('lat')
        lon = climb.get('lon')
        
        # Check if coordinates are within bounding box
        if lat is not None and lon is not None:
            if not (bbox['latMin'] <= lat <= bbox['latMax'] and 
                    bbox['lonMin'] <= lon <= bbox['lonMax']):
                stats[country]['bad'].append(climb)
    
    return stats

def format_output(stats, climbs_count):
    """Format validation output"""
    lines = []
    lines.append(f"Total entries: {climbs_count}\n")
    lines.append("=== SUMMARY ===")
    
    # Summary section
    for country in sorted(stats.keys()):
        total = stats[country]['total']
        bad_count = len(stats[country]['bad'])
        lines.append(f"{country}: {total} total, {bad_count} bad")
    
    lines.append("\n=== BAD ENTRIES ===")
    
    # Bad entries section
    for country in sorted(stats.keys()):
        bad_entries = stats[country]['bad']
        if bad_entries:
            lines.append(f"--- {country} ---")
            for climb in bad_entries:
                id_val = climb.get('id', 'N/A')
                name_val = climb.get('name', 'N/A')
                lat_val = climb.get('lat', 'N/A')
                lon_val = climb.get('lon', 'N/A')
                url_val = climb.get('url', 'N/A')
                lines.append(f"  {id_val} | {name_val} | lat={lat_val} | lon={lon_val} | {url_val}")
    
    return '\n'.join(lines)

def main():
    input_file = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js"
    output_file = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt"
    
    # Read the JavaScript file
    print(f"Reading {input_file}...")
    js_content = read_js_file(input_file)
    
    # Extract climbs
    print("Extracting climbs from RAW_CLIMBS array...")
    climbs = extract_climbs(js_content)
    print(f"Found {len(climbs)} climbs")
    
    # Validate coordinates
    print("Validating coordinates against bounding boxes...")
    stats = validate_coordinates(climbs)
    
    # Generate output
    output = format_output(stats, len(climbs))
    
    # Save to file
    print(f"Saving results to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(output)
    
    # Print results
    print("\n" + "="*60)
    print(output)
    print("="*60)
    print(f"\nResults saved to {output_file}")

if __name__ == '__main__':
    main()
