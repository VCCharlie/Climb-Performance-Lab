#!/usr/bin/env python3
"""GPS Coordinate Validation Script for climbs_extended.js"""

import re
import json

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

def read_js_file(filepath):
    """Read the JavaScript file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def parse_climbs(js_content):
    """Parse RAW_CLIMBS array from JavaScript"""
    # Find the RAW_CLIMBS array
    match = re.search(r'const RAW_CLIMBS = \[(.*?)\];', js_content, re.DOTALL)
    if not match:
        print("ERROR: Could not find RAW_CLIMBS array")
        return []
    
    climbs_text = '[' + match.group(1) + ']'
    
    # Try to parse as JSON-like structure
    # Replace single quotes with double quotes, but be careful with strings
    climbs_text = climbs_text.replace("'", '"')
    
    climbs = []
    # Find all objects within the array
    obj_pattern = r'\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
    
    for obj_match in re.finditer(obj_pattern, match.group(0), re.DOTALL):
        obj_str = '{' + obj_match.group(1) + '}'
        try:
            # Try to convert JavaScript object to JSON
            obj_str = obj_str.replace("'", '"')
            climb = json.loads(obj_str)
            climbs.append(climb)
        except json.JSONDecodeError:
            # Fallback: parse manually with regex
            climb = {}
            # Extract id
            id_match = re.search(r'"id":\s*"([^"]*)"', obj_str)
            if id_match:
                climb['id'] = id_match.group(1)
            
            # Extract name
            name_match = re.search(r'"name":\s*"([^"]*)"', obj_str)
            if name_match:
                climb['name'] = name_match.group(1)
            
            # Extract country
            country_match = re.search(r'"country":\s*"([^"]*)"', obj_str)
            if country_match:
                climb['country'] = country_match.group(1)
            
            # Extract lat
            lat_match = re.search(r'"lat":\s*([\d.]+)', obj_str)
            if lat_match:
                climb['lat'] = float(lat_match.group(1))
            
            # Extract lon
            lon_match = re.search(r'"lon":\s*([-\d.]+)', obj_str)
            if lon_match:
                climb['lon'] = float(lon_match.group(1))
            
            # Extract url
            url_match = re.search(r'"url":\s*"([^"]*)"', obj_str)
            if url_match:
                climb['url'] = url_match.group(1)
            
            if climb and 'id' in climb:
                climbs.append(climb)
    
    return climbs

def validate_coordinates(climbs):
    """Validate GPS coordinates"""
    stats = {}
    bad_entries = {}
    
    for climb in climbs:
        if not all(k in climb for k in ['country', 'lat', 'lon', 'id', 'name']):
            continue
        
        country = climb['country']
        
        # Skip ZWIFT
        if country == "ZWIFT":
            continue
        
        # Skip unknown countries
        if country not in BBOXES:
            continue
        
        # Initialize stats for this country
        if country not in stats:
            stats[country] = {'total': 0, 'bad': 0}
            bad_entries[country] = []
        
        stats[country]['total'] += 1
        
        # Check if coordinates are within bounding box
        bbox = BBOXES[country]
        lat = climb['lat']
        lon = climb['lon']
        
        if not (bbox['latMin'] <= lat <= bbox['latMax'] and bbox['lonMin'] <= lon <= bbox['lonMax']):
            stats[country]['bad'] += 1
            bad_entries[country].append(climb)
    
    return stats, bad_entries

def main():
    filepath = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js"
    output_filepath = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\validation_output.txt"
    
    print(f"Reading {filepath}...")
    js_content = read_js_file(filepath)
    
    print("Parsing climbs...")
    climbs = parse_climbs(js_content)
    print(f"Found {len(climbs)} climbs")
    
    print("Validating coordinates...")
    stats, bad_entries = validate_coordinates(climbs)
    
    # Generate output
    output_lines = []
    
    # Calculate total entries
    total_entries = sum(s['total'] for s in stats.values())
    output_lines.append(f"Total entries: {total_entries}\n")
    
    # Summary section
    output_lines.append("=== SUMMARY ===")
    for country in sorted(stats.keys()):
        total = stats[country]['total']
        bad = stats[country]['bad']
        output_lines.append(f"{country}: {total} total, {bad} bad")
    
    # Bad entries section
    output_lines.append("\n=== BAD ENTRIES ===")
    for country in sorted(bad_entries.keys()):
        if bad_entries[country]:
            output_lines.append(f"--- {country} ---")
            for entry in bad_entries[country]:
                id_str = entry.get('id', 'N/A')
                name = entry.get('name', 'N/A')
                lat = entry.get('lat', 'N/A')
                lon = entry.get('lon', 'N/A')
                url = entry.get('url', 'N/A')
                output_lines.append(f"  {id_str} | {name} | lat={lat} | lon={lon} | {url}")
    
    # Write to file
    output_text = '\n'.join(output_lines)
    with open(output_filepath, 'w', encoding='utf-8') as f:
        f.write(output_text)
    
    print(f"\nResults saved to {output_filepath}")
    print("\n" + output_text)

if __name__ == '__main__':
    main()
