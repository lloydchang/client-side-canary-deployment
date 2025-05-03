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
    
    // Create a safer load method for PostHog that doesn't rely on a variable name
    try {
      // Load PostHog script
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init bs ws ge fs capture De Ai $s register register_once register_for_session unregister unregister_for_session Is getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty xs Ss createPersonProfile Es gs opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing ys debug ks getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      
      // Initialize PostHog
      window.posthog.init(apiKey, {
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'always',
        capture_pageview: true,
        persistence: 'localStorage'
      });
      
      console.log('PostHog analytics initialized');
    } catch (e) {
      console.error('Error initializing PostHog:', e);
    }
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
    try {
      initPostHog(window.canary._config.posthogApiKey);
    } catch (e) {
      console.error('Error during PostHog initialization:', e);
    }
  }
})(window);
