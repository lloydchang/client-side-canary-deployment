const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting dashboard build process...');

try {
  // Ensure dependencies are installed
  console.log('Checking for node_modules...');
  if (!fs.existsSync(path.join(__dirname, 'dashboard', 'node_modules'))) {
    console.log('Installing dependencies...');
    execSync('cd dashboard && npm install', { stdio: 'inherit' });
  }
  
  // Fix the build-embed.js if needed
  const buildEmbedPath = path.join(__dirname, 'dashboard', 'scripts', 'build-embed.js');
  if (fs.existsSync(buildEmbedPath)) {
    console.log('Updating build-embed.js script...');
    
    // Read the current content
    let scriptContent = fs.readFileSync(buildEmbedPath, 'utf8');
    
    // Replace the buggy function with fixed version
    const fixedBuildFunction = `
// Function to build the Next.js project
function buildNextProject() {
  console.log('Building Next.js project...');
  try {
    // Just use 'npm run build' since export is configured in next.config.js
    execSync('npm run build', { stdio: 'inherit' });
    
    // Check where the output files are
    console.log('Looking for output files...');
    if (fs.existsSync(path.resolve(__dirname, '../out'))) {
      console.log('Found output in "out" directory');
    } else if (fs.existsSync(path.resolve(__dirname, '../.next/out'))) {
      console.log('Found output in ".next/out" directory');
    } else if (fs.existsSync(path.resolve(__dirname, '../.next'))) {
      console.log('Found ".next" directory but no "out" subdirectory');
      console.log('Files in .next directory:');
      try {
        execSync('ls -la ../.next', { stdio: 'inherit' });
      } catch (e) {
        console.log('Could not list files in .next directory');
      }
    } else {
      console.log('Could not find any output directories');
    }
    
    return true;
  } catch (error) {
    console.error('Error building Next.js project:', error);
    return false;
  }
}`;

    // Replace the existing function
    scriptContent = scriptContent.replace(/\/\/ Function to build the Next\.js project[\s\S]*?function buildNextProject\(\) \{[\s\S]*?return false;\s*\}\s*\}/m, fixedBuildFunction);
    
    // Fix the part where we check for out directory
    const fixedOutDirCheck = `
    // Ensure the output directory exists after build
    if (!fs.existsSync(outDir)) {
      console.error('Build output directory not found after running build. Something went wrong.');
      console.log('Checking if output is in a different location...');
      
      // Next.js 14+ might output to '.next/out' instead of 'out'
      const altOutDir = path.resolve(__dirname, '../.next/out');
      if (fs.existsSync(altOutDir)) {
        console.log(\`Found output directory at \${altOutDir}\`);
        // Update outDir variable
        outDir = altOutDir;
      } else {
        process.exit(1);
      }
    }`;
    
    scriptContent = scriptContent.replace(/\/\/ Ensure the output directory exists after build[\s\S]*?if \(!fs\.existsSync\(outDir\)\) \{[\s\S]*?process\.exit\(1\);\s*\}/m, fixedOutDirCheck);
    
    // Write the fixed content back
    fs.writeFileSync(buildEmbedPath, scriptContent);
    console.log('Updated build-embed.js script successfully');
  }
  
  // Run the build script
  console.log('Running build script...');
  execSync('cd dashboard && node scripts/build-embed.js', { stdio: 'inherit' });
  
  console.log('Dashboard build complete! Assets are now in src/embed-dashboard/');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}
