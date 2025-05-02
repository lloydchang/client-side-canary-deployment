/**
 * CanaryAnalytics - Analytics wrapper for Canary JS
 * 
 * This file acts as a compatibility layer for legacy code that might
 * directly use the CanaryAnalytics class. It delegates all functionality
 * to the main canary implementation in src/canary.js.
 */

class CanaryAnalytics {
    constructor(config = {}) {
        console.warn('CanaryAnalytics is deprecated. Please use the analytics methods in CanaryJS directly.');
        
        // Initialize the main canary if it's not already initialized
        if (window.canary && !window.canary._initialized) {
            window.canary.init({
                posthogEnabled: config.posthogEnabled,
                posthogApiKey: config.posthogApiKey
            });
        }
        
        this.config = config;
    }

    /**
     * Track a custom event
     * @param {string} eventName - Name of the event
     * @param {object} data - Additional event data
     */
    trackEvent(eventName, data = {}) {
        if (window.canary) {
            window.canary.trackEvent(eventName, data);
        }
    }

    /**
     * Track an error
     * @param {string} errorMessage - Error message
     * @param {string} errorStack - Error stack trace
     */
    trackError(errorMessage, errorStack = '') {
        if (window.canary) {
            window.canary.trackError(errorMessage, errorStack);
        }
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     */
    logDebug(message) {
        if (window.canary && window.canary._debug) {
            console.log(`[CanaryAnalytics] ${message}`);
        }
    }
}

// Make available globally
window.CanaryAnalytics = CanaryAnalytics;