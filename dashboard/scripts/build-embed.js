const fs = require('fs');
const path = require('path');

// Paths to the required files
const outDir = path.resolve(__dirname, '../out');
const targetDir = path.resolve(__dirname, '../../src/embed-dashboard');

// Create embed directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Function to copy files
function copyFile(source, target) {
  fs.copyFileSync(source, target);
  console.log(`Copied ${source} to ${target}`);
}

// Main function to process the build directory
function processDir() {
  try {
    // Ensure the output directory exists
    if (!fs.existsSync(outDir)) {
      console.error('Build output directory not found. Run "npm run export" first.');
      process.exit(1);
    }

    // Copy main JS file
    const jsFiles = fs.readdirSync(path.join(outDir, '_next/static/chunks/pages'))
      .filter(file => file.startsWith('index-'));
    
    if (jsFiles.length > 0) {
      copyFile(
        path.join(outDir, '_next/static/chunks/pages', jsFiles[0]),
        path.join(targetDir, 'dashboard.js')
      );
    }

    // Copy main CSS file
    const cssFiles = fs.readdirSync(path.join(outDir, '_next/static/css'))
      .filter(file => file.endsWith('.css'));
    
    if (cssFiles.length > 0) {
      copyFile(
        path.join(outDir, '_next/static/css', cssFiles[0]),
        path.join(targetDir, 'dashboard.css')
      );
    }

    // Create the HTML embed wrapper
    const embedHtml = `
<!-- Dashboard Container -->
<div id="dashboard-root" style="margin: 30px 0;"></div>

<!-- Dashboard Assets -->
<link rel="stylesheet" href="../src/embed-dashboard/dashboard.css">
<script src="../src/embed-dashboard/dashboard.js"></script>
<script>
  // Initialize the dashboard after canary is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Check if the root element exists
    const dashboardRoot = document.getElementById('dashboard-root');
    if (!dashboardRoot) {
      console.error('Dashboard root element not found');
      return;
    }

    // Create React root element
    const reactRoot = document.createElement('div');
    reactRoot.id = 'dashboard';
    dashboardRoot.appendChild(reactRoot);

    // Wait for canary to be available before initializing
    const checkCanary = setInterval(() => {
      if (window.canary) {
        clearInterval(checkCanary);
        console.log('Initializing dashboard with canary data');
        // The Next.js app will use the global canary object
      }
    }, 500);
  });
</script>`;

    fs.writeFileSync(path.join(targetDir, 'embed.html'), embedHtml);
    console.log(`Created embed HTML at ${path.join(targetDir, 'embed.html')}`);

    // Create instructions
    const instructions = `
# Dashboard Embedding Instructions

1. Add the dashboard container where you want it to appear:
\`\`\`html
<div id="dashboard-root"></div>
\`\`\`

2. Include the dashboard assets:
\`\`\`html
<link rel="stylesheet" href="../src/embed-dashboard/dashboard.css">
<script src="../src/embed-dashboard/dashboard.js"></script>
\`\`\`

3. Or simply include the entire embed.html content.
`;

    fs.writeFileSync(path.join(targetDir, 'README.md'), instructions);
    console.log('Successfully created embed files!');

  } catch (error) {
    console.error('Error creating embed files:', error);
    process.exit(1);
  }
}

// Run the process
processDir();
