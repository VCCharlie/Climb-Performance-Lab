const { execSync } = require('child_process');

try {
  const result = execSync('python validate_coords.py', {
    cwd: 'C:\\Users\\vc_ch\\Documents\\GitHub\\Climb-Performance-Lab',
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log(result);
} catch (error) {
  try {
    const result = execSync('python3 validate_coords.py', {
      cwd: 'C:\\Users\\vc_ch\\Documents\\GitHub\\Climb-Performance-Lab',
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(result);
  } catch (error2) {
    try {
      const result = execSync('node validate_coords.js', {
        cwd: 'C:\\Users\\vc_ch\\Documents\\GitHub\\Climb-Performance-Lab',
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      console.log(result);
    } catch (error3) {
      console.error('All commands failed:');
      console.error('Python error:', error.message);
      console.error('Python3 error:', error2.message);
      console.error('Node error:', error3.message);
      process.exit(1);
    }
  }
}
