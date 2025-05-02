/**
 * Canary Evaluator Script
 * 
 * Pulls analytics data from PostHog, evaluates canary health,
 * and automatically updates canary configuration based on metrics.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PostHog } = require('posthog-node');
require('dotenv').config();

// Initialize PostHog client
const posthogClient = new PostHog(
  process.env.POSTHOG_API_KEY || 'test_key',
  { host: 'https://app.posthog.com' }
);

// Configuration
const CONFIG_PATH = path.resolve(__dirname, '../../config/canary-config.json');
const DAYS_TO_ANALYZE = 2; // Analyze data from the last 2 days
const MIN_DATA_POINTS = 100; // Minimum number of events required for decision

/**
 * Fetch analytics data from PostHog
 * @returns {Promise<Object>} Analytics data for stable and canary versions
 */
async function fetchAnalyticsData() {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DAYS_TO_ANALYZE);
    
    // Format dates for PostHog API
    const startDateFormatted = startDate.toISOString().split('T')[0];
    const endDateFormatted = endDate.toISOString().split('T')[0];
    
    // Get project ID from environment
    const projectId = process.env.POSTHOG_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('PostHog project ID not found in environment');
    }
    
    console.log(`Fetching analytics data from ${startDateFormatted} to ${endDateFormatted}`);
    
    // Query stable version data
    const stableMetricsResponse = await axios({
      method: 'post',
      url: `https://app.posthog.com/api/projects/${projectId}/insights/trend/`,
      headers: {
        'Authorization': `Bearer ${process.env.POSTHOG_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        date_from: startDateFormatted,
        date_to: endDateFormatted,
        events: [
          { id: 'pageview', name: 'pageview', math: 'total' },
          { id: '$pageview', name: '$pageview', math: 'total' },
          { id: 'error', name: 'error', math: 'total' }
        ],
        properties: [
          { key: 'version', value: 'stable', operator: 'exact' }
        ],
        display: 'ActionsTable'
      }
    });
    
    // Query canary version data
    const canaryMetricsResponse = await axios({
      method: 'post',
      url: `https://app.posthog.com/api/projects/${projectId}/insights/trend/`,
      headers: {
        'Authorization': `Bearer ${process.env.POSTHOG_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        date_from: startDateFormatted,
        date_to: endDateFormatted,
        events: [
          { id: 'pageview', name: 'pageview', math: 'total' },
          { id: '$pageview', name: '$pageview', math: 'total' },
          { id: 'error', name: 'error', math: 'total' }
        ],
        properties: [
          { key: 'version', value: 'canary', operator: 'exact' }
        ],
        display: 'ActionsTable'
      }
    });

    // Query performance metrics for stable
    const stablePerformanceResponse = await axios({
      method: 'post',
      url: `https://app.posthog.com/api/projects/${projectId}/insights/trend/`,
      headers: {
        'Authorization': `Bearer ${process.env.POSTHOG_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        date_from: startDateFormatted,
        date_to: endDateFormatted,
        events: [
          { id: '$performance_event', name: '$performance_event', math: 'avg', math_property: 'value' }
        ],
        properties: [
          { key: 'version', value: 'stable', operator: 'exact' }
        ],
        breakdown: 'name',
        display: 'ActionsTable'
      }
    });

    // Query performance metrics for canary
    const canaryPerformanceResponse = await axios({
      method: 'post',
      url: `https://app.posthog.com/api/projects/${projectId}/insights/trend/`,
      headers: {
        'Authorization': `Bearer ${process.env.POSTHOG_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        date_from: startDateFormatted,
        date_to: endDateFormatted,
        events: [
          { id: '$performance_event', name: '$performance_event', math: 'avg', math_property: 'value' }
        ],
        properties: [
          { key: 'version', value: 'canary', operator: 'exact' }
        ],
        breakdown: 'name',
        display: 'ActionsTable'
      }
    });
    
    // Process metrics data
    const stableData = processMetricsResponse(stableMetricsResponse.data);
    const canaryData = processMetricsResponse(canaryMetricsResponse.data);
    
    // Process performance data
    const stablePerformance = processPerformanceResponse(stablePerformanceResponse.data);
    const canaryPerformance = processPerformanceResponse(canaryPerformanceResponse.data);
    
    // Combine data
    return {
      stable: {
        ...stableData,
        performance: stablePerformance
      },
      canary: {
        ...canaryData,
        performance: canaryPerformance
      },
      summary: {
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        stableDataPoints: stableData.totalEvents || 0,
        canaryDataPoints: canaryData.totalEvents || 0
      }
    };
    
  } catch (error) {
    console.error('Error fetching analytics data:', error.message);
    return {
      stable: { error: true },
      canary: { error: true },
      summary: { error: error.message }
    };
  }
}

/**
 * Process metrics response data from PostHog
 * @param {Object} responseData PostHog API response
 * @returns {Object} Processed metrics
 */
function processMetricsResponse(responseData) {
  try {
    // Extract metrics from response
    const series = responseData.result || [];
    
    // Initialize counters
    let pageViews = 0;
    let errors = 0;
    let totalEvents = 0;
    
    // Process each series
    series.forEach(seriesItem => {
      const eventName = seriesItem.breakdown_value || seriesItem.label;
      const count = seriesItem.count || seriesItem.data.reduce((sum, val) => sum + val, 0);
      
      totalEvents += count;
      
      if (eventName === 'pageview' || eventName === '$pageview') {
        pageViews += count;
      }
      
      if (eventName === 'error') {
        errors += count;
      }
    });
    
    return {
      pageViews,
      errors,
      errorRate: pageViews > 0 ? errors / pageViews : 0,
      totalEvents
    };
  } catch (error) {
    console.error('Error processing metrics response:', error.message);
    return { error: true };
  }
}

/**
 * Process performance data from PostHog
 * @param {Object} responseData PostHog API response
 * @returns {Object} Processed performance metrics
 */
function processPerformanceResponse(responseData) {
  try {
    // Extract performance metrics from response
    const series = responseData.result || [];
    const performanceMetrics = {};
    
    // Process each performance metric
    series.forEach(seriesItem => {
      const metricName = seriesItem.breakdown_value;
      const avgValue = Array.isArray(seriesItem.data) && seriesItem.data.length > 0 
        ? seriesItem.data.reduce((sum, val) => sum + val, 0) / seriesItem.data.length
        : null;
        
      if (metricName && avgValue !== null) {
        performanceMetrics[metricName] = avgValue;
      }
    });
    
    return {
      pageLoadTime: performanceMetrics['page_load_time'] || performanceMetrics['load'] || null,
      lcp: performanceMetrics['LCP'] || performanceMetrics['lcp'] || null,
      fid: performanceMetrics['FID'] || performanceMetrics['fid'] || null,
      cls: performanceMetrics['CLS'] || performanceMetrics['cls'] || null
    };
  } catch (error) {
    console.error('Error processing performance response:', error.message);
    return {};
  }
}

/**
 * Evaluate canary health and make recommendation
 * @param {Object} analytics Analytics data
 * @returns {Object} Evaluation results
 */
function evaluateCanaryHealth(analytics) {
  const { stable, canary, summary } = analytics;
  
  // Check if we have enough data
  if (summary.error || stable.error || canary.error) {
    return {
      status: 'ERROR',
      confidence: 0,
      reason: `Error fetching data: ${summary.error || 'Unknown error'}`
    };
  }
  
  if (canary.totalEvents < MIN_DATA_POINTS) {
    return {
      status: 'NEED_MORE_DATA',
      confidence: 0.3,
      reason: `Insufficient canary data: ${canary.totalEvents}/${MIN_DATA_POINTS} events required`
    };
  }
  
  // Track issues found
  const issues = [];
  let criticalIssues = 0;
  
  // Error rate check
  if (canary.errorRate > stable.errorRate * 1.5) {
    if (canary.errorRate > 0.05) { // 5% error rate threshold
      criticalIssues++;
      issues.push(`Critical: Error rate ${(canary.errorRate * 100).toFixed(2)}% is significantly higher than stable ${(stable.errorRate * 100).toFixed(2)}%`);
    } else {
      issues.push(`Error rate increased: ${(canary.errorRate * 100).toFixed(2)}% vs ${(stable.errorRate * 100).toFixed(2)}%`);
    }
  }
  
  // Performance checks
  if (stable.performance && canary.performance) {
    // Page load time check
    if (canary.performance.pageLoadTime && stable.performance.pageLoadTime) {
      const pageLoadDiff = ((canary.performance.pageLoadTime - stable.performance.pageLoadTime) / stable.performance.pageLoadTime) * 100;
      
      if (pageLoadDiff > 30) { // 30% slower
        criticalIssues++;
        issues.push(`Critical: Page load time increased by ${pageLoadDiff.toFixed(1)}%`);
      } else if (pageLoadDiff > 15) { // 15% slower
        issues.push(`Page load time increased by ${pageLoadDiff.toFixed(1)}%`);
      }
    }
    
    // LCP check
    if (canary.performance.lcp && stable.performance.lcp) {
      const lcpDiff = ((canary.performance.lcp - stable.performance.lcp) / stable.performance.lcp) * 100;
      
      if (lcpDiff > 25) {
        issues.push(`LCP increased by ${lcpDiff.toFixed(1)}%`);
      }
    }
    
    // FID check
    if (canary.performance.fid && stable.performance.fid) {
      const fidDiff = ((canary.performance.fid - stable.performance.fid) / stable.performance.fid) * 100;
      
      if (fidDiff > 30) {
        issues.push(`FID increased by ${fidDiff.toFixed(1)}%`);
      }
    }
  }
  
  // Make recommendation
  if (criticalIssues > 0) {
    return {
      status: 'ROLLBACK',
      confidence: 0.9,
      reason: 'Critical issues detected',
      issues,
      recommendation: 'Roll back to stable version'
    };
  } 
  
  if (issues.length > 2) {
    return {
      status: 'SLOW_DOWN',
      confidence: 0.7,
      reason: 'Multiple issues detected',
      issues,
      recommendation: 'Pause rollout and investigate issues'
    };
  }
  
  if (issues.length > 0) {
    return {
      status: 'CAUTION',
      confidence: 0.5,
      reason: 'Minor issues detected',
      issues,
      recommendation: 'Continue rollout but monitor closely'
    };
  }
  
  // No issues found
  return {
    status: 'PROCEED',
    confidence: 0.8,
    reason: 'No significant issues detected',
    recommendation: 'Continue with normal rollout schedule'
  };
}

/**
 * Update the canary configuration based on evaluation results
 * @param {Object} evaluation Evaluation results
 * @returns {Object} Updated configuration
 */
function updateCanaryConfig(evaluation) {
  try {
    // Read current config
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);
    const currentDate = new Date().toISOString();
    
    console.log(`Current canary status: ${config.distribution.status}`);
    console.log(`Evaluation recommendation: ${evaluation.status}`);
    
    // Update distribution status based on evaluation
    switch (evaluation.status) {
      case 'ROLLBACK':
        // If current status is not already ROLLED_BACK, update it
        if (config.distribution.status !== 'ROLLED_BACK') {
          config.distribution.status = 'ROLLED_BACK';
          config.distribution.lastEvaluationDate = currentDate;
          config.distribution.lastEvaluationResult = evaluation;
        }
        break;
        
      case 'SLOW_DOWN':
        // Pause rollout by setting status to PAUSED
        if (config.distribution.status !== 'PAUSED') {
          config.distribution.status = 'PAUSED';
          config.distribution.lastEvaluationDate = currentDate;
          config.distribution.lastEvaluationResult = evaluation;
        }
        break;
        
      case 'CAUTION':
        // Slow down the rollout by reducing the canary percentage
        if (config.distribution.status !== 'PAUSED' && config.distribution.status !== 'ROLLED_BACK') {
          // Only slow down if current percentage is above 30%
          if (config.distribution.canaryPercentage > 30) {
            config.distribution.canaryPercentage = Math.max(30, Math.floor(config.distribution.canaryPercentage * 0.8));
          }
          config.distribution.lastEvaluationDate = currentDate;
          config.distribution.lastEvaluationResult = evaluation;
        }
        break;
        
      case 'PROCEED':
        // If previously paused or rolled back, set to active again
        if (config.distribution.status !== 'ACTIVE') {
          config.distribution.status = 'ACTIVE';
        }
        
        // Increase canary percentage if currently below 100%
        if (config.distribution.canaryPercentage < 100) {
          // Increase by 10% of the remaining percentage
          const increase = Math.ceil((100 - config.distribution.canaryPercentage) * 0.1);
          config.distribution.canaryPercentage = Math.min(100, config.distribution.canaryPercentage + increase);
        }
        
        config.distribution.lastEvaluationDate = currentDate;
        config.distribution.lastEvaluationResult = evaluation;
        break;
        
      case 'NEED_MORE_DATA':
      case 'ERROR':
      default:
        // Don't change the config, but record the evaluation
        config.distribution.lastEvaluationDate = currentDate;
        config.distribution.lastEvaluationResult = evaluation;
        break;
    }
    
    // Write updated config
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('Canary config updated successfully');
    
    return config;
  } catch (error) {
    console.error('Error updating canary config:', error.message);
    return null;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting canary evaluation...');
    
    // Fetch analytics data
    const analyticsData = await fetchAnalyticsData();
    console.log('Analytics data fetched:', JSON.stringify(analyticsData.summary, null, 2));
    
    // Evaluate canary health
    const evaluation = evaluateCanaryHealth(analyticsData);
    console.log('Evaluation results:', JSON.stringify(evaluation, null, 2));
    
    // Update configuration based on evaluation
    const updatedConfig = updateCanaryConfig(evaluation);
    console.log('Updated config:', JSON.stringify(updatedConfig.distribution, null, 2));
    
    console.log('Canary evaluation completed');
    
  } catch (error) {
    console.error('Error in canary evaluation:', error);
    process.exit(1);
  }
}

// Run the main function
main();