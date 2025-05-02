/**
 * CanaryJS - One-Line Canary Deployment Solution (Combined Distribution)
 * This file contains both the core canary system and the version-switcher
 * for simplified deployment.
 * 
 * @version 1.0.0
 */

// Core canary implementation
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
    
    // Include the rest of the original canary.js implementation
  };

  // Expose the canary object globally
  window.canary = canary;
  
  // Auto-initialize if the DOM is already ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => canary.init(), 1);
  } else {
    document.addEventListener('DOMContentLoaded', () => canary.init());
  }
})(window);

// Version Switcher implementation
(function(window) {
  class VersionSwitcher {
    /**
     * Create a new Version Switcher instance
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
      this.config = {
        switcherContainerId: 'version-switcher',
        position: 'bottom-right',
        ...config
      };
      
      // Ensure the global canary object exists
      if (!window.canary) {
        console.error('Version Switcher requires the canary object to be available globally');
        return;
      }
      
      // Create the UI
      this._createSwitcher();
      
      // Add event listeners
      this._addEventListeners();
    }
    
    // Rest of the version-switcher.js implementation
  }

  // Make available globally
  window.VersionSwitcher = VersionSwitcher;
  
  // Auto-initialize if canary is already available
  if (window.canary) {
    document.addEventListener('DOMContentLoaded', () => new VersionSwitcher());
  }
})(window);