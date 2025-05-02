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
        
        // Log version switch events if canary is available
        this._trackEvent('version_switcher_init', {
            currentVersion: this.currentVersion,
            referrer: document.referrer,
            url: window.location.href
        });
    }

    /**
     * Get the current version
     * @private
     * @returns {string} The current version
     */
    _getCurrentVersion() {
        const saved = localStorage.getItem(this.config.storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                return data.version;
            } catch (e) {
                return this.config.stableVersion;
            }
        }
        return this.config.stableVersion;
    }

    /**
     * Switch to a specified version
     * @param {string} version - Version to switch to
     */
    switchToVersion(version) {
        if (version !== this.currentVersion) {
            // Update state
            this.currentVersion = version;
            
            // Store in localStorage
            const data = { version, switchedAt: Date.now() };
            localStorage.setItem(this.config.storageKey, JSON.stringify(data));
            
            // Update UI
            this._updateButtons();
            
            // Track event
            this._trackEvent('version_switched', {
                previousVersion: this.currentVersion,
                newVersion: version,
                manual: true
            });
            
            // Call callback if provided
            if (typeof this.config.onVersionSwitch === 'function') {
                this.config.onVersionSwitch(version);
            }
            
            // Reload the page to apply the new version
            window.location.reload();
        }
    }

    /**
     * Track an event (uses canary if available, otherwise tries PostHog directly)
     * @private
     * @param {string} eventName - Event name
     * @param {object} data - Event data
     */
    _trackEvent(eventName, data = {}) {
        // Try to use canary object if available
        if (window.canary && typeof window.canary.trackEvent === 'function') {
            window.canary.trackEvent(eventName, data);
            return;
        }
        
        // Fall back to PostHog if enabled
        if (this.config.posthogEnabled && window.posthog) {
            window.posthog.capture(eventName, data);
        }
    }

    /**
     * Update button states
     * @private
     */
    _updateButtons() {
        const stableBtn = document.getElementById('vs-btn-stable');
        const canaryBtn = document.getElementById('vs-btn-canary');
        
        if (stableBtn && canaryBtn) {
            stableBtn.className = this.currentVersion === this.config.stableVersion ? 'active' : '';
            canaryBtn.className = this.currentVersion === this.config.canaryVersion ? 'active' : '';
        }
    }

    /**
     * Create the version switcher UI
     * @private
     */
    _createSwitcher() {
        // Create container if it doesn't exist
        let container = document.getElementById(this.config.switcherContainerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.config.switcherContainerId;
            document.body.appendChild(container);
        }

        // Calculate canary percentage if config available
        const canaryPercentage = this.canaryConfig ? 
            `${this.canaryConfig.initialCanaryPercentage}%` : 'Unknown';

        // Add CSS and HTML
        container.className = 'version-switcher';
        container.innerHTML = `
            <style>
                #version-switcher.version-switcher {
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
                    display: inline-block;
                    padding: 2px 4px;
                    font-size: 10px;
                    font-weight: 600;
                    border-radius: 3px;
                    margin-left: 4px;
                }
            </style>
            <div>
                <h4>Version Switcher</h4>
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