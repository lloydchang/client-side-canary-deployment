/**
 * Canary Deployment Evaluator
 * 
 * This script:
 * 1. Fetches analytics data from PostHog
 * 2. Compares metrics between canary and stable versions
 * 3. Makes automated decisions about whether to:
 *    - Continue the canary deployment
 *    - Accelerate the rollout
 *    - Roll back to stable
 * 4. Updates the canary configuration accordingly
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'canary-config.json');
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_BASE_URL = 'https://app.posthog.com/api';

// Load current configuration
const loadConfig = () => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    process.exit(1);
  }
};

// Save updated configuration
const saveConfig = (config) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('Configuration updated successfully');
  } catch (error) {
    console.error('Error saving configuration:', error);
    process.exit(1);
  }
};

// Make PostHog API request
const queryPostHog = async (endpoint, params) => {
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams(params).toString();
    const requestOptions = {
      hostname: 'app.posthog.com',
      path: `/api/${endpoint}?${queryParams}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

// Fetch metrics from PostHog
const fetchMetrics = async (config) => {
  try {
    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setHours(now.getHours() - 24); // Get last 24 hours of data
    
    // Params for fetch
    const params = {
      date_from: pastDate.toISOString(),
      date_to: now.toISOString(),
      interval: 'hour',
      events: JSON.stringify([
        {"id": "pageview", "properties": [{"key": "version", "value": "stable", "type": "event"}]},
        {"id": "pageview", "properties": [{"key": "version", "value": "canary", "type": "event"}]},
        {"id": "$pageview_funnel_error", "properties": [{"key": "version", "value": "stable", "type": "event"}]},
        {"id": "$pageview_funnel_error", "properties": [{"key": "version", "value": "canary", "type": "event"}]}
      ])
    };

    const results = await queryPostHog(`projects/${POSTHOG_PROJECT_ID}/insights/trend/`, params);
    
    // Process the metrics
    const metrics = {
      stableVersion: {
        pageViews: 0,
        errors: 0,
        errorRate: 0,
        userSatisfaction: 0
      },
      canaryVersion: {
        pageViews: 0,
        errors: 0,
        errorRate: 0,
        userSatisfaction: 0
      }
    };

    // Process results to extract the metrics
    if (results && results.result) {
      // Parse stable version pageviews
      metrics.stableVersion.pageViews = results.result[0].data.reduce((sum, val) => sum + val, 0);
      // Parse canary version pageviews
      metrics.canaryVersion.pageViews = results.result[1].data.reduce((sum, val) => sum + val, 0);
      // Parse stable version errors
      metrics.stableVersion.errors = results.result[2].data.reduce((sum, val) => sum + val, 0);
      // Parse canary version errors
      metrics.canaryVersion.errors = results.result[3].data.reduce((sum, val) => sum + val, 0);
    }

    // Calculate derived metrics
    metrics.stableVersion.errorRate = metrics.stableVersion.errors / Math.max(metrics.stableVersion.pageViews, 1);
    metrics.canaryVersion.errorRate = metrics.canaryVersion.errors / Math.max(metrics.canaryVersion.pageViews, 1);

    // Calculate user satisfaction (simplified model)
    metrics.stableVersion.userSatisfaction = 1 - metrics.stableVersion.errorRate;
    metrics.canaryVersion.userSatisfaction = 1 - metrics.canaryVersion.errorRate;

    console.log('Metrics fetched:', JSON.stringify(metrics, null, 2));
    return metrics;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return null;
  }
};

// Evaluate canary performance and make decision
const evaluateCanary = (config, metrics) => {
  // Skip evaluation if not enough data
  const minSampleSize = config.thresholds.minSampleSize;
  
  if (metrics.canaryVersion.pageViews < minSampleSize.pageViews) {
    console.log('Not enough canary pageviews for evaluation');
    return {
      decision: 'HOLD',
      confidence: 0.5,
      details: `Insufficient data: ${metrics.canaryVersion.pageViews} pageviews (need ${minSampleSize.pageViews})`
    };
  }

  // Compare error rates (the most critical metric)
  const errorRateDiff = metrics.canaryVersion.errorRate - metrics.stableVersion.errorRate;
  const errorRateRelativeDiff = errorRateDiff / Math.max(metrics.stableVersion.errorRate, 0.001);
  
  // Decision logic
  let decision, confidence, details;
  
  if (errorRateRelativeDiff > 0.5) {
    // Canary error rate is 50% worse than stable
    decision = 'ROLLBACK';
    confidence = 0.9;
    details = `Canary error rate ${(errorRateRelativeDiff * 100).toFixed(2)}% higher than stable`;
  } else if (errorRateRelativeDiff > 0.2) {
    // Canary error rate is 20-50% worse than stable
    decision = 'SLOW_DOWN';
    confidence = 0.7;
    details = `Canary error rate ${(errorRateRelativeDiff * 100).toFixed(2)}% higher than stable`;
  } else if (errorRateRelativeDiff < -0.1) {
    // Canary error rate is 10% better than stable
    decision = 'ACCELERATE';
    confidence = 0.8;
    details = `Canary error rate ${Math.abs(errorRateRelativeDiff * 100).toFixed(2)}% lower than stable`;
  } else {
    // Error rates are comparable (within 20% worse or 10% better)
    decision = 'PROCEED';
    confidence = 0.6;
    details = 'Canary and stable error rates are comparable';
  }

  return {
    decision,
    confidence,
    details
  };
};

// Update config based on evaluation decision
const updateConfig = (config, metrics, evaluation) => {
  const currentDate = new Date().toISOString();
  
  // Update insights
  config.insights = {
    recentEvaluation: {
      date: currentDate,
      decision: evaluation.decision,
      confidence: evaluation.confidence,
      details: evaluation.details
    },
    stableVersion: {
      errorRate: metrics.stableVersion.errorRate,
      pageViews: metrics.stableVersion.pageViews,
      userSatisfaction: metrics.stableVersion.userSatisfaction
    },
    canaryVersion: {
      errorRate: metrics.canaryVersion.errorRate,
      pageViews: metrics.canaryVersion.pageViews,
      userSatisfaction: metrics.canaryVersion.userSatisfaction
    }
  };
  
  // Update distribution based on decision
  config.distribution.lastEvaluationDate = currentDate;
  
  switch (evaluation.decision) {
    case 'ROLLBACK':
      config.distribution.canaryPercentage = config.distribution.safetyThreshold;
      config.distribution.status = 'ROLLED_BACK';
      break;
    case 'SLOW_DOWN':
      // Reduce canary percentage by 25% but not below safety threshold
      const reducedPercentage = Math.max(
        config.distribution.canaryPercentage * 0.75, 
        config.distribution.safetyThreshold
      );
      config.distribution.canaryPercentage = Math.round(reducedPercentage);
      break;
    case 'ACCELERATE':
      // Increase canary percentage by 20% but not above 100%
      config.distribution.canaryPercentage = Math.min(
        Math.round(config.distribution.canaryPercentage * 1.2),
        100
      );
      break;
    case 'PROCEED':
      // Maintain current gradual rollout plan
      if (config.distribution.gradualRollout) {
        // Calculate days since initial deployment
        const initialDate = new Date(config.distribution.initialDate);
        const currentDate = new Date();
        const daysSinceStart = Math.floor((currentDate - initialDate) / (1000 * 60 * 60 * 24));
        
        // Calculate target percentage based on rollout period
        const targetPercentage = Math.min(
          Math.round((daysSinceStart / config.distribution.rolloutPeriod) * 100),
          100
        );
        
        // Only increase percentage, never decrease in the normal case
        if (targetPercentage > config.distribution.canaryPercentage) {
          config.distribution.canaryPercentage = targetPercentage;
        }
      }
      break;
  }
  
  config.lastUpdated = currentDate;
  config.updateSource = 'automated';
  
  return config;
};

// Main function
const main = async () => {
  console.log('Starting canary evaluation...');
  const config = loadConfig();
  
  // Skip evaluation if canary is already rolled back
  if (config.distribution.status === 'ROLLED_BACK') {
    console.log('Canary deployment is already rolled back. No evaluation needed.');
    return;
  }
  
  const metrics = await fetchMetrics(config);
  if (!metrics) {
    console.log('Failed to fetch metrics. No changes made to configuration.');
    return;
  }
  
  const evaluation = evaluateCanary(config, metrics);
  console.log('Evaluation result:', evaluation);
  
  const updatedConfig = updateConfig(config, metrics, evaluation);
  saveConfig(updatedConfig);
  
  console.log('Canary evaluation completed successfully.');
};

// Execute the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});