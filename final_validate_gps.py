#!/usr/bin/env python3
"""
GPS Coordinate Validation for Climb Performance Lab
Uses only stdlib: re, pathlib, datetime
"""

import re
from pathlib import Path
from datetime import datetime
import os

# Set working directory
os.chdir(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab')

# Country bounding boxes
BOUNDING_BOXES = {
    "FR": (41.3, 51.1, -5.1, 9.6),
    "IT": (36.6, 47.1, 6.6, 18.5),
    "CH": (45.8, 47.8, 5.9, 10.5),
    "ES": (35.9, 43.8, -9.3, 4.3),
    "BE": (49.5, 51.5, 2.5, 6.4),
    "NL": (50.8, 53.6, 3.3, 7.2),
    "DE": (47.3, 55.1, 5.9, 15.0),
    "AT": (46.4, 49.0, 9.5, 17.2),
    "PT": (36.8, 42.2, -9.5, -6.2),
    "GB": (49.9, 61.0, -8.2, 2.0),
}

def extract_climbs(js_content):
    """Extract climb objects from RAW_CLIMBS array using regex."""
    climbs = []
    id_pattern = r'"id"\s*:\s*"([^"]*)"'
    name_pattern = r'"name"\s*:\s*"([^"]*)"'
    country_pattern = r'"country"\s*:\s*"([^"]*)"'
    lat_pattern = r'"lat"\s*:\s*(-?\d+\.?\d*)'
    lon_pattern = r'"(?:lon|lng)"\s*:\s*(-?\d+\.?\d*)'
    
    # Find the RAW_CLIMBS array
    start_idx = js_content.find('const RAW_CLIMBS = [')
    if start_idx == -1:
        return climbs
    
    start_idx = js_content.find('[', start_idx) + 1
    end_idx = js_content.find('];', start_idx)
    
    if start_idx == -1 or end_idx == -1:
        return climbs
    
    array_content = js_content[start_idx:end_idx]
    
    # Split by },{ pattern to get individual objects
    objects = re.split(r'\}\s*,\s*\{', array_content)
    
    for obj_str in objects:
        obj_str = obj_str.strip()
        if obj_str.startswith('{'):
            obj_str = obj_str[1:]
        if obj_str.endswith('}'):
            obj_str = obj_str[:-1]
        
        climb = {}
        
        # Extract fields using regex
        id_match = re.search(id_pattern, obj_str)
        if id_match:
            climb['id'] = id_match.group(1)
        
        name_match = re.search(name_pattern, obj_str)
        if name_match:
            climb['name'] = name_match.group(1)
        
        country_match = re.search(country_pattern, obj_str)
        if country_match:
            climb['country'] = country_match.group(1)
        
        lat_match = re.search(lat_pattern, obj_str)
        if lat_match:
            try:
                climb['lat'] = float(lat_match.group(1))
            except ValueError:
                climb['lat'] = None
        else:
            climb['lat'] = None
        
        lon_match = re.search(lon_pattern, obj_str)
        if lon_match:
            try:
                climb['lon'] = float(lon_match.group(1))
            except ValueError:
                climb['lon'] = None
        else:
            climb['lon'] = None
        
        if 'id' in climb and 'name' in climb:
            climbs.append(climb)
    
    return climbs

def validate_coordinates(lat, lon, country):
    """Validate coordinates against country bounding boxes."""
    if country == "ZWIFT":
        return True, None
    
    if country not in BOUNDING_BOXES:
        return None, f"Unknown country: {country}"
    
    min_lat, max_lat, min_lon, max_lon = BOUNDING_BOXES[country]
    
    if lat is None or lon is None:
        return None, "Missing coordinates"
    
    if not (min_lat <= lat <= max_lat and min_lon <= lon <= max_lon):
        return False, f"OUTSIDE bounding box. Expected: lat {min_lat}-{max_lat}, lng {min_lon}-{max_lon}"
    
    return True, None

# Main execution
print("GPS Coordinate Validation Report")
print("-" * 50)

# Read file
print("Reading src/climbs_extended.js...")
js_content = Path('src/climbs_extended.js').read_text(encoding='utf-8')
print(f"File size: {len(js_content)} characters")

# Extract climbs
print("Parsing climb data...")
climbs = extract_climbs(js_content)
print(f"Found {len(climbs)} climbs")

# Validate
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
total = len(climbs)
with_coords = sum(1 for c in climbs if c.get('lat') is not None and c.get('lon') is not None)
valid = 0
invalid = []
missing = []

for climb in climbs:
    is_valid, error = validate_coordinates(climb.get('lat'), climb.get('lon'), climb.get('country', ''))
    if error == "Missing coordinates":
        missing.append(climb)
    elif is_valid is False:
        invalid.append((climb, error))
    elif is_valid is True:
        valid += 1

# Generate report
report = [
    "GPS Coordinate Validation Report",
    f"Generated: {timestamp}",
    f"Total climbs: {total}",
    f"Climbs with coordinates: {with_coords}",
    f"Valid coordinates: {valid}",
    f"Invalid coordinates: {len(invalid)}",
    f"Missing coordinates: {len(missing)}",
    ""
]

if invalid:
    report.append("INVALID COORDINATES:")
    for climb, error in invalid:
        name = climb.get('name', 'Unknown')
        country = climb.get('country', 'Unknown')
        lat = climb.get('lat', 'N/A')
        lon = climb.get('lon', 'N/A')
        report.append(f"- {name} ({country}): lat={lat}, lng={lon} - {error}")
    report.append("")

if missing:
    report.append("MISSING COORDINATES:")
    for climb in missing:
        name = climb.get('name', 'Unknown')
        country = climb.get('country', 'Unknown')
        report.append(f"- {name} ({country}): No GPS coordinates found")
    report.append("")

report_text = "\n".join(report)

# Save to file
output_path = Path('validation_output.txt')
output_path.write_text(report_text)
print(f"\nReport saved to {output_path.absolute()}")

# Print report
print("\n" + "=" * 70)
print(report_text)
print("=" * 70)
