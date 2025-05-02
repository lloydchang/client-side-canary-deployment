/**
 * Build script that injects environment variables into configuration files
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Paths
const CONFIG_PATH = path.resolve(__dirname, '../config/canary-config.json');

// Validate required environment variables
const requiredVars = ['POSTHOG_PUBLIC_KEY', 'POSTHOG_PROJECT_ID'];
const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error(`Error: Missing required environment variables: ${missing.join(', ')}`);
  console.error('Please create a .env file based on .env.example');
  process.exit(1);
}

// Read config file
console.log(`Reading config file: ${CONFIG_PATH}`);
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Replace placeholders with actual values
console.log('Replacing placeholders with environment variables...');
config.analytics.posthogApiKey = process.env.POSTHOG_PUBLIC_KEY;
config.analytics.posthogProjectId = process.env.POSTHOG_PROJECT_ID;

// Write updated config
fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
console.log('Configuration file updated successfully');

console.log('Build completed successfully');
