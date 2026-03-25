#!/usr/bin/env python3
"""
Execute the validation script and capture all output
"""
import sys
import os
from io import StringIO

# Change to the correct directory
os.chdir(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab')

# Read and execute the validation script
script_path = 'validate_coords.py'

# Redirect stdout to capture all output
old_stdout = sys.stdout
sys.stdout = StringIO()

try:
    with open(script_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Execute the script
    exec(code)
    
    # Get all captured output
    output = sys.stdout.getvalue()
finally:
    # Restore stdout
    sys.stdout = old_stdout

# Print all captured output
print(output)
