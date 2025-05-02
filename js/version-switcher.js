/**
 * Version Switcher Module
 * 
 * Allows users to manually switch between stable and canary versions
 * while maintaining analytics data integrity and reporting to PostHog
 */

class VersionSwitcher {
    constructor(config = {}) {
        this.config = {
            stableVersion: 'stable',
            canaryVersion: 'canary',
            switcherContainerId: 'version-switcher',
            storageKey: 'version',
            posthogEnabled: true, // Whether to track version switching in PostHog
            onVersionSwitch: null, // Optional callback when version is switched
            ...config
        };

        // Try to get CanaryConfig if available
        if (window.CanaryConfig) {
            this.canaryConfig = window.CanaryConfig;
        }

        this.currentVersion = this._getCurrentVersion();
        this._createSwitcher();
        
        // Log version switch events if analytics is available
        this._trackEvent('version_switcher_init', {
            currentVersion: this.currentVersion,
            referrer: document.referrer,
            url: window.location.href
        });
    }

    /**
     * Get the current version from session storage
     * @private
     * @returns {string} Current version
     */
    _getCurrentVersion() {
        return sessionStorage.getItem(this.config.storageKey) || this.config.stableVersion;
    }

    /**
     * Track an event in the analytics system
     * @private
     * @param {string} eventName - Name of the event to track
     * @param {Object} properties - Event properties
     */
    _trackEvent(eventName, properties = {}) {
        // Track via CanaryAnalytics if available
        if (window.analytics) {
            window.analytics.trackEvent(eventName, properties);
        }

        // Track directly via PostHog if available and enabled
        if (window.posthog && this.config.posthogEnabled) {
            window.posthog.capture(eventName, {
                ...properties,
                source: 'version_switcher',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Switch to a specific version
     * @param {string} version Version to switch to
     * @returns {boolean} Success status
     */
    switchToVersion(version) {
        if (version !== this.config.stableVersion && version !== this.config.canaryVersion) {
            console.error(`Invalid version: ${version}`);
            return false;
        }

        // Don't switch if already on this version
        if (version === this.currentVersion) {
            return false;
        }

        // Track the switch event
        this._trackEvent('version_switch', {
            fromVersion: this.currentVersion,
            toVersion: version,
            userInitiated: true,
            // Include feature flags if available
            featureFlags: window.CanaryConfig ? window.CanaryConfig.featureFlags : null
        });

        // Update session storage
        sessionStorage.setItem(this.config.storageKey, version);
        this.currentVersion = version;

        // Execute callback if provided
        if (this.config.onVersionSwitch && typeof this.config.onVersionSwitch === 'function') {
            this.config.onVersionSwitch(version);
        }

        // Redirect to the new version
        window.location.href = `../${version}/index.html`;
        return true;
    }

    /**
     * Create the version switcher UI
     * @private
     */
    _createSwitcher() {
        // Find or create the container
        let container = document.getElementById(this.config.switcherContainerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = this.config.switcherContainerId;
            container.className = 'version-switcher';
            document.body.appendChild(container);
        }

        // Get canary percentage if available
        let canaryPercentage = 'N/A';
        if (this.canaryConfig) {
            canaryPercentage = this.canaryConfig.getCurrentCanaryPercentage() + '%';
        }

        // Create styled container with more specific and consistent styling
        container.innerHTML = `
            <style>
                /* Reset and isolate version switcher styles to prevent external influence */
                #version-switcher.version-switcher {
                    all: initial; /* Reset all properties */
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    box-sizing: border-box;
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 200px; /* Fixed width */
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 9999;
                    color: #333;
                    font-size: 14px;
                    line-height: 1.4;
                }

                #version-switcher.version-switcher * {
                    box-sizing: border-box;
                    font-family: inherit;
                }

                #version-switcher.version-switcher h4 {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #333;
                    font-weight: 600;
                    padding: 0;
                    white-space: nowrap;
                }

                #version-switcher.version-switcher .version-info {
                    font-size: 11px;
                    color: #666;
                    margin-bottom: 8px;
                }

                #version-switcher.version-switcher .version-switcher-options {
                    display: flex;
                    width: 100%;
                    gap: 8px;
                }

                #version-switcher.version-switcher button {
                    flex: 1;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 5px 10px;
                    height: 32px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background: #fff;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: normal;
                    text-align: center;
                    color: #333;
                    margin: 0;
                    transition: background-color 0.2s ease;
                    width: auto;
                    min-width: 60px;
                    outline: none;
                    box-shadow: none;
                }

                #version-switcher.version-switcher button:hover {
                    background: #f0f0f0;
                }

                #version-switcher.version-switcher button.active {
                    background: #0366d6;
                    color: white;
                    border-color: #0366d6;
                }

                #version-switcher.version-switcher .vs-tag {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    padding: 2px 5px;
                    border-radius: 3px;
                    margin-left: 5px;
                    min-width: 42px;
                    text-align: center;
                    text-transform: uppercase;
                    font-weight: bold;
                }

                #version-switcher.version-switcher .vs-tag.stable {
                    background: #28a745;
                    color: white;
                }

                #version-switcher.version-switcher .vs-tag.canary {
                    background: #f9c513;
                    color: black;
                }
            </style>
            <div>
                <h4>Version Switcher <span class="vs-tag ${this.currentVersion}">${this.currentVersion.toUpperCase()}</span></h4>
                ${this.canaryConfig ? `<div class="version-info">Canary distribution: ${canaryPercentage}</div>` : ''}
                <div class="version-switcher-options">
                    <button id="vs-btn-stable" class="${this.currentVersion === this.config.stableVersion ? 'active' : ''}">
                        Stable
                    </button>
                    <button id="vs-btn-canary" class="${this.currentVersion === this.config.canaryVersion ? 'active' : ''}">
                        Canary
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('vs-btn-stable').addEventListener('click', () => {
            this.switchToVersion(this.config.stableVersion);
        });
        
        document.getElementById('vs-btn-canary').addEventListener('click', () => {
            this.switchToVersion(this.config.canaryVersion);
        });
    }
}

// Make available globally
window.VersionSwitcher = VersionSwitcher;