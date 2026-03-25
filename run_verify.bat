@echo off
cd /d C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab
node scripts/verify-coordinates.mjs
if errorlevel 1 (
    echo.
    echo Node script failed, running Python analysis...
    echo.
    python verify_coords.py
)
