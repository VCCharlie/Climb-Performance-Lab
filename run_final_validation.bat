@echo off
REM Windows batch file to run Python validation
setlocal enabledelayedexpansion

cd /d "C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab"

echo Running coordinate validation...
echo.

python final_validation.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Script failed with error code %ERRORLEVEL%
    echo Trying alternative location...
    python scripts/analyze_coords.py
)

echo.
echo Validation complete. Results should be in VALIDATION_RESULTS.txt
pause
