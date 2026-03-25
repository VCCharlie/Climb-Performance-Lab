@echo off
cd /d "C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab"
python validate_coords.py
if errorlevel 1 (
    echo Python failed, trying python3...
    python3 validate_coords.py
)
