/**
 * CanaryJS - One-Line Canary Deployment Solution
 * An ultra-simple, zero-config approach to client-side canary deployments
 */

(function(window) {
  // Main canary object
  const canary = {
    // Configuration with opinionated defaults
    _config: {
      initialCanaryPercentage: 5,      // Start with 5% of users
      maxCanaryPercentage: 50,         // Never go above 50% without manual review
      safetyThreshold: 2,              // Keep at least 2% even on rollback
      gradualRollout: true,            // Automatically increase percentage over time
      rolloutPeriod: 7,                // Days to reach max percentage
      storageKey: 'canary_assignment', // localStorage key for assignment
      metricsStorageKey: 'canary_metrics', // localStorage key for metrics
      autoEvaluate: true,              // Auto-evaluate metrics periodically
      evaluationInterval: 3600000,     // Evaluate every hour (in milliseconds)
      errorThreshold: 1.5,             // Rollback if error rate 1.5x stable version
      posthogEnabled: false,           // PostHog disabled by default (localStorage fallback)
      posthogApiKey: null,             // PostHog API key (if enabled)
      sessionStorageKey: 'canary_session' // Add session storage key for session-specific data
    },
    
    // Features registry
    _features: {},
    
    // Metrics storage
    _metrics: {
      stable: {
        pageviews: 0,
        errors: 0,
        performance: {
          pageLoadTime: 0,
          measurements: []
        }
      },
      canary: {
        pageviews: 0,
        errors: 0,
        performance: {
          pageLoadTime: 0,
          measurements: []
        }
      }
    },
    
    // User assignment
    _assignment: {
      version: null,      // 'stable' or 'canary'
      assignedAt: null,   // Timestamp of assignment
      percentage: null,   // Percentage at time of assignment
      features: {}        // Enabled features for this user
    },
    
    /**
     * Initialize canary system
     * @param {Object} options - Optional configuration
     */
    init: function(options = {}) {
      // Override defaults with provided options
      if (options) {
        this._config = {...this._config, ...options};
      }
      
      // Load or initialize assignment
      this._loadAssignment();
      
      // Set up error tracking
      this._setupErrorTracking();
      
      // Track performance
      this._trackPerformance();
      
      // Set up PostHog if API key is provided
      if (this._config.posthogApiKey) {
        this._initPostHog(this._config.posthogApiKey);
        this._config.posthogEnabled = true;
      }
      
      // Set up auto-evaluation if enabled
      if (this._config.autoEvaluate) {
        this._setupAutoEvaluation();
      }
      
      // Load saved metrics
      this._loadMetrics();
      
      // Track pageview
      this.trackEvent('pageview');
      
      return this;
    },
    
    /**
     * Configure canary settings
     * @param {Object} options - Configuration options
     */
    config: function(options) {
      this._config = {...this._config, ...options};
      return this;
    },
    
    /**
     * Enable PostHog analytics
     * @param {string} apiKey - PostHog API key
     */
    analytics: function(apiKey) {
      this._config.posthogApiKey = apiKey;
      this._config.posthogEnabled = true;
      this._initPostHog(apiKey);
      return this;
    },
    
    /**
     * Define a single feature
     * @param {string} name - Feature name
     * @param {Object} options - Feature options
     */
    defineFeature: function(name, options = {}) {
      this._features[name] = {
        name: name,
        description: options.description || name,
        initialPercentage: options.initialPercentage || this._config.initialCanaryPercentage,
        currentPercentage: options.initialPercentage || this._config.initialCanaryPercentage,
        enabled: false
      };
      
      // Determine if this feature is enabled for the current user
      if (this._assignment.version === 'canary') {
        this._evaluateFeature(name);
      }
      
      return this;
    },
    
    /**
     * Define multiple features at once
     * @param {Object} featuresObject - Object containing feature definitions
     */
    defineFeatures: function(featuresObject) {
      for (const [name, options] of Object.entries(featuresObject)) {
        this.defineFeature(name, options);
      }
      return this;
    },
    
    /**
     * Check if a feature is enabled for the current user
     * @param {string} featureName - Name of the feature to check
     * @returns {boolean} True if the feature is enabled
     */
    isEnabled: function(featureName) {
      // If feature status is already determined in current session
      if (this._assignment.features && this._assignment.features[featureName] !== undefined) {
        return this._assignment.features[featureName];
      }
      
      // If feature isn't registered, register it with default settings
      if (!this._features[featureName]) {
        this.defineFeature(featureName);
      }
      
      // Always disabled for stable version
      if (this._assignment.version === 'stable') {
        this._assignment.features[featureName] = false;
        return false;
      }
      
      // Evaluate for canary version
      return this._evaluateFeature(featureName);
    },
    
    /**
     * Track a custom event
     * @param {string} eventName - Name of the event
     * @param {Object} properties - Event properties
     */
    trackEvent: function(eventName, properties = {}) {
      // Track internally
      const version = this._assignment.version || 'unknown';
      this._metrics[version].events = this._metrics[version].events || [];
      this._metrics[version].events.push({
        name: eventName,
        timestamp: Date.now(),
        properties
      });
      
      // Send to PostHog if enabled
      this._sendToPostHog(eventName, properties);
      
      // Save metrics
      this._saveMetrics();
      
      return this;
    },
    
    /**
     * Track an error
     * @param {string} message - Error message
     * @param {string} stack - Error stack
     */
    trackError: function(message, stack = '') {
      const version = this._assignment.version || 'unknown';
      this._metrics[version].errors = this._metrics[version].errors || 0;
      this._metrics[version].errors++;
      
      // Track error details
      this._metrics[version].errorDetails = this._metrics[version].errorDetails || [];
      this._metrics[version].errorDetails.push({
        message,
        stack,
        timestamp: Date.now()
      });
      
      // Send to PostHog if enabled
      this._sendToPostHog('error', { message, stack });
      
      // Save metrics
      this._saveMetrics();
      
      return this;
    },
    
    /**
     * Get results of the canary deployment
     * @returns {Object} Metrics and evaluation results
     */
    getResults: function() {
      // Calculate error rates
      const stableErrorRate = this._calculateErrorRate('stable');
      const canaryErrorRate = this._calculateErrorRate('canary');
      
      const metrics = {
        stable: {
          pageviews: this._metrics.stable.pageviews || 0,
          errors: this._metrics.stable.errors || 0,
          errorRate: stableErrorRate
        },
        canary: {
          pageviews: this._metrics.canary.pageviews || 0,
          errors: this._metrics.canary.errors || 0,
          errorRate: canaryErrorRate
        },
        features: this._features,
        currentAssignment: this._assignment,
        healthStatus: canaryErrorRate <= stableErrorRate * this._config.errorThreshold ? 'healthy' : 'unhealthy',
        lastEvaluation: this._metrics.lastEvaluation || null
      };
      
      return metrics;
    },
    
    /**
     * Update the user's version assignment directly
     * This is used by the version-switcher to change versions manually
     * @param {string} version - The version to switch to ('stable' or 'canary')
     */
    updateVersion: function(version) {
      if (version !== 'stable' && version !== 'canary') {
        console.error('Invalid version. Must be "stable" or "canary"');
        return this;
      }
      
      // Update assignment
      this._assignment.version = version;
      this._assignment.manuallyAssigned = true;
      
      // Save to localStorage
      localStorage.setItem(this._config.storageKey, JSON.stringify(this._assignment));
      
      // Track the manual version change
      this.trackEvent('manual_version_change', {
        previousVersion: this._assignment.version,
        newVersion: version
      });
      
      // Reset feature assignments for the new version
      this._assignment.features = {};
      
      // Re-evaluate all registered features
      for (const featureName in this._features) {
        this._evaluateFeature(featureName);
      }
      
      return this;
    },
    
    // Internal methods
    
    /**
     * Load user assignment from localStorage or create new assignment
     * @private
     */
    _loadAssignment: function() {
      const saved = localStorage.getItem(this._config.storageKey);
      
      if (saved) {
        try {
          this._assignment = JSON.parse(saved);
        } catch (e) {
          // If parsing fails, create a new assignment
          this._createAssignment();
        }
      } else {
        // No saved assignment, create new one
        this._createAssignment();
      }
    },
    
    /**
     * Create a new user assignment
     * @private
     */
    _createAssignment: function() {
      // Calculate current canary percentage
      const currentPercentage = this._calculateCurrentPercentage();
      
      // Assign user based on percentage
      const version = Math.random() * 100 < currentPercentage ? 'canary' : 'stable';
      
      this._assignment = {
        version: version,
        assignedAt: Date.now(),
        percentage: currentPercentage,
        features: {}
      };
      
      // Save assignment to localStorage
      localStorage.setItem(this._config.storageKey, JSON.stringify(this._assignment));
      
      // Increment pageview for this version
      this._metrics[version].pageviews = (this._metrics[version].pageviews || 0) + 1;
      this._saveMetrics();
    },
    
    /**
     * Load metrics from localStorage
     * @private
     */
    _loadMetrics: function() {
      const saved = localStorage.getItem(this._config.metricsStorageKey);
      
      if (saved) {
        try {
          this._metrics = JSON.parse(saved);
        } catch (e) {
          // If parsing fails, use default metrics
          // Default metrics already set in initialization
        }
      }
    },
    
    /**
     * Save metrics to localStorage
     * @private
     */
    _saveMetrics: function() {
      localStorage.setItem(this._config.metricsStorageKey, JSON.stringify(this._metrics));
    },
    
    /**
     * Calculate current canary percentage based on gradual rollout settings
     * @private
     * @returns {number} Current canary percentage
     */
    _calculateCurrentPercentage: function() {
      const { initialCanaryPercentage, maxCanaryPercentage, gradualRollout, rolloutPeriod } = this._config;
      
      if (!gradualRollout) {
        return initialCanaryPercentage;
      }
      
      // Get last evaluation result
      if (this._metrics.lastEvaluation && this._metrics.lastEvaluation.recommendation === 'ROLLBACK') {
        return this._config.safetyThreshold;
      }
      
      // Simple gradual increase based on pageviews
      const stableViews = this._metrics.stable.pageviews || 0;
      const canaryViews = this._metrics.canary.pageviews || 0;
      const totalViews = stableViews + canaryViews;
      
      if (totalViews < 10) {
        return initialCanaryPercentage;
      }
      
      // Calculate percentage based on data collected
      const calculatedPercentage = initialCanaryPercentage + 
        (Math.min(100, Math.floor(totalViews / 10)) * (maxCanaryPercentage - initialCanaryPercentage) / 100);
        
      return Math.min(maxCanaryPercentage, calculatedPercentage);
    },
    
    /**
     * Evaluate if a feature should be enabled for the current user
     * @private
     * @param {string} featureName - Name of the feature to evaluate
     * @returns {boolean} True if the feature is enabled
     */
    _evaluateFeature: function(featureName) {
      // Feature is already evaluated
      if (this._assignment.features[featureName] !== undefined) {
        return this._assignment.features[featureName];
      }
      
      // User is not in canary group
      if (this._assignment.version !== 'canary') {
        this._assignment.features[featureName] = false;
        localStorage.setItem(this._config.storageKey, JSON.stringify(this._assignment));
        return false;
      }
      
      // If feature doesn't exist, create it with defaults
      if (!this._features[featureName]) {
        this.defineFeature(featureName);
      }
      
      // Randomize based on feature percentage
      const feature = this._features[featureName];
      const enabled = Math.random() * 100 < feature.currentPercentage;
      
      // Save the decision for this user
      this._assignment.features[featureName] = enabled;
      localStorage.setItem(this._config.storageKey, JSON.stringify(this._assignment));
      
      return enabled;
    },
    
    /**
     * Set up error tracking
     * @private
     */
    _setupErrorTracking: function() {
      window.addEventListener('error', (event) => {
        this.trackError(event.message, event.error ? event.error.stack : '');
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError(`Promise rejection: ${event.reason}`, '');
      });
    },
    
    /**
     * Track performance metrics
     * @private
     */
    _trackPerformance: function() {
      // Wait for page to finish loading
      window.addEventListener('load', () => {
        setTimeout(() => {
          if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
            
            // Store performance data
            const version = this._assignment.version || 'unknown';
            this._metrics[version].performance = this._metrics[version].performance || {};
            this._metrics[version].performance.pageLoadTime = pageLoadTime;
            
            // Get web vitals if available
            if (window.performance && window.performance.getEntriesByType) {
              try {
                // Get LCP
                const paintEntries = window.performance.getEntriesByType('paint');
                const lcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
                if (lcpEntry) {
                  this._metrics[version].performance.lcp = lcpEntry.startTime;
                }
                
                // Get CLS if available
                if (window.LayoutShift && window.LayoutShift.value) {
                  this._metrics[version].performance.cls = window.LayoutShift.value;
                }
              } catch (e) {
                // Ignore errors in performance measurement
              }
            }
            
            this._saveMetrics();
          }
        }, 0);
      });
    },
    
    /**
     * Initialize PostHog for analytics
     * @private
     * @param {string} apiKey - PostHog API key
     */
    _initPostHog: function(apiKey) {
      // Only load PostHog once
      if (window.posthog) {
        return;
      }
      
      try {
        // Load PostHog script
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document, window.posthog||[]);
        
        posthog.init(apiKey, {
          api_host: 'https://app.posthog.com',
          persistence: 'localStorage',
          capture_pageview: false, // We'll handle this manually
          loaded: (ph) => {
            // Register the version as a persistent property
            ph.register({
              version: this._assignment.version,
              sessionId: this._getSessionId()
            });
            this._debug && console.log('PostHog initialized');
          }
        });
        
        // Track initial page view
        this._sendToPostHog('pageview', {
          version: this._assignment.version
        });
      } catch (error) {
        this._debug && console.log(`Error initializing PostHog: ${error.message}`);
      }
    },
    
    /**
     * Send event to PostHog
     * @private
     * @param {string} eventName - Event name
     * @param {object} properties - Event properties
     */
    _sendToPostHog: function(eventName, properties = {}) {
      if (!this._config.posthogEnabled || !window.posthog) {
        return;
      }
      
      try {
        window.posthog.capture(eventName, {
          ...properties,
          version: this._assignment.version
        });
        this._debug && console.log(`Sent to PostHog: ${eventName}`);
      } catch (error) {
        this._debug && console.log(`Error sending to PostHog: ${error.message}`);
      }
    },
    
    /**
     * Get the current session ID
     * @private
     * @returns {string} The current session ID
     */
    _getSessionId: function() {
      const data = JSON.parse(sessionStorage.getItem(this._config.sessionStorageKey) || '{}');
      if (!data.sessionId) {
        data.sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem(this._config.sessionStorageKey, JSON.stringify(data));
      }
      return data.sessionId;
    },
    
    /**
     * Set up automatic evaluation of metrics
     * @private
     */
    _setupAutoEvaluation: function() {
      // Evaluate immediately
      this._evaluateMetrics();
      
      // Set up interval for periodic evaluation
      setInterval(() => {
        this._evaluateMetrics();
      }, this._config.evaluationInterval);
    },
    
    /**
     * Evaluate metrics and make rollback/rollforward decisions
     * @private
     */
    _evaluateMetrics: function() {
      const stableErrorRate = this._calculateErrorRate('stable');
      const canaryErrorRate = this._calculateErrorRate('canary');
      
      let recommendation = 'PROCEED';
      let details = '';
      
      // Not enough data
      if ((this._metrics.canary.pageviews || 0) < 5) {
        recommendation = 'INSUFFICIENT_DATA';
        details = 'Not enough canary traffic to make decision';
      }
      // Error rate significantly higher
      else if (canaryErrorRate > stableErrorRate * this._config.errorThreshold) {
        recommendation = 'ROLLBACK';
        details = `Canary error rate ${(canaryErrorRate * 100).toFixed(2)}% vs stable ${(stableErrorRate * 100).toFixed(2)}%`;
      }
      // Error rate moderately higher
      else if (canaryErrorRate > stableErrorRate * 1.2) {
        recommendation = 'SLOW_DOWN';
        details = `Canary error rate moderately higher: ${(canaryErrorRate * 100).toFixed(2)}% vs ${(stableErrorRate * 100).toFixed(2)}%`;
      }
      // All good
      else {
        recommendation = 'PROCEED';
        details = 'Metrics within acceptable ranges';
      }
      
      // Store evaluation results
      this._metrics.lastEvaluation = {
        timestamp: Date.now(),
        recommendation,
        details,
        stableErrorRate,
        canaryErrorRate,
        stablePageviews: this._metrics.stable.pageviews || 0,
        canaryPageviews: this._metrics.canary.pageviews || 0
      };
      
      // Apply recommendations automatically
      this._applyRecommendation(recommendation);
      
      // Save updated metrics
      this._saveMetrics();
    },
    
    /**
     * Apply a recommendation to change canary percentages
     * @private
     * @param {string} recommendation - Recommendation type (PROCEED, SLOW_DOWN, ROLLBACK)
     */
    _applyRecommendation: function(recommendation) {
      switch(recommendation) {
        case 'ROLLBACK':
          // Set all features to safety threshold
          for (const feature in this._features) {
            this._features[feature].currentPercentage = this._config.safetyThreshold;
          }
          break;
          
        case 'SLOW_DOWN':
          // Reduce all features by 25% but not below safety threshold
          for (const feature in this._features) {
            const currentPct = this._features[feature].currentPercentage;
            this._features[feature].currentPercentage = Math.max(
              this._config.safetyThreshold,
              currentPct * 0.75
            );
          }
          break;
          
        case 'PROCEED':
          // Gradually increase all features up to max
          for (const feature in this._features) {
            const currentPct = this._features[feature].currentPercentage;
            if (currentPct < this._config.maxCanaryPercentage) {
              this._features[feature].currentPercentage = Math.min(
                this._config.maxCanaryPercentage,
                currentPct * 1.1  // 10% increase
              );
            }
          }
          break;
      }
    },
    
    /**
     * Calculate error rate for a version
     * @private
     * @param {string} version - 'stable' or 'canary'
     * @returns {number} Error rate as a fraction (0 to 1)
     */
    _calculateErrorRate: function(version) {
      const pageviews = this._metrics[version].pageviews || 0;
      const errors = this._metrics[version].errors || 0;
      
      if (pageviews === 0) return 0;
      return errors / pageviews;
    }
  };
  
  // Initialize with defaults
  window.canary = canary.init();
  
})(window);
