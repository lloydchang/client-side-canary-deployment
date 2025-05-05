/**
 * Canary configuration
 * Auto-generated from canary-analyzer.js
 */

const CanaryConfig = {
  // Feature flags for the application
  featureFlags: {
  "newDesign": true,
  "betaFeatures": false,
  "performanceOptimizations": true
},
  // Canary distribution percentage
  distribution: {
    canaryPercentage: 30,
    maxPercentage: 50
  }
};

// Make available globally
window.CanaryConfig = CanaryConfig;
