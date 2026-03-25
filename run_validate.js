const { execSync } = require('child_process');
const path = require('path');

// Run the Python script
const scriptPath = path.join(__dirname, 'validate_coords_final.py');

try {
  const output = execSync(`python "${scriptPath}"`, {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log(output);
} catch (error) {
  console.error('Error running script:');
  console.error(error.message);
  if (error.stdout) console.error('STDOUT:', error.stdout);
  if (error.stderr) console.error('STDERR:', error.stderr);
  process.exit(1);
}
