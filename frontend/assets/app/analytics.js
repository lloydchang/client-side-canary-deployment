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
        // Check if PostHog is already loaded by the HTML page
        if (!window.posthog) {
          console.log('Loading PostHog script from analytics.js');
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init bs ws ge fs capture De Ai $s register register_once register_for_session unregister unregister_for_session Is getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty xs Ss createPersonProfile Es gs opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing ys debug ks getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
        } else {
          console.log('PostHog already loaded, skipping script injection');
        }
        
        // Only initialize if not already initialized
        if (!window.posthog.__loaded) {
          window.posthog.init(config.posthogApiKey, {
            api_host: config.posthogHost || 'https://us.i.posthog.com',
            capture_pageview: true,
            autocapture: true,
            persistence: 'localStorage'
          });
          console.log('PostHog initialized by analytics module');
        } else {
          console.log('PostHog already initialized, skipping initialization');
        }
        
        this._initialized = true;
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
  
  // Make analytics available globally
  window.canaryAnalytics = canaryAnalytics;
  
  // Auto-initialize if canary config is available
  if (window.canary && window.canary._config) {
    const config = window.canary._config;
    
    if (config.posthogEnabled && config.posthogApiKey) {
      canaryAnalytics.initialize(config);
    }
  }
})(window);