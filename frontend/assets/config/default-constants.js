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

/**
 * Unified configuration loader
 * Consolidates configuration from multiple sources with proper precedence:
 * 1. URL parameters (highest priority)
 * 2. localStorage saved preferences
 * 3. canary-config.json (loaded via fetch for browser)
 * 4. default constants (lowest priority)
 */
if (typeof window !== 'undefined') {
  // Create a configuration manager
  const ConfigManager = {
    _config: { ...DEFAULT_CONSTANTS },
    _configLoaded: false,
    _callbacks: [],
    
    // Get a configuration value with fallbacks
    get: function(key, fallback) {
      return this._config[key] !== undefined ? this._config[key] : fallback;
    },
    
    // Get all configuration
    getAll: function() {
      return { ...this._config };
    },
    
    // Load JSON configuration asynchronously
    loadConfig: async function(configPath) {
      try {
        // Determine the most likely config path based on current URL
        let effectivePath;
        
        if (configPath) {
          // Use explicitly provided path if available
          effectivePath = configPath;
        } else {
          const path = window.location.pathname;
          
          // Special handling for GitHub Pages deployment pattern
          if (path.includes('/client-side-canary-deployment/')) {
            // If we're at the root level of the app (landing page)
            if (path.endsWith('/frontend/') || path.endsWith('/frontend')) {
              effectivePath = 'assets/config/canary-config.json'; // Fixed path - removed duplicate 'frontend/'
            }
            // If we're in a subdirectory (stable or canary)
            else {
              effectivePath = '../assets/config/canary-config.json';
            }
          } 
          // Local development or other hosting
          else {
            effectivePath = '../assets/config/canary-config.json';
          }
        }
        
        console.log('[ConfigManager] Loading config from:', effectivePath);
        
        // Fetch with cache busting
        const response = await fetch(effectivePath + '?nocache=' + Date.now());
        if (response.ok) {
          const jsonConfig = await response.json();
          
          // Extract key values from JSON structure and add them to our config
          if (jsonConfig.distribution && typeof jsonConfig.distribution.canaryPercentage !== 'undefined') {
            this._config.CANARY_PERCENTAGE = jsonConfig.distribution.canaryPercentage;
          }
          
          // Store the full JSON config too
          this._config.fullConfig = jsonConfig;
        }
      } catch (err) {
        console.warn('[ConfigManager] Could not load canary configuration, using defaults:', err);
      }
      
      this._configLoaded = true;
      // Notify subscribers that config is ready
      this._callbacks.forEach(cb => cb(this._config));
      return this._config;
    },
    
    // Register a callback when config is loaded
    onConfigReady: function(callback) {
      if (this._configLoaded) {
        callback(this._config);
      } else {
        this._callbacks.push(callback);
      }
    }
  };
  
  // Start loading config automatically
  ConfigManager.loadConfig();
  
  // Expose the configuration manager globally
  window.CanaryConfigManager = ConfigManager;
}

// Make it available as a module export for Node.js and as a global for the browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_CONSTANTS;
} else if (typeof window !== 'undefined') {
  window.DEFAULT_CONSTANTS = DEFAULT_CONSTANTS;
}
