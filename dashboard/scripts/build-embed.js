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
      const jsFilePath = path.join(outDir, '_next/static/chunks/pages', jsFiles[0]);
      let jsContent = fs.readFileSync(jsFilePath, 'utf8');
      
      // Add initialization function to the JS file
      jsContent = jsContent + `
;(function(){
  // Create global initialization function to be called from bridge
  window.__NEXT_DASHBOARD_INIT__ = function(DashboardData) {
    // This assumes the Next.js app exports a default function 
    // that can be called with the canary data
    if (typeof self.__NEXT_LOADED_PAGES__[0][0].__N_SSG === "object") {
      // Initialize with canary data
      const appModule = self.__NEXT_LOADED_PAGES__[0][1];
      if (typeof appModule.initDashboard === 'function') {
        appModule.initDashboard(DashboardData);
      }
    }
    // Force hydration
    if (window.__NEXT_HYDRATE) {
      window.__NEXT_HYDRATE();
    }
  };
})();`;
      
      // Write the modified JS file
      fs.writeFileSync(path.join(targetDir, 'dashboard.js'), jsContent);
      console.log(`Created modified dashboard.js at ${path.join(targetDir, 'dashboard.js')}`);
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
    
    // Create the dashboard bridge file
    const bridgeContent = fs.readFileSync(path.resolve(__dirname, '../../src/embed-dashboard/dashboard-bridge.js'), 'utf8');
    if (!bridgeContent) {
      console.error('Dashboard bridge file not found');
      process.exit(1);
    }

    // Create the HTML embed wrapper
    const embedHtml = `
<!-- Dashboard Container -->
<div id="dashboard-root" style="margin: 30px 0;"></div>

<!-- Dashboard Assets -->
<link rel="stylesheet" href="../src/embed-dashboard/dashboard.css">
<script src="../src/embed-dashboard/dashboard.js"></script>
<script src="../src/embed-dashboard/dashboard-bridge.js"></script>`;

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
<script src="../src/embed-dashboard/dashboard-bridge.js"></script>
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
