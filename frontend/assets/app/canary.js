/**
 * Client-Side Canary Deployment
 * Core functionality for feature flagging and canary deployments
 */

(function(window) {
  'use strict';
  
  // Get default values from the constants file if available
  const getDefaultValue = (key, fallback) => {
    if (window.DEFAULT_CONSTANTS && typeof window.DEFAULT_CONSTANTS[key] !== 'undefined') {
      return window.DEFAULT_CONSTANTS[key];
    }
    return fallback;
  };
  
  // Default configuration
  const DEFAULT_CONFIG = {
    initialCanaryPercentage: getDefaultValue('CANARY_PERCENTAGE', 5),  // From constants or fallback to 5%
    maxCanaryPercentage: getDefaultValue('MAX_PERCENTAGE', 50),        // From constants or fallback to 50%
    safetyThreshold: getDefaultValue('SAFETY_THRESHOLD', 2),           // From constants or fallback to 2%
    gradualRollout: true,            // Automatically increase percentage
    rolloutPeriod: 7,                // Days to reach max percentage
    storageKey: 'canary_assignment', // localStorage key for assignment
    metricsStorageKey: 'canary_metrics', // localStorage key for metrics
    switcherContainerId: 'version-switcher',
    autoEvaluate: true,              // Auto-evaluate metrics periodically
    evaluationInterval: 3600000,     // Evaluate every hour (in milliseconds)
    errorThreshold: 1.5,             // Rollback if error rate 1.5x stable version
    posthogEnabled: true,           // PostHog enabled by default
    posthogApiKey: 'phc_dI0DmYHs1qJu7tZRfdaAxw7GqmvUMinb1VHnBnA9LlR',               // PostHog API key should be provided during initialization
    posthogHost: 'https://us.i.posthog.com' // Default PostHog host
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
    _analyticsInitialized: false,
    
    /**
     * Initialize the canary system
     * @param {Object} config - Configuration options
     */
    init: function(config = {}) {
      // Merge with defaults
      this._config = { ...this._config, ...config };
      
      // Load or create assignment
      this._loadAssignment();
      
      // Initialize PostHog
      this._initPostHog();
      
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
        },
        usePostHogFlag: true // Whether to use PostHog feature flag if available
      };
      
      this._features[name] = { ...defaultOptions, ...options };
      
      // Update assignment feature flags if necessary
      if (this._assignment && this._assignment.features) {
        if (this._assignment.version === 'canary' && !(name in this._assignment.features)) {
          // For canary users, check PostHog first if enabled
          if (this._config.posthogEnabled && window.posthog && !window.posthog.__blocked && this._features[name].usePostHogFlag) {
            try {
              // Try to get flag value from PostHog
              const posthogFlag = window.posthog.isFeatureEnabled(name);
              if (posthogFlag !== null && posthogFlag !== undefined) {
                this._assignment.features[name] = posthogFlag;
                this._saveAssignment();
                
                // Only track if PostHog is actually working
                if (!this._posthogBlocked && window.posthog.capture) {
                  try {
                    window.posthog.capture('feature_flag_evaluated', {
                      feature: name,
                      enabled: posthogFlag,
                      source: 'posthog',
                      version: this._assignment.version
                    });
                  } catch (e) {
                    if (this._debug) console.warn('Error tracking feature flag evaluation:', e);
                  }
                }
                
                return this;
              }
            } catch (e) {
              console.warn(`Error checking PostHog feature flag ${name}:`, e);
            }
          }
          
          // Fall back to random percentage if PostHog flag not available
          const shouldEnable = Math.random() * 100 < this._features[name].initialPercentage;
          this._assignment.features[name] = shouldEnable;
          this._saveAssignment();
        } else if (!(name in this._assignment.features)) {
          // For stable users, check PostHog first if enabled
          if (this._config.posthogEnabled && window.posthog && this._features[name].usePostHogFlag) {
            try {
              // Try to get flag value from PostHog
              const posthogFlag = window.posthog.isFeatureEnabled(name);
              if (posthogFlag !== null && posthogFlag !== undefined) {
                this._assignment.features[name] = posthogFlag;
                this._saveAssignment();
                
                // Track feature flag evaluation
                window.posthog.capture('feature_flag_evaluated', {
                  feature: name,
                  enabled: posthogFlag,
                  source: 'posthog',
                  version: this._assignment.version
                });
                
                return this;
              }
            } catch (e) {
              console.warn(`Error checking PostHog feature flag ${name}:`, e);
            }
          }
          
          // Default to disabled for stable users if PostHog flag not available
          this._assignment.features[name] = false;
          this._saveAssignment();
        }
      }
      
      return this;
    },
    
    /**
     * Reload feature flags from PostHog
     * @returns {Promise} Promise resolving when flags have been reloaded
     */
    reloadFeatureFlags: function() {
      if (!this._config.posthogEnabled || !window.posthog) {
        return Promise.resolve(false);
      }
      
      return new Promise((resolve, reject) => {
        try {
          // Reload PostHog feature flags
          window.posthog.reloadFeatureFlags();
          
          // Wait for flags to reload (PostHog doesn't provide a callback for this)
          setTimeout(() => {
            // Update all features
            for (const [name, options] of Object.entries(this._features)) {
              if (options.usePostHogFlag) {
                try {
                  const posthogFlag = window.posthog.isFeatureEnabled(name);
                  if (posthogFlag !== null && posthogFlag !== undefined) {
                    // Only update if the value has changed
                    if (this._assignment.features[name] !== posthogFlag) {
                      this._assignment.features[name] = posthogFlag;
                      
                      // Track feature flag change
                      window.posthog.capture('feature_flag_changed', {
                        feature: name,
                        enabled: posthogFlag,
                        source: 'posthog_reload',
                        version: this._assignment ? this._assignment.version : 'unknown'
                      });
                    }
                  }
                } catch (e) {
                  console.warn(`Error reloading PostHog feature flag ${name}:`, e);
                }
              }
            }
            
            // Save updated assignment
            if (this._assignment) {
              this._saveAssignment();
            }
            
            resolve(true);
          }, 500);
        } catch (e) {
          console.error('Error reloading PostHog feature flags:', e);
          reject(e);
        }
      });
    },
    
    /**
     * Initialize PostHog integration
     * @private
     */
    _initPostHog: function() {
      if (this._config.posthogEnabled && this._config.posthogApiKey) {
        try {
          // Set a flag to detect if loading fails
          this._posthogAttempted = true;
          this._posthogLoaded = false;
          
          // Create a timeout to check if PostHog loaded successfully
          const posthogLoadTimeout = setTimeout(() => {
            if (!window.posthog || !window.posthog.__loaded) {
              if (this._debug) console.log('PostHog failed to load - possibly blocked by browser extension');
              this._posthogBlocked = true;
              
              // Setup minimal mock for required functions to avoid errors
              if (!window.posthog) {
                window.posthog = {
                  capture: () => {},
                  identify: () => {},
                  isFeatureEnabled: () => null,
                  reloadFeatureFlags: () => {},
                  onFeatureFlags: () => {},
                  __blocked: true
                };
              }
              
              // Trigger event to notify about blocked analytics
              this._triggerEvent('analyticsBlocked', {
                reason: 'client_blocker',
                timestamp: Date.now()
              });
            }
          }, 2000);
          
          if (!window.posthog) {
            // Initialize PostHog using the HTML snippet approach
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init bs ws ge fs capture De Ai $s register register_once register_for_session unregister unregister_for_session Is getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty xs Ss createPersonProfile Es gs opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing ys debug ks getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          }
          
          // Initialize PostHog if not already initialized
          if (window.posthog && !window.posthog.__loaded) {
            window.posthog.init(this._config.posthogApiKey, {
              api_host: this._config.posthogHost || 'https://us.i.posthog.com',
              person_profiles: 'always',
              capture_pageview: true,
              persistence: 'localStorage',
              loaded: (posthog) => {
                // Clear the timeout when PostHog loads successfully
                clearTimeout(posthogLoadTimeout);
                this._posthogLoaded = true;
                if (this._debug) console.log('PostHog loaded successfully');
              }
            });
            
            // Set up feature flag listeners
            window.posthog.onFeatureFlags(() => {
              if (this._debug) console.log('PostHog feature flags loaded');
              
              // If we have an assignment and features, update them
              if (this._assignment && this._features) {
                for (const [name, options] of Object.entries(this._features)) {
                  if (options.usePostHogFlag) {
                    try {
                      const posthogFlag = window.posthog.isFeatureEnabled(name);
                      if (posthogFlag !== null && posthogFlag !== undefined) {
                        this._assignment.features[name] = posthogFlag;
                      }
                    } catch (e) {
                      if (this._debug) console.warn(`Error checking PostHog feature flag ${name}:`, e);
                    }
                  }
                }
                
                this._saveAssignment();
              }
            });
            
            // Identify user if we have an assignment
            if (this._assignment) {
              window.posthog.identify(
                this._assignment.userId || 'user_' + this._assignment.assignedAt,
                {
                  canary_version: this._assignment.version,
                  assigned_at: this._assignment.assignedAt,
                  percentage: this._assignment.percentage
                }
              );
            }
          }
        } catch (e) {
          console.error('Error initializing PostHog:', e);
          this._posthogBlocked = true;
        }
      }
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
     * @param {Object} options - Additional PostHog options
     */
    analytics: function(apiKey, options = {}) {
      if (!apiKey) {
        console.error('PostHog API key is required');
        return this;
      }
      
      this._config.posthogEnabled = true;
      this._config.posthogApiKey = apiKey;
      
      // Extend config with any additional options
      if (options.host) {
        this._config.posthogHost = options.host;
      }
      
      // Initialize analytics if the analytics.js is already loaded
      if (window.canaryAnalytics && typeof window.canaryAnalytics.initialize === 'function') {
        window.canaryAnalytics.initialize(this._config);
        this._analyticsInitialized = true;
      }
      
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
        if (this._metrics[eventProperties.version]) {
          this._metrics[eventProperties.version].clicks = 
            (this._metrics[eventProperties.version].clicks || 0) + 1;
        }
      }
      
      // Always track locally regardless of remote analytics status
      if (!this._metrics.events) {
        this._metrics.events = [];
      }
      this._metrics.events.push({
        name: eventName,
        properties: eventProperties,
        time: Date.now()
      });
      
      // Keep events array from growing too large
      if (this._metrics.events.length > 100) {
        this._metrics.events = this._metrics.events.slice(-100);
      }
      
      // Try remote tracking only if PostHog isn't known to be blocked
      if (!this._posthogBlocked) {
        // Send to analytics system if available
        if (window.canaryAnalytics && typeof window.canaryAnalytics.trackEvent === 'function') {
          window.canaryAnalytics.trackEvent(eventName, eventProperties);
        }
        // Fallback to direct PostHog usage if analytics module not properly initialized
        else if (this._config.posthogEnabled && window.posthog) {
          try {
            window.posthog.capture(eventName, eventProperties);
          } catch (e) {
            // Mark PostHog as blocked if we get consistent failures
            if (!this._posthogErrorCount) this._posthogErrorCount = 0;
            this._posthogErrorCount++;
            
            if (this._posthogErrorCount > 3) {
              this._posthogBlocked = true;
              if (this._debug) console.log('PostHog appears to be blocked or unavailable - disabling remote analytics');
            }
            
            if (this._debug) {
              console.error('Error sending event to PostHog:', e);
            }
          }
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
        
        // Only attempt remote tracking if PostHog isn't blocked
        if (!this._posthogBlocked) {
          // Use analytics system if available
          if (window.canaryAnalytics && typeof window.canaryAnalytics.trackPageview === 'function') {
            window.canaryAnalytics.trackPageview(version);
          }
          // Fallback to direct PostHog usage
          else if (this._config.posthogEnabled && window.posthog) {
            try {
              window.posthog.capture('pageview', {
                version: version,
                timestamp: Date.now()
              });
            } catch (e) {
              if (this._debug) console.error('Error sending pageview to PostHog:', e);
              
              // Increment error count
              if (!this._posthogErrorCount) this._posthogErrorCount = 0;
              this._posthogErrorCount++;
              
              // If we get multiple errors, assume PostHog is blocked
              if (this._posthogErrorCount > 2) {
                this._posthogBlocked = true;
              }
            }
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