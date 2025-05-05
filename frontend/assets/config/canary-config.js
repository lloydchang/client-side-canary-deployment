/**
 * Canary configuration
 * Auto-generated from canary-analyzer.js
 */

const CanaryConfig = {
  distribution: {
    canaryPercentage: 0,  // Current percentage is 0%
    maxPercentage: 50
  },
  configVersion: Date.now() // Add a timestamp for tracking config freshness
};

// Make available globally
window.CanaryConfig = CanaryConfig;

// Log when config is loaded to help with debugging
console.log('CanaryConfig loaded with distribution:', CanaryConfig.distribution);
