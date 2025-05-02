/**
 * Client-Side Canary Deployment
 * Main entry point - exports all components
 */

// Import core components
import './canary.js';
import './components/version-switcher.js';

// Re-export for module systems (if used with bundlers)
export default window.canary;
