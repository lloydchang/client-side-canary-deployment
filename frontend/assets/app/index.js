/**
 * Client-Side Canary Deployment
 * Main entry point - exports all components
 */

// Use relative paths for imports
import './canary.js';
import './analytics.js';
import './variant-switcher.js';

// Re-export for module systems (if used with bundlers)
export default window.canary;
