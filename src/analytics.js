/**
 * CanaryJS - Analytics Integration
 * Provides PostHog integration for the canary deployment system
 */

(function(window) {
  // Make sure canary is available
  if (!window.canary) {
    console.error('Canary object not found. Include canary.js before analytics.js.');
    return;
  }
  
  // Override the PostHog initialization function
  window.canary._initPostHog = function(apiKey) {
    try {
      // Ensure we don't load PostHog more than once
      if (window.posthog) {
        window.canary._debug && console.log('PostHog already initialized');
        return;
      }
      
      // PostHog snippet (externalized from canary.js)
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document, window.posthog||[]);
      
      posthog.init(apiKey, {
        api_host: 'https://app.posthog.com',
        persistence: 'localStorage',
        capture_pageview: false, // We'll handle this manually
        loaded: (ph) => {
          // Register the version as a persistent property
          ph.register({
            version: window.canary._assignment.version,
            sessionId: window.canary._getSessionId()
          });
          window.canary._debug && console.log('PostHog initialized');
        }
      });
      
      // Track initial page view
      window.canary._sendToPostHog('pageview', {
        version: window.canary._assignment.version
      });
    } catch (error) {
      window.canary._debug && console.log(`Error initializing PostHog: ${error.message}`);
    }
  };
  
  // Override the PostHog send event function
  window.canary._sendToPostHog = function(eventName, properties = {}) {
    if (!window.canary._config.posthogEnabled || !window.posthog) {
      return;
    }
    
    try {
      window.posthog.capture(eventName, {
        ...properties,
        version: window.canary._assignment.version
      });
      window.canary._debug && console.log(`Sent to PostHog: ${eventName}`);
    } catch (error) {
      window.canary._debug && console.log(`Error sending to PostHog: ${error.message}`);
    }
  };
  
})(window);
