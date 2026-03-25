#!/usr/bin/env python3
import subprocess
import sys
import os

os.chdir(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab')
result = subprocess.run([sys.executable, 'validate_coords.py'], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print(result.stderr, file=sys.stderr)
sys.exit(result.returncode)
