const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths to the required files
let outDir = path.resolve(__dirname, '../out');
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
}

// Main function to process the build directory
function processDir() {
  try {
    // Build the Next.js project first
    if (!buildNextProject()) {
      console.error('Failed to build Next.js project. Aborting.');
      process.exit(1);
    }
    
    // Ensure the output directory exists after build
    if (!fs.existsSync(outDir)) {
      console.error('Build output directory not found after running build. Something went wrong.');
      console.log('Checking if output is in a different location...');
      
      // Next.js 14+ might output to '.next/out' instead of 'out'
      const altOutDir = path.resolve(__dirname, '../.next/out');
      if (fs.existsSync(altOutDir)) {
        console.log(`Found output directory at ${altOutDir}`);
        outDir = altOutDir;
      } else {
        process.exit(1);
      }
    }

    try {
      // Copy main JS file
      const jsFiles = fs.readdirSync(path.join(outDir, '_next/static/chunks/pages'))
        .filter(file => file.startsWith('index-'));
      
      if (jsFiles.length > 0) {
        const jsFilePath = path.join(outDir, '_next/static/chunks/pages', jsFiles[0]);
        let jsContent = fs.readFileSync(jsFilePath, 'utf8');
        
        try {
          // Add initialization function to the JS file
          jsContent = jsContent + `
;(function(){
  // Create global initialization function to be called from bridge
  window.__NEXT_DASHBOARD_INIT__ = function(dashboardData) {
    try {
      // First check if we have a global init function
      if (typeof window.initDashboard === 'function') {
        window.initDashboard(dashboardData);
        return;
      }
      
      // Check for Next.js loaded pages with proper error handling
      if (self.__NEXT_LOADED_PAGES__ && 
          Array.isArray(self.__NEXT_LOADED_PAGES__) && 
          self.__NEXT_LOADED_PAGES__.length > 0) {
        
        const pageData = self.__NEXT_LOADED_PAGES__[0];
        
        if (Array.isArray(pageData) && pageData.length > 1) {
          const appModule = pageData[1];
          if (appModule && typeof appModule.initDashboard === 'function') {
            appModule.initDashboard(dashboardData);
          }
        }
      }
      
      // Always update the global data as fallback
      window.dashboardData = dashboardData;
      window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
    } catch (err) {
      console.error('Error initializing dashboard:', err);
      // Fallback - just update the global data
      window.dashboardData = dashboardData;
      window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
    }
    
    // Try hydration if available
    try {
      if (window.__NEXT_HYDRATE) {
        window.__NEXT_HYDRATE();
      }
    } catch (err) {
      console.error('Hydration error:', err);
    }
  };

  // Create update function
  window.__NEXT_DASHBOARD_UPDATE__ = function(dashboardData) {
    // Dispatch custom event with updated data
    window.dashboardData = dashboardData;
    window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
  };
})();`;
          
          // Write the modified JS file
          fs.writeFileSync(path.join(targetDir, 'dashboard.js'), jsContent);
          console.log(`Created modified dashboard.js at ${path.join(targetDir, 'dashboard.js')}`);
        } catch (error) {
          console.error('Error modifying JS file:', error);
          throw error;
        }
      } else {
        console.error('No index JS files found in output directory');
      }

      // Copy main CSS file
      const cssFiles = fs.readdirSync(path.join(outDir, '_next/static/css'))
        .filter(file => file.endsWith('.css'));
      
      if (cssFiles.length > 0) {
        copyFile(
          path.join(outDir, '_next/static/css', cssFiles[0]),
          path.join(targetDir, 'dashboard.css')
        );
      } else {
        console.log('No CSS files found - dashboard might be unstyled');
      }
    } catch (error) {
      console.error('Error processing build files:', error);
      throw error;
    }

    // Create the HTML embed wrapper
    const embedHtml = `
<!-- Dashboard Container -->
<div class="card">
  <h2>Deployment Metrics Dashboard</h2>
  <div id="dashboard-root" style="margin: 10px 0;"></div>
</div>

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
<div class="card">
  <h2>Deployment Metrics Dashboard</h2>
  <div id="dashboard-root" style="margin: 10px 0;"></div>
</div>
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