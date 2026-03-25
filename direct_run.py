#!/usr/bin/env python3
"""Direct runner for validate_coords.py"""
import sys
import os

# Add the project directory to Python path
project_dir = r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab'
os.chdir(project_dir)
sys.path.insert(0, project_dir)

# Now try to run the validation
try:
    # Import and execute validate_coords as a module
    import importlib.util
    spec = importlib.util.spec_from_file_location("validate_coords", 
                                                    os.path.join(project_dir, "validate_coords.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    print("\n✓ validate_coords.py executed successfully")
except Exception as e:
    print(f"validate_coords.py failed: {e}")
    print("\nTrying alternative script: scripts/analyze_coords.py\n")
    try:
        spec = importlib.util.spec_from_file_location("analyze_coords",
                                                       os.path.join(project_dir, "scripts", "analyze_coords.py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        print("\n✓ scripts/analyze_coords.py executed successfully")
    except Exception as e2:
        print(f"scripts/analyze_coords.py also failed: {e2}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
