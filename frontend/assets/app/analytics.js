/**
 * Analytics Integration for Client-Side Canary Deployment
 * 
 * Integrates with PostHog for event tracking and analytics
 */

(function(window) {
  'use strict';
  
  // Create a centralized analytics object
  const canaryAnalytics = {
    _initialized: false,
    _config: null,
    
    /**
     * Initialize PostHog with config from canary
     * @param {Object} config - Configuration from canary
     */
    initialize: function(config) {
      if (this._initialized) {
        console.log('Analytics already initialized');
        return;
      }
      
      this._config = config;
      
      if (!config.posthogEnabled) {
        console.log('PostHog analytics disabled in config');
        return;
      }
      
      if (!config.posthogApiKey) {
        console.error('PostHog API key is required');
        return;
      }
      
      try {
        // Load PostHog script - use PostHog's auto-loading snippet but only if not already loaded
        if (!window.posthog) {
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){
            // ...existing code...
          });
        }
        
        // Initialize PostHog with auto-capture enabled
        window.posthog.init(config.posthogApiKey, {
          api_host: config.posthogHost || 'https://us.i.posthog.com',
          capture_pageview: true, // Enable automatic pageview tracking
          autocapture: true,      // Enable automatic event capturing
          persistence: 'localStorage'
        });
        
        this._initialized = true;
        console.log('PostHog analytics initialized with automatic tracking');
      } catch (e) {
        console.error('Error initializing PostHog:', e);
      }
    },
    
    /**
     * Identify user with canary assignment
     * @param {Object} assignment - Canary assignment
     */
    identifyUser: function(assignment) {
      if (!this._initialized || !window.posthog) return;
      
      try {
        window.posthog.identify(assignment.id || 'anonymous', {
          canaryVersion: assignment.version,
          assignedAt: assignment.assignedAt
        });
      } catch (e) {
        console.error('Error identifying user in PostHog:', e);
      }
    },
    
    /**
     * Track an event
     * @param {string} eventName - Name of the event
     * @param {Object} properties - Event properties
     */
    trackEvent: function(eventName, properties = {}) {
      if (!this._initialized || !window.posthog) return;
      
      try {
        window.posthog.capture(eventName, properties);
      } catch (e) {
        console.error('Error tracking event in PostHog:', e);
      }
    },
    
    /**
     * Track a pageview
     * @param {string} version - Version (stable/canary)
     */
    trackPageview: function(version) {
      if (!this._initialized || !window.posthog) return;
      
      try {
        window.posthog.capture('pageview', {
          version: version,
          timestamp: Date.now(),
          url: window.location.href,
          path: window.location.pathname
        });
      } catch (e) {
        console.error('Error tracking pageview in PostHog:', e);
      }
    }
  };
  
  // Make analytics available globally for canary.js to use
  window.canaryAnalytics = canaryAnalytics;
  
  // Auto-initialize if canary is already loaded with PostHog configuration
  if (window.canary && window.canary._config) {
    const config = window.canary._config;
    
    if (config.posthogEnabled && config.posthogApiKey) {
      canaryAnalytics.initialize(config);
    }
  }
})(window);