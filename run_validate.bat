@echo off
cd /d C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab
python validate_coords.py 2>&1
if errorlevel 1 (
    echo.
    echo First script failed, trying alternative...
    python scripts/analyze_coords.py 2>&1
)
