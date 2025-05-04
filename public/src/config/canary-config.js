/**
 * Canary configuration
 * Define feature flags and their default states
 */

const CanaryConfig = {
  // Feature flags for the application
  featureFlags: {
    newDesign: true,       // Enable new design for all canary users
    enhancedAnalytics: true, // Enable enhanced analytics for canary
    experimentalFeatures: false // Disable experimental features by default
  }
};

// Make available globally
window.CanaryConfig = CanaryConfig;
