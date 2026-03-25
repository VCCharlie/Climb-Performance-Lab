@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab"

REM Output validation results to file
python run_full_validation.py > validation_output.txt 2>&1

REM Display the file
type validation_output.txt

endlocal
