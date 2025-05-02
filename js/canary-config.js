/**
 * Canary Configuration and Decision Logic
 * 
 * This file contains:
 * - Configuration for canary distribution
 * - Thresholds for metrics
 * - Decision logic for rollback/rollforward
 */

const CanaryConfig = {
    // Canary distribution settings
    distribution: {
        canaryPercentage: 20,           // Percentage of users to receive canary version (0-100)
        gradualRollout: true,           // Whether to increase canary percentage over time
        rolloutPeriod: 7,               // Days to reach 100% rollout if gradualRollout is true
        initialDate: '2025-05-01',      // Date when canary deployment started
        safetyThreshold: 5              // Minimum percentage to maintain even on rollback
    },

    // Feature flags for canary version
    featureFlags: {
        newDesign: true,
        betaFeatures: false,
        performanceOptimizations: true
    },

    // Analytics configuration
    analytics: {
        debug: false,
        sampleRate: 1.0,                // Track 100% of users
        endpoint: null,                 // Set to your collection endpoint, or null for local storage only
        storageKey: 'canary_analytics',
        bufferInterval: 30000,          // Send data every 30 seconds if endpoint is defined
        maxEventsStored: 100,           // Maximum events to store locally
    },

    // Metrics thresholds for rollback decisions
    thresholds: {
        // Performance thresholds (milliseconds)
        performance: {
            pageLoad: {
                p50: 1500,              // 50th percentile (median) threshold
                p90: 3000,              // 90th percentile threshold
                criticalThreshold: 5000  // Critical threshold for immediate action
            },
            fid: {                      // First Input Delay
                p50: 100,
                p90: 300
            },
            cls: {                      // Cumulative Layout Shift
                p50: 0.1,
                p90: 0.25
            },
            lcp: {                      // Largest Contentful Paint
                p50: 2500,
                p90: 4000
            }
        },

        // Error rate thresholds
        errors: {
            maxErrorRate: 0.02,         // Maximum allowed error rate (2%)
            criticalErrors: 0.005,      // Critical error rate for immediate action (0.5%)
            ignoredErrors: [            // Error messages to ignore in calculations
                'Script error.',
                'ResizeObserver loop limit exceeded'
            ]
        },

        // User engagement thresholds
        engagement: {
            minScrollDepth: 30,         // Minimum average scroll depth percentage
            minSessionDuration: 60,     // Minimum average session duration (seconds)
            bounceRateThreshold: 0.6    // Maximum acceptable bounce rate
        }
    },

    /**
     * Calculate the current canary percentage based on the rollout configuration
     * 
     * @returns {number} Current canary percentage
     */
    getCurrentCanaryPercentage: function() {
        const { canaryPercentage, gradualRollout, rolloutPeriod, initialDate } = this.distribution;
        
        if (!gradualRollout) {
            return canaryPercentage;
        }

        // Calculate days since initial deployment
        const initialTimestamp = new Date(initialDate).getTime();
        const currentTimestamp = new Date().getTime();
        const daysSinceDeployment = Math.floor((currentTimestamp - initialTimestamp) / (1000 * 60 * 60 * 24));
        
        if (daysSinceDeployment < 0) {
            return 0;
        }
        
        // Calculate percentage based on rollout period
        const calculatedPercentage = Math.min(100, Math.floor((daysSinceDeployment / rolloutPeriod) * 100));
        
        // Use the smaller of the calculated percentage and the configured percentage
        // This allows for manual control if needed
        return Math.min(calculatedPercentage, canaryPercentage);
    },

    /**
     * Decide if a user should see the canary version
     * 
     * @returns {boolean} True if user should see canary version
     */
    shouldUseCanary: function() {
        // Get current canary percentage
        const percentage = this.getCurrentCanaryPercentage();
        
        // Generate a random number between 0 and 100
        const randomValue = Math.random() * 100;
        
        // User gets canary if random value is less than the percentage
        return randomValue < percentage;
    },

    /**
     * Evaluate canary metrics to make rollback/rollforward decision
     * 
     * @param {Object} defaultMetrics - Aggregated metrics from default version
     * @param {Object} canaryMetrics - Aggregated metrics from canary version
     * @returns {Object} Decision object with recommendation and details
     */
    evaluateCanaryHealth: function(defaultMetrics, canaryMetrics) {
        if (!defaultMetrics || !canaryMetrics) {
            return {
                decision: 'INCONCLUSIVE',
                confidence: 0,
                reason: 'Insufficient data'
            };
        }
        
        // Track issues found
        const issues = [];
        let criticalIssues = 0;
        
        // Check performance metrics
        if (canaryMetrics.performance) {
            // Page load time check
            if (canaryMetrics.performance.pageLoadTime > defaultMetrics.performance.pageLoadTime * 1.2) {
                if (canaryMetrics.performance.pageLoadTime > this.thresholds.performance.pageLoad.criticalThreshold) {
                    criticalIssues++;
                    issues.push('Critical: Page load time exceeds threshold');
                } else {
                    issues.push('Page load time degraded by more than 20%');
                }
            }
            
            // Check other performance metrics similarly
            // ...
        }
        
        // Check error rates
        const defaultErrorRate = this._calculateErrorRate(defaultMetrics);
        const canaryErrorRate = this._calculateErrorRate(canaryMetrics);
        
        if (canaryErrorRate > defaultErrorRate * 1.5) {
            issues.push('Error rate increased by more than 50%');
        }
        
        if (canaryErrorRate > this.thresholds.errors.maxErrorRate) {
            if (canaryErrorRate > this.thresholds.errors.criticalErrors) {
                criticalIssues++;
                issues.push('Critical: Error rate exceeds critical threshold');
            } else {
                issues.push('Error rate exceeds maximum threshold');
            }
        }
        
        // Make decision based on findings
        if (criticalIssues > 0) {
            return {
                decision: 'ROLLBACK',
                confidence: 0.9,
                reason: 'Critical issues detected',
                issues
            };
        } 
        
        if (issues.length > 2) {
            return {
                decision: 'SLOW_DOWN',
                confidence: 0.7,
                reason: 'Multiple issues detected',
                issues
            };
        }
        
        if (issues.length > 0) {
            return {
                decision: 'CAUTION',
                confidence: 0.5,
                reason: 'Some issues detected',
                issues
            };
        }
        
        // No issues found
        return {
            decision: 'PROCEED',
            confidence: 0.8,
            reason: 'No significant issues detected'
        };
    },
    
    /**
     * Calculate error rate from metrics
     * 
     * @private
     * @param {Object} metrics - Metrics object containing error data
     * @returns {number} Error rate as a decimal
     */
    _calculateErrorRate: function(metrics) {
        if (!metrics || !metrics.errors || !Array.isArray(metrics.errors)) {
            return 0;
        }
        
        // Filter out ignored errors
        const relevantErrors = metrics.errors.filter(error => {
            return !this.thresholds.errors.ignoredErrors.some(ignored => 
                error.message && error.message.includes(ignored)
            );
        });
        
        // Simple calculation - can be enhanced with more sophisticated logic
        const pageviews = metrics.engagement ? metrics.engagement.pageViews || 1 : 1;
        return relevantErrors.length / pageviews;
    }
};

// Make available globally
window.CanaryConfig = CanaryConfig;