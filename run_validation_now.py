#!/usr/bin/env python3
import subprocess
import sys

# Run the validation script
result = subprocess.run([sys.executable, 'validate_gps_final.py'], 
                       capture_output=False, 
                       text=True,
                       cwd=r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab')
sys.exit(result.returncode)
