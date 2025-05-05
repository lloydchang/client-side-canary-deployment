/**
 * Default constants for canary configuration
 * This file serves as the single source of truth for default values
 * Used by both client-side code and GitHub Actions scripts
 */

// Determine environment
const ENV = typeof process !== 'undefined' && process.env && process.env.NODE_ENV
  ? process.env.NODE_ENV
  : (typeof window !== 'undefined' && window.ENV) || 'production';

// Environment-specific defaults
const DEFAULTS = {
  development: {
    CANARY_PERCENTAGE: 25, // Higher percentage in development for more testing
    MAX_PERCENTAGE: 75,
    SAFETY_THRESHOLD: 5
  },
  staging: {
    CANARY_PERCENTAGE: 10,
    MAX_PERCENTAGE: 50,
    SAFETY_THRESHOLD: 5
  },
  production: {
    CANARY_PERCENTAGE: 5, // Conservative default for production
    MAX_PERCENTAGE: 50,
    SAFETY_THRESHOLD: 2
  }
};

// Select the appropriate environment defaults or fall back to production
const CURRENT_DEFAULTS = DEFAULTS[ENV] || DEFAULTS.production;

// Allow override via query parameter or local storage in browser environments
if (typeof window !== 'undefined') {
  // Check for URL parameter override
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('defaultCanaryPercentage')) {
    const urlValue = parseInt(urlParams.get('defaultCanaryPercentage'), 10);
    if (!isNaN(urlValue) && urlValue >= 0 && urlValue <= 100) {
      CURRENT_DEFAULTS.CANARY_PERCENTAGE = urlValue;
      // Store this preference in localStorage
      try {
        localStorage.setItem('canary_default_percentage', urlValue);
      } catch (e) {
        console.warn('Unable to store canary preference in localStorage');
      }
    }
  }
  
  // Check for localStorage override
  try {
    const storedValue = localStorage.getItem('canary_default_percentage');
    if (storedValue !== null) {
      const parsedValue = parseInt(storedValue, 10);
      if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 100) {
        CURRENT_DEFAULTS.CANARY_PERCENTAGE = parsedValue;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Export the constants
const DEFAULT_CONSTANTS = {
  CANARY_PERCENTAGE: CURRENT_DEFAULTS.CANARY_PERCENTAGE,
  MAX_PERCENTAGE: CURRENT_DEFAULTS.MAX_PERCENTAGE,
  SAFETY_THRESHOLD: CURRENT_DEFAULTS.SAFETY_THRESHOLD,
  
  // Allow checking the environment
  ENV
};

// Make it available as a module export for Node.js and as a global for the browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_CONSTANTS;
} else if (typeof window !== 'undefined') {
  window.DEFAULT_CONSTANTS = DEFAULT_CONSTANTS;
}
