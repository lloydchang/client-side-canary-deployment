#!/usr/bin/env node

/**
 * Script to update canary configuration
 * Used by GitHub Actions to adjust canary percentages
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const percentageArg = args.find(arg => arg.startsWith('--percentage='));

if (!percentageArg) {
  console.error('Error: Missing required parameter --percentage');
  process.exit(1);
}

const newPercentage = parseInt(percentageArg.split('=')[1], 10);

if (isNaN(newPercentage) || newPercentage < 0 || newPercentage > 100) {
  console.error('Error: Percentage must be a number between 0 and 100');
  process.exit(1);
}

// Path to config
const configPath = path.join(process.cwd(), 'config', 'canary-config.json');

try {
  // Read existing config or create default
  let config = {};
  
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // Default config structure
    config = {
      posthog: {
        apiKey: process.env.POSTHOG_PUBLIC_KEY || '',
        projectId: process.env.POSTHOG_PROJECT_ID || '',
        host: 'https://us.i.posthog.com'
      },
      canary: {
        initialPercentage: 5,
        maxPercentage: 50,
        incrementStep: 5
      }
    };
  }

  // Update percentage
  config.canary.initialPercentage = newPercentage;
  
  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Successfully updated canary percentage to ${newPercentage}%`);
} catch (error) {
  console.error('Error updating canary config:', error);
  process.exit(1);
}
