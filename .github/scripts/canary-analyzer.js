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

// Import default constants if available or use fallbacks
let DEFAULT_CONSTANTS;
const constantsPath = path.join(process.cwd(), 'frontend', 'assets', 'config', 'default-constants.js');
try {
  if (fs.existsSync(constantsPath)) {
    DEFAULT_CONSTANTS = require(constantsPath);
  } else {
    console.log('Default constants file not found, using fallbacks');
    DEFAULT_CONSTANTS = {
      CANARY_PERCENTAGE: 5,
      MAX_PERCENTAGE: 50, 
      SAFETY_THRESHOLD: 2
    };
  }
} catch (e) {
  console.warn('Error loading default constants:', e);
  DEFAULT_CONSTANTS = {
    CANARY_PERCENTAGE: 5,
    MAX_PERCENTAGE: 50,
    SAFETY_THRESHOLD: 2
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
const analyzeOnly = args.includes('--analyze-only');
const percentageArg = args.find(arg => arg.startsWith('--percentage='));
const forcePercentage = percentageArg ? 
  parseInt(percentageArg.split('=')[1], 10) : null;
const skipReportFile = args.includes('--skip-report-file');
const simulateErrors = args.includes('--simulate-errors');

// Configuration from environment variables or defaults
const config = {
  apiKey: process.env.POSTHOG_API_KEY,
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.POSTHOG_HOST || 'app.posthog.com',
  errorThreshold: parseFloat(process.env.ERROR_THRESHOLD || 0.02), // 2% default
  timeframe: process.env.TIMEFRAME || '24h',
  incrementStep: parseInt(process.env.INCREMENT_STEP || '5'),
  maxPercentage: parseInt(process.env.MAX_PERCENTAGE || DEFAULT_CONSTANTS.MAX_PERCENTAGE),
  safetyThreshold: parseInt(process.env.SAFETY_THRESHOLD || DEFAULT_CONSTANTS.SAFETY_THRESHOLD)
};

// File paths
const configPath = path.join(process.cwd(), 'frontend', 'assets', 'config', 'canary-config.json');

// Get API key from environment
const posthogApiKey = process.env.POSTHOG_API_KEY || '';
const posthogProjectId = process.env.POSTHOG_PROJECT_ID || '';
const useMockData = process.env.USE_MOCK_DATA === 'true';

// Validate required parameters
if (!useMockData && (!posthogApiKey || !posthogProjectId)) {
  if (!posthogApiKey) {
    console.error('Error: POSTHOG_API_KEY environment variable is required unless USE_MOCK_DATA=true');
  }
  if (!posthogProjectId) {
    console.error('Error: POSTHOG_PROJECT_ID environment variable is required unless USE_MOCK_DATA=true');
  }
  // If we're in percentage setting mode, we can skip the validation
  if (forcePercentage === null) {
    process.exit(1);
  } else {
    console.log('Using manual percentage setting mode, skipping PostHog API validation');
  }
}

/**
 * Make a request to the PostHog API
 */
function queryPostHog(apiPath, options = {}) {
  return new Promise((resolve, reject) => {
    // Parse host to extract hostname without protocol
    let hostname = config.host;
    // let protocol = 'https:'; // protocol is part of requestOptions if URL object is used
    // Check if host includes protocol
    if (hostname.includes('://')) {
      const url = new URL(hostname);
      // protocol = url.protocol; // Not directly used here, https.request handles it
      hostname = url.hostname;
    }
    const requestOptions = {
      hostname: hostname,
      path: `/api/projects/${config.projectId}${apiPath}`,
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
          // Enhanced error handling for permission issues
          try {
            const errorData = JSON.parse(data);
            // Check for permission denied error
            if (res.statusCode === 403 && errorData.code === 'permission_denied') {
              const scope = errorData.detail?.match(/scope '([^']+)'/) ? errorData.detail.match(/scope '([^']+)'/)[1] : 'unknown';
              reject(new Error(
                `PostHog API permission error: Missing required scope '${scope}'\n` +
                `Please ensure your PostHog API key has the following scopes: insight:read\n` +
                `You may need to create a new Personal API key with appropriate permissions in PostHog.`
              ));
            } else {
              reject(new Error(`PostHog API error: ${res.statusCode} - ${data}`));
            }
          } catch (e) {
            // If we can't parse the error JSON, fall back to the generic error
            reject(new Error(`PostHog API error: ${res.statusCode} - ${data}`));
          }
        }
      });
    });
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Add mock data function
function getMockAnalyticsData() {
  const mockDataPath = process.env.MOCK_DATA_PATH;
  if (mockDataPath) {
    try {
      const resolvedPath = path.resolve(mockDataPath);
      if (fs.existsSync(resolvedPath)) {
        const customMockDataModule = require(resolvedPath);
        if (customMockDataModule && typeof customMockDataModule.getMockAnalyticsData === 'function') {
          console.log(`Using custom mock data from: ${resolvedPath}`);
          return customMockDataModule.getMockAnalyticsData();
        } else {
          console.warn(`Custom mock data file at ${resolvedPath} does not export getMockAnalyticsData function or the function is not found. Falling back to default mock data.`);
        }
      } else {
        console.warn(`Custom mock data file not found at ${resolvedPath}. Falling back to default mock data.`);
      }
    } catch (e) {
      console.warn(`Error loading custom mock data from ${mockDataPath}: ${e.message}. Falling back to default mock data.`);
    }
  }

  if (simulateErrors) {
    console.log('[getMockAnalyticsData] Simulating high error rates due to --simulate-errors flag.');
    return {
      stable: { pageviews: 500, errors: 10, errorRate: 0.02 }, // 2% error rate
      canary: { pageviews: 50, errors: 10, errorRate: 0.20 }, // 20% error rate
      analysis: {
        relativeErrorIncrease: 0.18, // 18% increase
        exceedsThreshold: true,
        recommendedAction: 'rollback'
      },
      timestamp: new Date().toISOString()
    };
  }

  // Default internal mock data (no errors) or from ENV VARS
  const stableErrorRate = parseFloat(process.env.MOCK_STABLE_ERROR_RATE || 0.02);
  const canaryErrorRate = parseFloat(process.env.MOCK_CANARY_ERROR_RATE || 0.02);

  const stable = {
    pageviews: 500,
    errors: Math.round(500 * stableErrorRate),
    errorRate: stableErrorRate
  };
  const canary = {
    pageviews: 50,
    errors: Math.round(50 * canaryErrorRate),
    errorRate: canaryErrorRate
  };
  const relativeErrorIncrease = canaryErrorRate - stableErrorRate;
  const exceedsThreshold = relativeErrorIncrease > config.errorThreshold;
  
  console.log('[getMockAnalyticsData] Using default internal mock data (or MOCK_..._ERROR_RATE env vars).');
  return {
    stable,
    canary,
    analysis: {
      relativeErrorIncrease,
      exceedsThreshold,
      recommendedAction: exceedsThreshold ? 'rollback' : 'continue'
    },
    timestamp: new Date().toISOString()
  };
}

// Use mock data if specified or if API key is missing
async function getAnalyticsData() {
  if (simulateErrors || useMockData || forcePercentage !== null) {
    let reason = [];
    if (simulateErrors) reason.push("--simulate-errors flag is active");
    if (useMockData) reason.push("USE_MOCK_DATA environment variable is true");
    if (forcePercentage !== null) reason.push("--percentage flag is set");
    console.log(`Using mock analytics data because: ${reason.join(', ')}.`);
    return getMockAnalyticsData();
  }
  
  // Otherwise use the real PostHog API
  console.log('Using real PostHog API for analytics data.');
  return getVersionEvents();
}

/**
 * Fetch event counts for stable and canary versions
 */
async function getVersionEvents() {
  // Skip validation if we're only setting a specific percentage
  if (forcePercentage !== null) {
    console.log('Using manual percentage setting mode, skipping PostHog API validation');
    return {
      stable: { pageviews: 0, errors: 0, errorRate: 0 },
      canary: { pageviews: 0, errors: 0, errorRate: 0 },
      analysis: {
        relativeErrorIncrease: 0,
        exceedsThreshold: false,
        recommendedAction: 'continue'
      },
      timestamp: new Date().toISOString()
    };
  }

  // Validate required configuration
  if (!config.apiKey) {
    throw new Error('POSTHOG_API_KEY environment variable is required');
  }
  if (!config.projectId) {
    throw new Error('POSTHOG_PROJECT_ID environment variable is required');
  }

  // This specific check for USE_MOCK_DATA is handled by getAnalyticsData now.
  // If getAnalyticsData decided not to use mock data, it calls getVersionEvents.
  // So, if we reach here, we are intended to use the real API.

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
  versions.stable.errorRate = versions.stable.pageviews > 0 ? versions.stable.errors / versions.stable.pageviews : 0;
  versions.canary.errorRate = versions.canary.pageviews > 0 ? versions.canary.errors / versions.canary.pageviews : 0;

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
      const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        // Read from the correct path in the config structure
        currentPercentage: loadedConfig.distribution?.canaryPercentage ?? DEFAULT_CONSTANTS.CANARY_PERCENTAGE,
        config: loadedConfig
      };
    }
    
    // Fall back to default config matching the expected structure
    console.warn(`Config file not found at ${configPath}, using default structure.`);
    return {
      currentPercentage: DEFAULT_CONSTANTS.CANARY_PERCENTAGE,
      config: {
        canaryVersion: "1.0.0",
        distribution: {
          canaryPercentage: DEFAULT_CONSTANTS.CANARY_PERCENTAGE,
          gradualRollout: true,
          rolloutPeriod: 7,
          safetyThreshold: DEFAULT_CONSTANTS.SAFETY_THRESHOLD
        },
        analytics: {
          sampleRate: 1,
          debug: false,
          posthogApiKey: process.env.POSTHOG_PUBLIC_KEY || '',
          posthogProjectId: process.env.POSTHOG_PROJECT_ID || ''
        }
      }
    };
  } catch (error) {
    console.error('Error reading canary config:', error);
    // Return default values if there's an error
    return {
      currentPercentage: DEFAULT_CONSTANTS.CANARY_PERCENTAGE,
      config: {
        canaryVersion: "1.0.0",
        distribution: {
          canaryPercentage: DEFAULT_CONSTANTS.CANARY_PERCENTAGE,
          gradualRollout: true,
          rolloutPeriod: 7,
          safetyThreshold: DEFAULT_CONSTANTS.SAFETY_THRESHOLD
        },
        analytics: {
          sampleRate: 1,
          debug: false,
          posthogApiKey: process.env.POSTHOG_PUBLIC_KEY || '',
          posthogProjectId: process.env.POSTHOG_PROJECT_ID || ''
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
  
  // Ensure the distribution property exists
  if (!currentConfig.distribution) {
    currentConfig.distribution = {
      canaryPercentage: DEFAULT_CONSTANTS.CANARY_PERCENTAGE,
      gradualRollout: true,
      rolloutPeriod: 7,
      safetyThreshold: DEFAULT_CONSTANTS.SAFETY_THRESHOLD
    };
  }
  
  // Update percentage in the correct location
  currentConfig.distribution.canaryPercentage = percentage;
  currentConfig.lastUpdated = new Date().toISOString();
  currentConfig.updateSource = "automated";
  
  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Write JSON config file only
  fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
  console.log(`Updated JSON config file at ${configPath} with percentage ${percentage}%`);
  
  return { configPath };
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
  console.log('Canary analysis report saved to canary-analysis.json');
}

/**
 * Main function to run the analysis and update
 */
async function main() {
  try {
    // Get analytics data from PostHog
    const analytics = await getAnalyticsData();
    
    // Read current configuration
    const { currentPercentage } = readCanaryConfig();
    console.log(`Current canary percentage: ${currentPercentage}%`);
    
    // Determine if percentage should change
    const recommendation = determineCanaryPercentage(analytics, currentPercentage);
    console.log(recommendation.message);
    
    // Create analysis report if not skipped
    if (!skipReportFile) {
      createReportFile(analytics, recommendation);
    } else {
      console.log('Skipping report file generation due to --skip-report-file flag.');
    }
    
    // Update config if not in analyze-only mode
    if (!analyzeOnly) {
      // Only update the JSON config file now - no JS file
      const { configPath: updatedConfigPath } = updateCanaryConfig(recommendation.percentage);
      console.log(`Updated config file at ${updatedConfigPath}`);
    }
    
    // Set GitHub Actions outputs using Environment Files
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `percentage=${recommendation.percentage}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `reason=${recommendation.reason}\n`);
    } else {
      // Fallback for backward compatibility or local runs
      console.log(`::set-output name=percentage::${recommendation.percentage}`);
      console.log(`::set-output name=reason::${recommendation.reason}`);
    }
    
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
