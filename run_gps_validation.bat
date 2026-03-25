@echo off
cd /d "C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab"

echo Attempting command 1: python validate_coords.py
python validate_coords.py
if %errorlevel% equ 0 (
    exit /b 0
)

echo.
echo Attempting command 2: python3 validate_coords.py
python3 validate_coords.py
if %errorlevel% equ 0 (
    exit /b 0
)

echo.
echo Attempting command 3: node validate_coords.js
node validate_coords.js
if %errorlevel% equ 0 (
    exit /b 0
)

echo All commands failed
exit /b 1
