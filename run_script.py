import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))
exec(Path('validate_gps_coords.py').read_text())
