
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
  const nextConfig = `
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
`;
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
