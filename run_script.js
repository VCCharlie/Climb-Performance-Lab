const { execSync } = require('child_process');
const path = require('path');

const dir = 'C:\\Users\\vc_ch\\Documents\\GitHub\\Climb-Performance-Lab';

try {
  console.log('Attempting to run validate_coords.py...\n');
  const output = execSync('python validate_coords.py', {
    cwd: dir,
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log(output);
} catch (error) {
  console.log('First script failed, attempting alternative script...\n');
  try {
    const output = execSync('python scripts/analyze_coords.py', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(output);
  } catch (error2) {
    console.error('Both scripts failed:');
    console.error(error2.toString());
    process.exit(1);
  }
}
