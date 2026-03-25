import re
import json
import sys
import os

# Bounding boxes for each country
BBOXES = {
    "NL": {"lat": (50.75, 53.60), "lon": (3.30, 7.30)},
    "BE": {"lat": (49.50, 51.55), "lon": (2.50, 6.55)},
    "LU": {"lat": (49.40, 50.20), "lon": (5.70, 6.55)},
    "FR": {"lat": (41.30, 51.10), "lon": (-5.20, 9.70)},
    "DE": {"lat": (47.27, 55.10), "lon": (5.87, 15.05)},
    "AT": {"lat": (46.37, 49.02), "lon": (9.53, 17.20)},
    "IT": {"lat": (35.49, 47.10), "lon": (6.62, 18.55)},
    "CH": {"lat": (45.82, 47.81), "lon": (5.95, 10.55)},
    "ES": {"lat": (35.17, 43.82), "lon": (-9.40, 4.60)},
    "PT": {"lat": (36.83, 42.20), "lon": (-9.52, -6.19)},
    "GB": {"lat": (49.87, 60.90), "lon": (-8.65, 1.77)},
}

def run_validation():
    filepath = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\src\climbs_extended.js"
    output_file = r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab\VALIDATION_RESULTS_OUTPUT.txt"
    
    output_lines = []
    
    try:
        output_lines.append("Reading file: " + filepath)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract the RAW_CLIMBS array
        m = re.search(r'const RAW_CLIMBS\s*=\s*(\[.*?\]);', content, re.DOTALL)
        if not m:
            output_lines.append("ERROR: Could not find RAW_CLIMBS array in climbs_extended.js")
            return '\n'.join(output_lines)

        data = json.loads(m.group(1))
        
        output_lines.append(f"Total entries loaded: {len(data)}")
        output_lines.append("")

        stats = {}  # country -> {total, bad, entries}

        for entry in data:
            country = entry.get("country", "")
            if country == "ZWIFT":
                continue
            if country not in BBOXES:
                continue
            
            lat = entry.get("lat")
            lon = entry.get("lon")
            
            if lat is None or lon is None:
                continue
            
            bbox = BBOXES[country]
            lat_min, lat_max = bbox["lat"]
            lon_min, lon_max = bbox["lon"]
            
            if country not in stats:
                stats[country] = {"total": 0, "bad": 0, "bad_entries": []}
            
            stats[country]["total"] += 1
            
            if not (lat_min <= lat <= lat_max and lon_min <= lon <= lon_max):
                stats[country]["bad"] += 1
                stats[country]["bad_entries"].append({
                    "id": entry.get("id", "N/A"),
                    "name": entry.get("name", "N/A"),
                    "country": country,
                    "lat": lat,
                    "lon": lon,
                    "source_verified": entry.get("source_verified", entry.get("source", "N/A"))
                })

        output_lines.append("=== PER-COUNTRY SUMMARY ===")
        output_lines.append(f"{'Country':<8} {'Total':>6} {'OK':>6} {'BAD':>6}")
        output_lines.append("-" * 30)
        total_total = 0
        total_bad = 0
        for c in ["NL", "BE", "LU", "FR", "DE", "AT", "IT", "CH", "ES", "PT", "GB"]:
            if c in stats:
                s = stats[c]
                ok = s["total"] - s["bad"]
                output_lines.append(f"{c:<8} {s['total']:>6} {ok:>6} {s['bad']:>6}")
                total_total += s["total"]
                total_bad += s["bad"]
            else:
                output_lines.append(f"{c:<8} {0:>6} {0:>6} {0:>6}")

        output_lines.append("-" * 30)
        output_lines.append(f"{'TOTAL':<8} {total_total:>6} {total_total-total_bad:>6} {total_bad:>6}")

        output_lines.append("")
        output_lines.append("=== BAD ENTRIES DETAIL ===")
        for c in ["NL", "BE", "LU", "FR", "DE", "AT", "IT", "CH", "ES", "PT", "GB"]:
            if c in stats and stats[c]["bad"] > 0:
                output_lines.append(f"\n--- {c} ({stats[c]['bad']} bad entries) ---")
                bbox = BBOXES[c]
                output_lines.append(f"    bbox: lat {bbox['lat'][0]}-{bbox['lat'][1]}, lon {bbox['lon'][0]}-{bbox['lon'][1]}")
                for e in stats[c]["bad_entries"]:
                    output_lines.append(f"  BAD: {e['id']:<40} | {e['name']:<45} | lat {e['lat']:<18} | lon {e['lon']:<18} | source: {e['source_verified']}")

        output_lines.append("")
        output_lines.append("=== VALIDATION COMPLETE ===")
        
        result = '\n'.join(output_lines)
        
        # Write output to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result)
        
        return result

    except Exception as e:
        import traceback
        output_lines.append(f"ERROR: {e}")
        output_lines.append(traceback.format_exc())
        return '\n'.join(output_lines)

if __name__ == "__main__":
    result = run_validation()
    print(result)
