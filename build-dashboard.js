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
    
    // Create a completely fixed version of the script
    const fixedScript = `const fs = require('fs');
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
  console.log(\`Copied \${source} to \${target}\`);
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
      return true;
    } else if (fs.existsSync(path.resolve(__dirname, '../.next/out'))) {
      console.log('Found output in ".next/out" directory');
      outDir = path.resolve(__dirname, '../.next/out');
      return true;
    } else if (fs.existsSync(path.resolve(__dirname, '../.next'))) {
      console.log('Found ".next" directory but no "out" subdirectory');
      console.log('Files in .next directory:');
      try {
        execSync('ls -la ../.next', { stdio: 'inherit' });
      } catch (e) {
        console.log('Could not list files in .next directory');
      }
      
      // Try exporting from .next
      console.log('Attempting to export from .next directory...');
      try {
        execSync('npm run export', { stdio: 'inherit' });
        if (fs.existsSync(path.resolve(__dirname, '../out'))) {
          console.log('Export successful, found output in "out" directory');
          return true;
        }
      } catch (e) {
        console.error('Error exporting Next.js project:', e);
      }
    }
    
    console.error('Could not find any output directories after build');
    return false;
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
        console.log(\`Found output directory at \${altOutDir}\`);
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
          jsContent = jsContent + \`
;(function(){
  // Create global initialization function to be called from bridge
  window.__NEXT_DASHBOARD_INIT__ = function(dashboardData) {
    try {
      console.log('Dashboard init called with data:', dashboardData);
      
      // First check if we have a global init function
      if (typeof window.initDashboard === 'function') {
        console.log('Calling window.initDashboard directly');
        window.initDashboard(dashboardData);
        return;
      }
      
      // Next.js specific initialization
      if (self.__NEXT_LOADED_PAGES__ && 
          Array.isArray(self.__NEXT_LOADED_PAGES__) && 
          self.__NEXT_LOADED_PAGES__.length > 0) {
        
        console.log('Found Next.js loaded pages, attempting to initialize');
        const pageData = self.__NEXT_LOADED_PAGES__[0];
        
        if (Array.isArray(pageData) && pageData.length > 1) {
          const appModule = pageData[1];
          if (appModule && typeof appModule.initDashboard === 'function') {
            console.log('Calling Next.js module initDashboard');
            appModule.initDashboard(dashboardData);
            return;
          }
        }
      }
      
      // Attempt Next.js hydration if available
      if (typeof self.__NEXT_HYDRATE === 'function') {
        console.log('Triggering Next.js hydration');
        
        // Set data first so components can access it during hydration
        window.dashboardData = dashboardData;
        
        try {
          self.__NEXT_HYDRATE();
          console.log('Next.js hydration completed');
        } catch (err) {
          console.error('Error during Next.js hydration:', err);
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
  };

  // Create update function
  window.__NEXT_DASHBOARD_UPDATE__ = function(dashboardData) {
    console.log('Dashboard update called with data:', dashboardData);
    // Dispatch custom event with updated data
    window.dashboardData = dashboardData;
    window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
  };
  
  // Add polyfill for Next.js hydration if it's not available
  if (typeof self.__NEXT_HYDRATE !== 'function') {
    self.__NEXT_HYDRATE = function() {
      console.log('Polyfill hydration called');
      // This is a simple polyfill - in a real implementation,
      // this would attempt to hydrate React components
      const dashboardElement = document.getElementById('dashboard');
      if (dashboardElement && window.dashboardData) {
        // Dispatch an event to notify that hydration was attempted
        window.dispatchEvent(new CustomEvent('dashboard-hydrate-attempted'));
      }
    };
  }
})();\`;
          
          // Write the modified JS file
          fs.writeFileSync(path.join(targetDir, 'dashboard.js'), jsContent);
          console.log(\`Created modified dashboard.js at \${path.join(targetDir, 'dashboard.js')}\`);
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
    const embedHtml = \`
<!-- Dashboard Container -->
<div class="card">
  <h2>Deployment Metrics Dashboard</h2>
  <div id="dashboard-root" style="margin: 10px 0;"></div>
</div>

<!-- Dashboard Assets -->
<link rel="stylesheet" href="../src/embed-dashboard/dashboard.css">
<script src="../src/embed-dashboard/dashboard.js"></script>
<script src="../src/embed-dashboard/dashboard-bridge.js"></script>\`;

    fs.writeFileSync(path.join(targetDir, 'embed.html'), embedHtml);
    console.log(\`Created embed HTML at \${path.join(targetDir, 'embed.html')}\`);

    // Create instructions
    const instructions = \`
# Dashboard Embedding Instructions

1. Add the dashboard container where you want it to appear:
\\\`\\\`\\\`html
<div class="card">
  <h2>Deployment Metrics Dashboard</h2>
  <div id="dashboard-root" style="margin: 10px 0;"></div>
</div>
\\\`\\\`\\\`

2. Include the dashboard assets:
\\\`\\\`\\\`html
<link rel="stylesheet" href="../src/embed-dashboard/dashboard.css">
<script src="../src/embed-dashboard/dashboard.js"></script>
<script src="../src/embed-dashboard/dashboard-bridge.js"></script>
\\\`\\\`\\\`

3. Or simply include the entire embed.html content.
\`;

    fs.writeFileSync(path.join(targetDir, 'README.md'), instructions);
    console.log('Successfully created embed files!');

  } catch (error) {
    console.error('Error creating embed files:', error);
    process.exit(1);
  }
}

// Run the process
processDir();`;
    
    // Write the completely fixed script version
    fs.writeFileSync(buildEmbedPath, fixedScript);
    console.log('Replaced build-embed.js script with fixed version');
  }
  
  // Create a Next.js build resolver file to help with build issues
  const buildResolverPath = path.join(__dirname, 'dashboard', 'scripts', 'build-resolver.js');
  console.log('Creating build resolver script...');
  
  const buildResolverScript = `
/**
 * Build resolver - helps fix build issues with Next.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running build resolver...');

// Check Next.js configuration
const nextConfigPath = path.resolve(__dirname, '../next.config.js');
if (!fs.existsSync(nextConfigPath)) {
  console.log('Next.js config not found, creating one...');
  const nextConfig = \`
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Fix hydration issues
  experimental: {
    esmExternals: 'loose',
  },
  // Force output to 'out' directory
  distDir: 'out',
}

module.exports = nextConfig
\`;
  fs.writeFileSync(nextConfigPath, nextConfig);
  console.log('Created Next.js config file');
}

// Check package.json for required scripts
const packageJsonPath = path.resolve(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Ensure required scripts exist
    let modified = false;
    if (!packageJson.scripts) {
      packageJson.scripts = {};
      modified = true;
    }
    
    if (!packageJson.scripts.build || !packageJson.scripts.build.includes('export')) {
      packageJson.scripts.build = 'next build';
      modified = true;
    }
    
    if (!packageJson.scripts.export) {
      packageJson.scripts.export = 'next export';
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('Updated package.json scripts');
    }
  } catch (e) {
    console.error('Error processing package.json:', e);
  }
}

// Check for TypeScript configuration
const tsconfigPath = path.resolve(__dirname, '../tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    // Ensure compiler options are set correctly for compatibility
    let modified = false;
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
      modified = true;
    }
    
    // Ensure esModuleInterop is enabled for better compatibility
    if (!tsconfig.compilerOptions.esModuleInterop) {
      tsconfig.compilerOptions.esModuleInterop = true;
      modified = true;
    }
    
    // Set module resolution strategy
    if (!tsconfig.compilerOptions.moduleResolution) {
      tsconfig.compilerOptions.moduleResolution = "node";
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log('Updated tsconfig.json for better compatibility');
    }
  } catch (e) {
    console.error('Error processing tsconfig.json:', e);
  }
}

console.log('Build resolver completed');
`;

  fs.writeFileSync(buildResolverPath, buildResolverScript);
  console.log('Created build resolver script');
  
  // Run the build resolver before the main build
  console.log('Running build resolver...');
  execSync('cd dashboard && node scripts/build-resolver.js', { stdio: 'inherit' });
  
  // Run the build script
  console.log('Running build script...');
  execSync('cd dashboard && node scripts/build-embed.js', { stdio: 'inherit' });
  
  console.log('Dashboard build complete! Assets are now in src/embed-dashboard/');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}
