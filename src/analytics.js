/**
 * Analytics Integration for Client-Side Canary Deployment
 * 
 * Integrates with PostHog for event tracking and analytics
 */

(function(window) {
  'use strict';
  
  // Only proceed if canary is available
  if (!window.canary) {
    console.error('Analytics module requires canary.js to be loaded first');
    return;
  }
  
  // Set up PostHog integration
  const initPostHog = function(apiKey) {
    if (!apiKey) {
      console.error('PostHog API key is required');
      return;
    }
    
    // Load PostHog script
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    
    // Initialize PostHog
    window.posthog.init(apiKey, {
      api_host: 'https://app.posthog.com',
      capture_pageview: false, // We'll handle pageviews manually
      persistence: 'localStorage'
    });
    
    // Identify user with canary assignment
    if (window.canary._assignment) {
      window.posthog.identify(window.canary._assignment.id || 'anonymous', {
        canaryVersion: window.canary._assignment.version,
        assignedAt: window.canary._assignment.assignedAt
      });
    }
    
    console.log('PostHog analytics initialized');
  };
  
  // Enhance the canary trackEvent method
  const originalTrackEvent = window.canary.trackEvent;
  window.canary.trackEvent = function(eventName, properties = {}) {
    // Call original method
    originalTrackEvent.call(this, eventName, properties);
    
    return this;
  };
  
  // Add direct PostHog integration
  window.canary.analytics = function(apiKey) {
    this._config.posthogEnabled = true;
    this._config.posthogApiKey = apiKey;
    
    // Initialize PostHog
    initPostHog(apiKey);
    
    return this;
  };
  
  // If PostHog is already configured, initialize it
  if (window.canary._config.posthogEnabled && window.canary._config.posthogApiKey) {
    initPostHog(window.canary._config.posthogApiKey);
  }
})(window);
