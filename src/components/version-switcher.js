/**
 * Version Switcher Module
 * 
 * Allows users to manually switch between stable and canary versions
 * and coordinates directly with the main canary object
 */

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

    // ...existing code...
}

// Make available globally
window.VersionSwitcher = VersionSwitcher;