/**
 * Client-Side Canary Deployment
 * Core functionality for canary deployments
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
  
  // Default configuration - removed deprecated options
  const DEFAULT_CONFIG = {
    initialCanaryPercentage: getDefaultValue('CANARY_PERCENTAGE', 5),  // From constants or fallback to 5%
    maxCanaryPercentage: getDefaultValue('MAX_PERCENTAGE', 50),        // From constants or fallback to 50%
    safetyThreshold: getDefaultValue('SAFETY_THRESHOLD', 2),           // From constants or fallback to 2%
    gradualRollout: true,            // Automatically increase percentage
    rolloutPeriod: 7,                // Days to reach max percentage
    storageKey: 'canary_assignment', // localStorage key for assignment
    switcherContainerId: 'version-switcher',
    errorThreshold: 1.5,             // For historical data only - server now handles evaluation
    posthogEnabled: true,            // PostHog enabled by default
    posthogApiKey: 'phc_dI0DmYHs1qJu7tZRfdaAxw7GqmvUMinb1VHnBnA9LlR',
    posthogHost: 'https://us.i.posthog.com' // Default PostHog host
  };
  
  // Canary object
  const canary = {
    _config: { ...DEFAULT_CONFIG },
    _assignment: null,
    _customAssignFn: null,
    _userIdentity: {},
    _eventHooks: {},
    _debug: false,
    _analyticsInitialized: false,
    _posthogBlocked: false,
    _posthogErrorCount: 0,
    
    /**
     * Initialize the canary system
     * @param {Object} config - Configuration options
     */
    init: function(config = {}) {
      // Merge with defaults
      this._config = { ...this._config, ...config };
      
      // Load or create assignment
      this._loadAssignment();
      
      // Initialize analytics via the dedicated analytics module
      this._initAnalytics();
      
      // Set up error tracking
      this._setupErrorTracking();
      
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
     * Initialize analytics integration
     * @private
     */
    _initAnalytics: function() {
      // Only initialize if analytics module exists and PostHog is enabled
      if (this._config.posthogEnabled && window.canaryAnalytics && 
          typeof window.canaryAnalytics.initialize === 'function') {
        try {
          window.canaryAnalytics.initialize(this._config);
          this._analyticsInitialized = true;
          
          // If we have canary assignment, identify the user
          if (this._assignment) {
            window.canaryAnalytics.identifyUser(this._assignment);
          }
          
          if (this._debug) console.log('Analytics initialized successfully');
        } catch (e) {
          console.error('Error initializing analytics:', e);
          this._posthogBlocked = true;
        }
      }
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
        config: this._config,
        userIdentity: this._userIdentity,
        localStorage: {
          assignment: localStorage.getItem(this._config.storageKey)
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
      
      // Send to analytics system if available and not blocked
      if (!this._posthogBlocked) {
        // Use analytics module if available
        if (window.canaryAnalytics && typeof window.canaryAnalytics.trackEvent === 'function') {
          window.canaryAnalytics.trackEvent(eventName, eventProperties);
        }
        // Fallback to direct PostHog usage
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
          
          // Initialize empty assignment if needed
          if (!this._assignment.version) {
            this._createAssignment();
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
        percentage: currentPercentage
      };
      
      // Save assignment to localStorage
      this._saveAssignment();
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
      
      // Capture unhandled errors and send them directly to PostHog
      window.addEventListener('error', function(event) {
        if (self._assignment && !self._posthogBlocked) {
          const version = self._assignment.version;
          
          // Send error to PostHog directly
          if (window.canaryAnalytics && typeof window.canaryAnalytics.trackEvent === 'function') {
            window.canaryAnalytics.trackEvent('error', {
              version: version,
              message: event.message || 'Unknown error',
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
              stack: event.error ? event.error.stack : null
            });
          }
          // Fallback to direct PostHog usage
          else if (self._config.posthogEnabled && window.posthog) {
            try {
              window.posthog.capture('error', {
                version: version,
                message: event.message || 'Unknown error',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error ? event.error.stack : null
              });
            } catch (e) {
              if (self._debug) console.error('Error sending error to PostHog:', e);
            }
          }
        }
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