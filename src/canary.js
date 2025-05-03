/**
 * Client-Side Canary Deployment
 * Core functionality for feature flagging and canary deployments
 */

(function(window) {
  'use strict';
  
  // Default configuration
  const DEFAULT_CONFIG = {
    initialCanaryPercentage: 5,      // Start with 5% of users
    maxCanaryPercentage: 50,         // Never exceed 50% without manual review
    safetyThreshold: 2,              // Minimum percentage on rollback
    gradualRollout: true,            // Automatically increase percentage
    rolloutPeriod: 7,                // Days to reach max percentage
    storageKey: 'canary_assignment', // localStorage key for assignment
    metricsStorageKey: 'canary_metrics', // localStorage key for metrics
    switcherContainerId: 'version-switcher',
    autoEvaluate: true,              // Auto-evaluate metrics periodically
    evaluationInterval: 3600000,     // Evaluate every hour (in milliseconds)
    errorThreshold: 1.5,             // Rollback if error rate 1.5x stable version
    posthogEnabled: true,            // PostHog disabled by default
    posthogApiKey: 'phc_dI0DmYHs1qJu7tZRfdaAxw7GqmvUMinb1VHnBnA9LlR'  // PostHog API key as a string
  };
  
  // Canary object
  const canary = {
    _config: { ...DEFAULT_CONFIG },
    _assignment: null,
    _features: {},
    _customAssignFn: null,
    _userIdentity: {},
    _eventHooks: {},
    _metrics: {
      'stable': { pageviews: 0, errors: 0, clicks: 0 },
      'canary': { pageviews: 0, errors: 0, clicks: 0 }
    },
    _debug: false,
    
    /**
     * Initialize the canary system
     * @param {Object} config - Configuration options
     */
    init: function(config = {}) {
      // Merge with defaults
      this._config = { ...this._config, ...config };
      
      // Load or create assignment
      this._loadAssignment();
      
      // Set up error tracking
      this._setupErrorTracking();
      
      // Start auto-evaluation if enabled
      if (this._config.autoEvaluate) {
        this._scheduleEvaluation();
      }
      
      // Load metrics
      this._loadMetrics();
      
      // Track initial page view
      this._trackPageview();
      
      return this;
    },
    
    /**
     * Configure the canary system
     * @param {Object} config - Configuration options
     */
    config: function(config = {}) {
      this._config = { ...this._config, ...config };
      return this;
    },
    
    /**
     * Define multiple features at once
     * @param {Object} features - Feature definitions
     */
    defineFeatures: function(features = {}) {
      for (const [name, options] of Object.entries(features)) {
        this.defineFeature(name, options);
      }
      return this;
    },
    
    /**
     * Define a single feature
     * @param {string} name - Feature name
     * @param {Object} options - Feature options
     */
    defineFeature: function(name, options = {}) {
      const defaultOptions = {
        description: '',
        initialPercentage: this._config.initialCanaryPercentage,
        evaluationCriteria: {
          errorThreshold: this._config.errorThreshold
        }
      };
      
      this._features[name] = { ...defaultOptions, ...options };
      
      // Update assignment feature flags if necessary
      if (this._assignment && this._assignment.features) {
        if (this._assignment.version === 'canary' && !(name in this._assignment.features)) {
          // For canary users, enable feature based on random percentage
          const shouldEnable = Math.random() * 100 < this._features[name].initialPercentage;
          this._assignment.features[name] = shouldEnable;
          this._saveAssignment();
        } else if (!(name in this._assignment.features)) {
          // For stable users, disable by default
          this._assignment.features[name] = false;
          this._saveAssignment();
        }
      }
      
      return this;
    },
    
    /**
     * Check if a feature is enabled for the current user
     * @param {string} featureName - Feature name to check
     * @returns {boolean} - Whether the feature is enabled
     */
    isEnabled: function(featureName) {
      // If no assignment yet, create one
      if (!this._assignment) {
        this._createAssignment();
      }
      
      // Feature doesn't exist, automatically define it
      if (!(featureName in this._features)) {
        this.defineFeature(featureName);
      }
      
      // Check if feature is enabled for this user
      return this._assignment.features[featureName] === true;
    },
    
    /**
     * Set custom assignment logic
     * @param {Function} assignFn - Custom assignment function
     */
    customAssignment: function(assignFn) {
      if (typeof assignFn !== 'function') {
        throw new Error('Custom assignment must be a function');
      }
      this._customAssignFn = assignFn;
      return this;
    },
    
    /**
     * Identify current user with properties
     * @param {Object} user - User properties
     */
    identifyUser: function(user = {}) {
      this._userIdentity = { ...this._userIdentity, ...user };
      
      // If we have a custom assignment function, reevaluate assignment
      if (this._customAssignFn && this._assignment) {
        const customAssignment = this._customAssignFn(this._userIdentity);
        if (customAssignment && (customAssignment === 'stable' || customAssignment === 'canary')) {
          // Only update if assignment changed
          if (this._assignment.version !== customAssignment) {
            this._assignment.version = customAssignment;
            this._saveAssignment();
          }
        }
      }
      
      return this;
    },
    
    /**
     * Configure analytics integration
     * @param {string} apiKey - PostHog API Key
     */
    analytics: function(apiKey) {
      this._config.posthogEnabled = true;
      this._config.posthogApiKey = apiKey;
      return this;
    },
    
    /**
     * Get results of canary testing
     * @returns {Object} - Results object
     */
    getResults: function() {
      return {
        currentAssignment: this._assignment,
        metrics: this._metrics,
        features: this._features,
        config: this._config
      };
    },
    
    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether debug mode is enabled
     */
    debug: function(enabled = true) {
      this._debug = enabled;
      return this;
    },
    
    /**
     * Get debug information
     * @returns {Object} - Debug information
     */
    debugInfo: function() {
      return {
        assignment: this._assignment,
        features: this._features,
        metrics: this._metrics,
        config: this._config,
        userIdentity: this._userIdentity
      };
    },
    
    /**
     * Export all data (useful for support)
     * @returns {Object} - All exported data
     */
    exportData: function() {
      return {
        assignment: this._assignment,
        features: this._features,
        metrics: this._metrics,
        config: this._config,
        userIdentity: this._userIdentity,
        localStorage: {
          assignment: localStorage.getItem(this._config.storageKey),
          metrics: localStorage.getItem(this._config.metricsStorageKey)
        }
      };
    },
    
    /**
     * Subscribe to canary events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on: function(event, callback) {
      if (!this._eventHooks[event]) {
        this._eventHooks[event] = [];
      }
      this._eventHooks[event].push(callback);
      return this;
    },
    
    /**
     * Track an event for analytics
     * @param {string} eventName - Name of the event
     * @param {Object} properties - Event properties
     */
    trackEvent: function(eventName, properties = {}) {
      // Add default properties
      const eventProperties = {
        timestamp: Date.now(),
        version: this._assignment ? this._assignment.version : 'unknown',
        ...properties
      };
      
      // Track clicks
      if (eventName.toLowerCase().includes('click')) {
        this._metrics[eventProperties.version].clicks = 
          (this._metrics[eventProperties.version].clicks || 0) + 1;
      }
      
      // Send to PostHog if enabled
      if (this._config.posthogEnabled && window.posthog) {
        try {
          window.posthog.capture(eventName, eventProperties);
        } catch (e) {
          console.error('Error sending event to PostHog:', e);
        }
      }
      
      // Save metrics
      this._saveMetrics();
      
      return this;
    },
    
    /**
     * Load assignment from localStorage
     * @private
     */
    _loadAssignment: function() {
      const saved = localStorage.getItem(this._config.storageKey);
      
      if (saved) {
        try {
          this._assignment = JSON.parse(saved);
          
          // Initialize features object if it doesn't exist
          if (!this._assignment.features) {
            this._assignment.features = {};
          }
        } catch (e) {
          console.error('Error loading assignment from localStorage:', e);
          this._createAssignment();
        }
      } else {
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
          
          // Initialize metrics objects if they don't exist
          if (!this._metrics.stable) {
            this._metrics.stable = { pageviews: 0, errors: 0, clicks: 0 };
          }
          if (!this._metrics.canary) {
            this._metrics.canary = { pageviews: 0, errors: 0, clicks: 0 };
          }
        } catch (e) {
          console.error('Error loading metrics from localStorage:', e);
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
     * Save assignment to localStorage
     * @private
     */
    _saveAssignment: function() {
      localStorage.setItem(this._config.storageKey, JSON.stringify(this._assignment));
    },
    
    /**
     * Calculate the current canary percentage based on rollout period
     * @private
     */
    _calculateCurrentPercentage: function() {
      if (!this._config.gradualRollout) {
        return this._config.initialCanaryPercentage;
      }
      
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      const daysSinceStart = Math.floor(now / dayInMs);
      const daysInPeriod = this._config.rolloutPeriod;
      
      // Calculate percentage based on days elapsed in rollout period
      let percentage = this._config.initialCanaryPercentage + 
        ((this._config.maxCanaryPercentage - this._config.initialCanaryPercentage) * 
         (daysSinceStart % daysInPeriod) / daysInPeriod);
      
      return Math.min(percentage, this._config.maxCanaryPercentage);
    },
    
    /**
     * Track a pageview for the current assignment
     * @private
     */
    _trackPageview: function() {
      if (this._assignment) {
        const version = this._assignment.version;
        this._metrics[version].pageviews = (this._metrics[version].pageviews || 0) + 1;
        this._saveMetrics();
        
        // Track via PostHog if enabled
        if (this._config.posthogEnabled && window.posthog) {
          try {
            window.posthog.capture('pageview', {
              version: version,
              timestamp: Date.now()
            });
          } catch (e) {
            console.error('Error sending pageview to PostHog:', e);
          }
        }
      }
    },
    
    /**
     * Set up error tracking
     * @private
     */
    _setupErrorTracking: function() {
      const self = this;
      
      // Capture unhandled errors
      window.addEventListener('error', function(event) {
        if (self._assignment) {
          const version = self._assignment.version;
          self._metrics[version].errors = (self._metrics[version].errors || 0) + 1;
          self._saveMetrics();
          
          // Evaluate metrics after error
          self._evaluateMetrics();
        }
      });
    },
    
    /**
     * Schedule periodic evaluation of metrics
     * @private
     */
    _scheduleEvaluation: function() {
      const self = this;
      
      setInterval(function() {
        self._evaluateMetrics();
      }, this._config.evaluationInterval);
    },
    
    /**
     * Evaluate metrics and make decisions
     * @private
     */
    _evaluateMetrics: function() {
      if (!this._metrics.stable || !this._metrics.canary) {
        return;
      }
      
      const stableErrors = this._metrics.stable.errors || 0;
      const canaryErrors = this._metrics.canary.errors || 0;
      const stableViews = this._metrics.stable.pageviews || 1;
      const canaryViews = this._metrics.canary.pageviews || 1;
      
      // Calculate error rates
      const stableErrorRate = stableViews > 0 ? stableErrors / stableViews : 0;
      const canaryErrorRate = canaryViews > 0 ? canaryErrors / canaryViews : 0;
      
      // If canary error rate is significantly higher, consider rollback
      if (canaryErrorRate > 0 && stableErrorRate > 0 && canaryErrorRate > (stableErrorRate * this._config.errorThreshold)) {
        // Rollback - decrease canary percentage
        this._config.initialCanaryPercentage = Math.max(
          this._config.safetyThreshold, 
          this._config.initialCanaryPercentage / 2
        );
        
        // Trigger rollback event
        this._triggerEvent('rollback', {
          stableErrorRate,
          canaryErrorRate,
          newPercentage: this._config.initialCanaryPercentage
        });
      } else if (canaryErrorRate <= stableErrorRate && this._config.gradualRollout) {
        // Success - slightly increase canary percentage if under max
        if (this._config.initialCanaryPercentage < this._config.maxCanaryPercentage) {
          this._config.initialCanaryPercentage = Math.min(
            this._config.maxCanaryPercentage,
            this._config.initialCanaryPercentage * 1.05
          );
          
          // Trigger increase event
          this._triggerEvent('percentageIncrease', {
            newPercentage: this._config.initialCanaryPercentage
          });
        }
      }
      
      // Trigger evaluation event
      this._triggerEvent('evaluationComplete', {
        stableErrorRate,
        canaryErrorRate,
        recommendation: canaryErrorRate > (stableErrorRate * this._config.errorThreshold) ? 'ROLLBACK' : 'CONTINUE'
      });
    },
    
    /**
     * Trigger an event and call all registered callbacks
     * @private
     */
    _triggerEvent: function(event, data) {
      if (this._eventHooks[event]) {
        for (const callback of this._eventHooks[event]) {
          try {
            callback(data);
          } catch (e) {
            console.error(`Error in ${event} event handler:`, e);
          }
        }
      }
    }
  };
  
  // Make available globally
  window.canary = canary;
})(window);
