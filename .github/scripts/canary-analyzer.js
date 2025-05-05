#!/usr/bin/env node

/**
 * Canary Analyzer
 * 
 * This script:
 * 1. Queries PostHog for analytics data related to canary deployments
 * 2. Analyzes performance and error rates between stable and canary versions
 * 3. Automatically determines appropriate canary percentage adjustments
 * 4. Updates configuration files with new percentages if needed
 * 
 * Usage:
 *   node canary-analyzer.js                  # Analyze and auto-update
 *   node canary-analyzer.js --analyze-only   # Only output analysis without updating
 *   node canary-analyzer.js --percentage=20  # Force set specific percentage
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const analyzeOnly = args.includes('--analyze-only');
const percentageArg = args.find(arg => arg.startsWith('--percentage='));
const forcePercentage = percentageArg ? 
  parseInt(percentageArg.split('=')[1], 10) : null;

// Configuration from environment variables or defaults
const config = {
  apiKey: process.env.POSTHOG_API_KEY,
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.POSTHOG_HOST || 'app.posthog.com',
  errorThreshold: parseFloat(process.env.ERROR_THRESHOLD || 0.02), // 2% default
  timeframe: process.env.TIMEFRAME || '24h',
  incrementStep: parseInt(process.env.INCREMENT_STEP || '5'),
  maxPercentage: parseInt(process.env.MAX_PERCENTAGE || '50'),
  safetyThreshold: parseInt(process.env.SAFETY_THRESHOLD || '2')
};

// File paths
const configPath = path.join(process.cwd(), 'config', 'canary-config.json');
const srcConfigPath = path.join(process.cwd(), 'src', 'config', 'canary-config.js');

/**
 * Make a request to the PostHog API
 */
function queryPostHog(path, options = {}) {
  return new Promise((resolve, reject) => {
    // Parse host to extract hostname without protocol
    let hostname = config.host;
    let protocol = 'https:';
    
    // Check if host includes protocol
    if (hostname.includes('://')) {
      const url = new URL(hostname);
      protocol = url.protocol;
      hostname = url.hostname;
    }
    
    const requestOptions = {
      hostname: hostname,
      path: `/api/projects/${config.projectId}${path}`,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      ...options
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse PostHog response: ${error.message}`));
          }
        } else {
          reject(new Error(`PostHog API error: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.end();
  });
}

/**
 * Fetch event counts for stable and canary versions
 */
async function getVersionEvents() {
  // Validate required configuration
  if (!config.apiKey) {
    throw new Error('POSTHOG_API_KEY environment variable is required');
  }

  if (!config.projectId) {
    throw new Error('POSTHOG_PROJECT_ID environment variable is required');
  }

  // Query for pageviews by version
  const pageviewsQuery = {
    insight: 'TRENDS',
    events: [{ id: 'pageview', name: 'pageview' }],
    breakdown: 'version',
    date_from: `-${config.timeframe}`
  };

  // Query for errors by version
  const errorsQuery = {
    insight: 'TRENDS',
    events: [{ id: 'error', name: 'error' }],
    breakdown: 'version',
    date_from: `-${config.timeframe}`
  };

  try {
    const [pageviewsData, errorsData] = await Promise.all([
      queryPostHog('/insights/trend/', {
        method: 'POST',
        body: JSON.stringify(pageviewsQuery)
      }),
      queryPostHog('/insights/trend/', {
        method: 'POST',
        body: JSON.stringify(errorsQuery)
      })
    ]);

    // Process and return the results
    return analyzeResults(pageviewsData, errorsData);
  } catch (error) {
    throw new Error(`Failed to fetch PostHog data: ${error.message}`);
  }
}

/**
 * Process and analyze the event data
 */
function analyzeResults(pageviewsData, errorsData) {
  // Extract data from the responses
  const versions = { stable: {}, canary: {} };
  
  // Process pageview data
  pageviewsData.result.forEach(series => {
    const versionName = series.breakdown_value === 'stable' ? 'stable' : 'canary';
    versions[versionName].pageviews = series.count;
  });

  // Process error data
  errorsData.result.forEach(series => {
    const versionName = series.breakdown_value === 'stable' ? 'stable' : 'canary';
    versions[versionName].errors = series.count;
  });

  // Default values if no data is found
  versions.stable.pageviews = versions.stable.pageviews || 0;
  versions.stable.errors = versions.stable.errors || 0;
  versions.canary.pageviews = versions.canary.pageviews || 0;
  versions.canary.errors = versions.canary.errors || 0;

  // Calculate error rates
  versions.stable.errorRate = versions.stable.errors / (versions.stable.pageviews || 1);
  versions.canary.errorRate = versions.canary.errors / (versions.canary.pageviews || 1);

  // Determine if canary exceeds error threshold compared to stable
  const relativeErrorIncrease = versions.canary.errorRate - versions.stable.errorRate;
  const exceedsThreshold = relativeErrorIncrease > config.errorThreshold;

  return {
    stable: versions.stable,
    canary: versions.canary,
    analysis: {
      relativeErrorIncrease,
      exceedsThreshold,
      recommendedAction: exceedsThreshold ? 'rollback' : 'continue'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Read the current canary config
 */
function readCanaryConfig() {
  try {
    // Check if the main JSON config exists
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        currentPercentage: config.canary?.initialPercentage || 5,
        config: config
      };
    }
    
    // Fall back to default config
    return {
      currentPercentage: 5,
      config: {
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
      }
    };
  } catch (error) {
    console.error('Error reading canary config:', error);
    // Return default values if there's an error
    return {
      currentPercentage: 5,
      config: {
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
      }
    };
  }
}

/**
 * Determine if canary percentage should be changed
 */
function determineCanaryPercentage(analytics, currentPercentage) {
  // If a specific percentage was provided, use that
  if (forcePercentage !== null) {
    if (forcePercentage < 0 || forcePercentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    return {
      percentage: forcePercentage,
      reason: 'manual',
      message: `Manually setting canary percentage to ${forcePercentage}%`
    };
  }
  
  // Check if canary is healthy
  if (analytics.analysis.recommendedAction === 'rollback') {
    // Rollback - reduce percentage
    const newPercentage = Math.max(config.safetyThreshold, currentPercentage / 2);
    return {
      percentage: Math.floor(newPercentage),
      reason: 'rollback',
      message: `Reducing canary percentage from ${currentPercentage}% to ${Math.floor(newPercentage)}% due to elevated error rates`
    };
  } 
  
  // Canary is healthy, consider increasing
  if (currentPercentage < config.maxPercentage) {
    // Increase percentage gradually
    const newPercentage = Math.min(config.maxPercentage, currentPercentage + config.incrementStep);
    return {
      percentage: newPercentage,
      reason: 'increase',
      message: `Increasing canary percentage from ${currentPercentage}% to ${newPercentage}% based on healthy metrics`
    };
  }
  
  // Already at max percentage, maintain
  return {
    percentage: currentPercentage,
    reason: 'maintain',
    message: `Maintaining canary percentage at ${currentPercentage}% (maximum set to ${config.maxPercentage}%)`
  };
}

/**
 * Update the canary config with new percentage
 */
function updateCanaryConfig(percentage) {
  // Read current config
  const { config: currentConfig } = readCanaryConfig();
  
  // Update percentage
  currentConfig.canary.initialPercentage = percentage;
  
  // Ensure directories exist
  const configDir = path.dirname(configPath);
  const srcConfigDir = path.dirname(srcConfigPath);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  if (!fs.existsSync(srcConfigDir)) {
    fs.mkdirSync(srcConfigDir, { recursive: true });
  }
  
  // Write JSON config file
  fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
  
  // Write JavaScript config file for src directory
  const jsContent = `/**
 * Canary configuration
 * Auto-generated from canary-analyzer.js
 */

const CanaryConfig = {
  // Feature flags for the application
  featureFlags: {
    newDesign: true,
    enhancedAnalytics: true,
    experimentalFeatures: false
  },
  // Canary distribution percentage
  distribution: {
    initialPercentage: ${percentage},
    maxPercentage: ${currentConfig.canary.maxPercentage || 50}
  }
};

// Make available globally
window.CanaryConfig = CanaryConfig;
`;
  fs.writeFileSync(srcConfigPath, jsContent);
  
  return { configPath, srcConfigPath };
}

/**
 * Create a report file with results
 */
function createReportFile(analytics, recommendation) {
  const reportData = {
    analytics,
    recommendation,
    timestamp: new Date().toISOString(),
    config: {
      errorThreshold: config.errorThreshold,
      timeframe: config.timeframe
    }
  };
  
  fs.writeFileSync('canary-analysis.json', JSON.stringify(reportData, null, 2));
}

/**
 * Main function to run the analysis and update
 */
async function main() {
  try {
    // Get analytics data from PostHog
    const analytics = await getVersionEvents();
    
    // Read current configuration
    const { currentPercentage } = readCanaryConfig();
    console.log(`Current canary percentage: ${currentPercentage}%`);
    
    // Determine if percentage should change
    const recommendation = determineCanaryPercentage(analytics, currentPercentage);
    console.log(recommendation.message);
    
    // Create analysis report
    createReportFile(analytics, recommendation);
    
    // Update config if not in analyze-only mode
    if (!analyzeOnly) {
      const { configPath, srcConfigPath } = updateCanaryConfig(recommendation.percentage);
      console.log(`Updated config files at ${configPath} and ${srcConfigPath}`);
    }
    
    // Set GitHub Actions outputs
    console.log(`::set-output name=percentage::${recommendation.percentage}`);
    console.log(`::set-output name=reason::${recommendation.reason}`);
    
    // For GitHub Actions environment file
    console.log(`CANARY_PERCENTAGE=${recommendation.percentage}`);
    console.log(`CANARY_UPDATE_REASON=${recommendation.reason}`);
    
    // Exit with appropriate code based on analytics result
    process.exit(analytics.analysis.exceedsThreshold ? 1 : 0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
