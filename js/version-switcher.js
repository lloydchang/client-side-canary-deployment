/**
 * Version Switcher Module
 * 
 * Allows users to manually switch between default and canary versions
 * while maintaining analytics data integrity
 */

class VersionSwitcher {
    constructor(config = {}) {
        this.config = {
            defaultVersion: 'default',
            canaryVersion: 'canary',
            switcherContainerId: 'version-switcher',
            storageKey: 'version',
            onVersionSwitch: null, // Optional callback when version is switched
            ...config
        };

        this.currentVersion = this._getCurrentVersion();
        this._createSwitcher();
        
        // Log version switch events if analytics is available
        if (window.analytics) {
            window.analytics.trackEvent('version_switcher_init', {
                currentVersion: this.currentVersion
            });
        }
    }

    /**
     * Get the current version from session storage
     * @private
     * @returns {string} Current version
     */
    _getCurrentVersion() {
        return sessionStorage.getItem(this.config.storageKey) || this.config.defaultVersion;
    }

    /**
     * Switch to a specific version
     * @param {string} version Version to switch to
     * @returns {boolean} Success status
     */
    switchToVersion(version) {
        if (version !== this.config.defaultVersion && version !== this.config.canaryVersion) {
            console.error(`Invalid version: ${version}`);
            return false;
        }

        // Don't switch if already on this version
        if (version === this.currentVersion) {
            return false;
        }

        // Track the switch event if analytics is available
        if (window.analytics) {
            window.analytics.trackEvent('version_switch', {
                fromVersion: this.currentVersion,
                toVersion: version,
                timestamp: Date.now()
            });
        }

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

        // Create styled container
        container.innerHTML = `
            <style>
                .version-switcher {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    z-index: 9999;
                }
                .version-switcher h4 {
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #333;
                }
                .version-switcher-options {
                    display: flex;
                    gap: 8px;
                }
                .version-switcher button {
                    padding: 5px 10px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background: #fff;
                    cursor: pointer;
                    font-size: 13px;
                }
                .version-switcher button:hover {
                    background: #f0f0f0;
                }
                .version-switcher button.active {
                    background: #0366d6;
                    color: white;
                    border-color: #0366d6;
                }
                .version-switcher .vs-tag {
                    display: inline-block;
                    font-size: 10px;
                    padding: 2px 5px;
                    border-radius: 3px;
                    margin-left: 5px;
                    text-transform: uppercase;
                    font-weight: bold;
                }
                .version-switcher .vs-tag.default {
                    background: #28a745;
                    color: white;
                }
                .version-switcher .vs-tag.canary {
                    background: #f9c513;
                    color: black;
                }
            </style>
            <div>
                <h4>Version Switcher <span class="vs-tag ${this.currentVersion}">${this.currentVersion}</span></h4>
                <div class="version-switcher-options">
                    <button id="vs-btn-default" class="${this.currentVersion === this.config.defaultVersion ? 'active' : ''}">
                        Default
                    </button>
                    <button id="vs-btn-canary" class="${this.currentVersion === this.config.canaryVersion ? 'active' : ''}">
                        Canary
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('vs-btn-default').addEventListener('click', () => {
            this.switchToVersion(this.config.defaultVersion);
        });
        
        document.getElementById('vs-btn-canary').addEventListener('click', () => {
            this.switchToVersion(this.config.canaryVersion);
        });
    }
}

// Make available globally
window.VersionSwitcher = VersionSwitcher;