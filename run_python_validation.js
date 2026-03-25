const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running GPS validation...');

try {
    const result = execSync('python final_validate_gps.py', {
        cwd: __dirname,
        encoding: 'utf-8'
    });
    console.log(result);
    
    // Verify output file
    const outputFile = path.join(__dirname, 'validation_output.txt');
    if (fs.existsSync(outputFile)) {
        console.log('\n✓ validation_output.txt created successfully');
        const content = fs.readFileSync(outputFile, 'utf-8');
        console.log('\nFile contents:');
        console.log('---');
        console.log(content);
        console.log('---');
    } else {
        console.log('\n✗ validation_output.txt was not created');
    }
} catch (error) {
    console.error('Error running validation:', error.message);
}
