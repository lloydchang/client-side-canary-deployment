/**
 * Canary Configuration and Decision Logic
 * 
 * This file contains:
 * - Configuration for canary distribution
 * - Thresholds for metrics
 * - Decision logic for rollback/rollforward
 * - Remote configuration loading
 * - PostHog integration for analytics
 */

const CanaryConfig = {
    // Canary version identifier
    canaryVersion: '1.0.0',           // Current canary version
    
    // Canary distribution settings
    distribution: {
        canaryPercentage: 20,           // Percentage of users to receive canary version (0-100)
        gradualRollout: true,           // Whether to increase canary percentage over time
        rolloutPeriod: 7,               // Days to reach 100% rollout if gradualRollout is true
        initialDate: '2025-05-01',      // Date when canary deployment started
        safetyThreshold: 5,             // Minimum percentage to maintain even on rollback
        lastEvaluationDate: null,       // Last time the canary metrics were evaluated
        status: 'ACTIVE'                // Current status: ACTIVE, PAUSED, ROLLED_BACK
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
        posthogApiKey: 'ph_YOUR_KEY_HERE', // Replace with your actual PostHog API key
        posthogProjectId: 'YOUR_PROJECT_ID' // Your PostHog project ID for API requests
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
        },
        
        // Minimum required data points for reliable decision
        minSampleSize: {
            pageViews: 100,             // Minimum page views needed
            uniqueUsers: 20,            // Minimum unique users required
            hoursOfData: 6              // Minimum hours of data collection
        }
    },

    /**
     * Load remote configuration from a JSON file
     * 
     * @param {string} url - URL to the configuration file
     * @returns {Promise<boolean>} - Success status
     */
    async loadRemoteConfig(url = 'config/canary-config.json') {
        try {
            // Add cache buster to avoid stale configuration
            const cacheBuster = new Date().getTime();
            const response = await fetch(`${url}?_=${cacheBuster}`);
            
            if (response.ok) {
                const remoteConfig = await response.json();
                
                // Update version identifier
                if (remoteConfig.canaryVersion) {
                    this.canaryVersion = remoteConfig.canaryVersion;
                }
                
                // Update distribution settings
                if (remoteConfig.distribution) {
                    this.distribution = {
                        ...this.distribution,
                        ...remoteConfig.distribution
                    };
                }
                
                // Update feature flags
                if (remoteConfig.featureFlags) {
                    this.featureFlags = {
                        ...this.featureFlags,
                        ...remoteConfig.featureFlags
                    };
                }
                
                // Update analytics configuration
                if (remoteConfig.analytics) {
                    // Only update specific fields that should be changeable remotely
                    if (remoteConfig.analytics.sampleRate !== undefined) {
                        this.analytics.sampleRate = remoteConfig.analytics.sampleRate;
                    }
                    
                    if (remoteConfig.analytics.debug !== undefined) {
                        this.analytics.debug = remoteConfig.analytics.debug;
                    }
                    
                    if (remoteConfig.analytics.bufferInterval !== undefined) {
                        this.analytics.bufferInterval = remoteConfig.analytics.bufferInterval;
                    }
                }
                
                // Update thresholds if provided
                if (remoteConfig.thresholds) {
                    this.thresholds = {
                        ...this.thresholds,
                        ...remoteConfig.thresholds
                    };
                }
                
                console.log('[CanaryConfig] Remote config loaded successfully');
                
                // Dispatch event for config update
                window.dispatchEvent(new CustomEvent('canaryconfig:updated', {
                    detail: { config: this }
                }));
                
                return true;
            }
            
            console.warn('[CanaryConfig] Failed to load remote config, using defaults');
            return false;
            
        } catch (error) {
            console.error('[CanaryConfig] Error loading remote config:', error);
            return false;
        }
    },

    /**
     * Calculate the current canary percentage based on the rollout configuration
     * 
     * @returns {number} Current canary percentage
     */
    getCurrentCanaryPercentage: function() {
        const { canaryPercentage, gradualRollout, rolloutPeriod, initialDate, status } = this.distribution;
        
        // If rolled back, return safety threshold
        if (status === 'ROLLED_BACK') {
            return this.distribution.safetyThreshold;
        }
        
        // If paused, return current percentage
        if (status === 'PAUSED') {
            return canaryPercentage;
        }
        
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
     * @param {Object} stableMetrics - Aggregated metrics from stable version
     * @param {Object} canaryMetrics - Aggregated metrics from canary version
     * @returns {Object} Decision object with recommendation and details
     */
    evaluateCanaryHealth: function(stableMetrics, canaryMetrics) {
        if (!stableMetrics || !canaryMetrics) {
            return {
                decision: 'INCONCLUSIVE',
                confidence: 0,
                reason: 'Insufficient data'
            };
        }
        
        // Check if we have enough data
        if (!this._hasEnoughData(stableMetrics, canaryMetrics)) {
            return {
                decision: 'NEED_MORE_DATA',
                confidence: 0.3,
                reason: 'Insufficient sample size for reliable decision'
            };
        }
        
        // Track issues found
        const issues = [];
        let criticalIssues = 0;
        
        // Check performance metrics
        if (canaryMetrics.performance) {
            // Page load time check
            if (canaryMetrics.performance.pageLoadTime > stableMetrics.performance.pageLoadTime * 1.2) {
                if (canaryMetrics.performance.pageLoadTime > this.thresholds.performance.pageLoad.criticalThreshold) {
                    criticalIssues++;
                    issues.push('Critical: Page load time exceeds threshold');
                } else {
                    issues.push('Page load time degraded by more than 20%');
                }
            }
            
            // LCP check
            if (canaryMetrics.performance.lcp && stableMetrics.performance.lcp) {
                if (canaryMetrics.performance.lcp > stableMetrics.performance.lcp * 1.25) {
                    issues.push('LCP degraded by more than 25%');
                }
            }
            
            // FID check
            if (canaryMetrics.performance.fid && stableMetrics.performance.fid) {
                if (canaryMetrics.performance.fid > stableMetrics.performance.fid * 1.3) {
                    issues.push('FID (interaction delay) degraded by more than 30%');
                }
            }
            
            // CLS check
            if (canaryMetrics.performance.cls && stableMetrics.performance.cls) {
                if (canaryMetrics.performance.cls > stableMetrics.performance.cls * 1.5) {
                    issues.push('CLS (layout shift) increased by more than 50%');
                }
            }
        }
        
        // Check error rates
        const stableErrorRate = this._calculateErrorRate(stableMetrics);
        const canaryErrorRate = this._calculateErrorRate(canaryMetrics);
        
        if (canaryErrorRate > stableErrorRate * 1.5) {
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
        
        // Check engagement metrics if available
        if (canaryMetrics.engagement && stableMetrics.engagement) {
            if (canaryMetrics.engagement.scrollDepth < stableMetrics.engagement.scrollDepth * 0.8) {
                issues.push('Scroll depth decreased by more than 20%');
            }
            
            if (canaryMetrics.engagement.duration < stableMetrics.engagement.duration * 0.8) {
                issues.push('Session duration decreased by more than 20%');
            }
        }
        
        // Make decision based on findings
        if (criticalIssues > 0) {
            return {
                decision: 'ROLLBACK',
                confidence: 0.9,
                reason: 'Critical issues detected',
                issues,
                recommendation: 'Roll back to stable version immediately'
            };
        } 
        
        if (issues.length > 2) {
            return {
                decision: 'SLOW_DOWN',
                confidence: 0.7,
                reason: 'Multiple issues detected',
                issues,
                recommendation: 'Pause rollout and investigate issues'
            };
        }
        
        if (issues.length > 0) {
            return {
                decision: 'CAUTION',
                confidence: 0.5,
                reason: 'Some issues detected',
                issues,
                recommendation: 'Continue rollout but monitor closely'
            };
        }
        
        // No issues found
        return {
            decision: 'PROCEED',
            confidence: 0.8,
            reason: 'No significant issues detected',
            recommendation: 'Continue with normal rollout schedule'
        };
    },
    
    /**
     * Check if we have enough data for reliable decision making
     * 
     * @private
     * @param {Object} stableMetrics - Metrics from stable version
     * @param {Object} canaryMetrics - Metrics from canary version
     * @returns {boolean} True if enough data is available
     */
    _hasEnoughData: function(stableMetrics, canaryMetrics) {
        const { pageViews, uniqueUsers } = this.thresholds.minSampleSize;
        
        // Check stable metrics
        if (!stableMetrics.engagement || 
            !stableMetrics.engagement.pageViews || 
            stableMetrics.engagement.pageViews < pageViews) {
            return false;
        }
        
        // Check canary metrics
        if (!canaryMetrics.engagement || 
            !canaryMetrics.engagement.pageViews || 
            canaryMetrics.engagement.pageViews < pageViews) {
            return false;
        }
        
        // Check unique users if available
        if (stableMetrics.engagement.uniqueUsers && canaryMetrics.engagement.uniqueUsers) {
            if (stableMetrics.engagement.uniqueUsers < uniqueUsers || 
                canaryMetrics.engagement.uniqueUsers < uniqueUsers) {
                return false;
            }
        }
        
        return true;
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
    },

    /**
     * Fetch metrics from PostHog for analysis
     * 
     * @param {string} timeRange - Time range for metrics (e.g. '24h', '7d')
     * @returns {Promise<Object>} Object with metrics for canary and stable versions
     */
    async fetchPostHogMetrics(timeRange = '24h', apiKey = null) {
        // If no API key provided, use the configured one
        const key = apiKey || this.analytics.posthogApiKey;
        if (!key || key === 'ph_YOUR_KEY_HERE') {
            console.error('[CanaryConfig] No PostHog API key provided');
            return null;
        }

        try {
            // Demo implementation - in production, use proper server-side API calls
            // This is just a placeholder for the GitHub Actions workflow
            console.log('[CanaryConfig] Fetching PostHog metrics');
            return {
                stableMetrics: { /* This would be actual metrics */ },
                canaryMetrics: { /* This would be actual metrics */ }
            };
        } catch (error) {
            console.error('[CanaryConfig] Error fetching PostHog metrics:', error);
            return null;
        }
    }
};

// Make available globally
window.CanaryConfig = CanaryConfig;