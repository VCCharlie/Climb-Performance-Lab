#!/usr/bin/env python3
"""Validate GPS coordinates in climbs_extended.js against bounding boxes."""

import re
import json
from collections import defaultdict

# Define bounding boxes
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
    """Read JavaScript file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    return content

def extract_raw_climbs(content):
    """Extract RAW_CLIMBS array from JavaScript content."""
    # Find the RAW_CLIMBS array
    m = re.search(r'const\s+RAW_CLIMBS\s*=\s*(\[)', content)
    if m:
        start = m.start(1)
        end = content.rindex(']') + 1
        raw_json = content[start:end]
    else:
        # Fallback: find the second array in the file
        first = content.index('[')
        start = content.index('[', first + 1)
        end = content.rindex(']') + 1
        raw_json = content[start:end]
    
    climbs = json.loads(raw_json)
    return climbs

def is_coordinate_valid(lat, lon, bbox):
    """Check if coordinates are within the bounding box."""
    if lat is None or lon is None:
        return False
    return (bbox["latMin"] <= lat <= bbox["latMax"] and 
            bbox["lonMin"] <= lon <= bbox["lonMax"])

def get_source_url(entry):
    """Get source URL from entry, preferring 'url' then 'bigUrl'."""
    if "url" in entry and entry["url"]:
        return entry["url"]
    elif "bigUrl" in entry and entry["bigUrl"]:
        return entry["bigUrl"]
    else:
        return "no source"

def main():
    filepath = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js"
    
    # Read and extract data
    content = read_js_file(filepath)
    climbs = extract_raw_climbs(content)
    
    # Validate entries
    stats = defaultdict(lambda: {"total": 0, "bad": 0})
    bad_entries = defaultdict(list)
    
    for entry in climbs:
        country = entry.get("country", "").upper()
        
        # Skip ZWIFT
        if country == "ZWIFT":
            continue
        
        # Skip if country not in BBOXES
        if country not in BBOXES:
            continue
        
        stats[country]["total"] += 1
        
        # Get coordinates
        lat = entry.get("lat")
        lon = entry.get("lon")
        
        # Check if coordinates are valid
        if not is_coordinate_valid(lat, lon, BBOXES[country]):
            stats[country]["bad"] += 1
            bad_entries[country].append(entry)
    
    # Print output
    total = sum(s['total'] for s in stats.values())
    print(f"Total entries: {total}")
    print()
    print("=== SUMMARY ===")
    
    for country in sorted(stats.keys()):
        total_c = stats[country]["total"]
        bad_c = stats[country]["bad"]
        print(f"{country}: {total_c} total, {bad_c} bad")
    
    if bad_entries:
        print()
        print("=== BAD ENTRIES ===")
        for country in sorted(bad_entries.keys()):
            print(f"--- {country} ---")
            for entry in bad_entries[country]:
                entry_id = entry.get("id", "N/A")
                name = entry.get("name", "N/A")
                lat = entry.get("lat", "N/A")
                lon = entry.get("lon", "N/A")
                source = get_source_url(entry)
                print(f"  {entry_id} | {name} | lat={lat} | lon={lon} | {source}")

if __name__ == "__main__":
    main()
