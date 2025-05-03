#!/usr/bin/env node

/**
 * PostHog Analytics Query Script
 * 
 * This script queries PostHog for analytics data related to canary deployments
 * and generates a report that can be used for automated decision making.
 */

const https = require('https');

// Configuration from environment variables or defaults
const config = {
  apiKey: process.env.POSTHOG_API_KEY,
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.POSTHOG_HOST || 'app.posthog.com',
  errorThreshold: parseFloat(process.env.ERROR_THRESHOLD || 0.02), // 2% default
  timeframe: process.env.TIMEFRAME || '24h'
};

// Validate required configuration
if (!config.apiKey) {
  console.error('Error: POSTHOG_API_KEY environment variable is required');
  process.exit(1);
}

if (!config.projectId) {
  console.error('Error: POSTHOG_PROJECT_ID environment variable is required');
  process.exit(1);
}

/**
 * Make a request to the PostHog API
 * @param {string} path - API endpoint path
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Response data
 */
function queryPostHog(path, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: config.host,
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
 * @returns {Promise<Object>} Event count data
 */
async function getVersionEvents() {
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
    console.error('Failed to fetch PostHog data:', error.message);
    process.exit(1);
  }
}

/**
 * Process and analyze the event data
 * @param {Object} pageviewsData - Pageview event data from PostHog
 * @param {Object} errorsData - Error event data from PostHog
 * @returns {Object} - Analyzed results
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
 * Main function to run the analysis
 */
async function main() {
  try {
    const results = await getVersionEvents();
    
    // Output the results as JSON
    console.log(JSON.stringify(results, null, 2));
    
    // Exit with error code if threshold exceeded
    if (results.analysis.exceedsThreshold) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
