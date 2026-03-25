#!/usr/bin/env python3
import subprocess
import sys

# Try first command
try:
    result = subprocess.run(
        [sys.executable, "validate_coords.py"],
        cwd=r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab",
        capture_output=True,
        text=True,
        timeout=60
    )
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    sys.exit(result.returncode)
except FileNotFoundError:
    print("validate_coords.py not found, trying alternative...")
    try:
        result = subprocess.run(
            [sys.executable, "scripts/analyze_coords.py"],
            cwd=r"C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab",
            capture_output=True,
            text=True,
            timeout=60
        )
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        sys.exit(result.returncode)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
