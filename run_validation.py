#!/usr/bin/env python3
import subprocess
import sys
import os

os.chdir(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab')
result = subprocess.run([sys.executable, '-m', 'subprocess'], capture_output=False)

# Or just run the node command directly
try:
    result = subprocess.run(['node', 'validate_and_save.js'], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    print("Return code:", result.returncode)
except Exception as e:
    print(f"Error: {e}")
