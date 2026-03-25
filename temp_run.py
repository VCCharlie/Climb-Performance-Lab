#!/usr/bin/env python3
import subprocess
import sys

# Try first script
try:
    result = subprocess.run(
        [sys.executable, 'validate_coords.py'],
        cwd=r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab',
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    sys.exit(result.returncode)
except Exception as e:
    print(f"First script failed: {e}")
    try:
        result = subprocess.run(
            [sys.executable, r'scripts/analyze_coords.py'],
            cwd=r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab',
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        sys.exit(result.returncode)
    except Exception as e2:
        print(f"Second script also failed: {e2}")
        sys.exit(1)
