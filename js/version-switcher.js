/**
 * Version Switcher Module
 * 
 * Allows users to manually switch between stable and canary versions
 * and coordinates directly with the main canary object
 */

class VersionSwitcher {
    constructor(config = {}) {
        this.config = {
            stableVersion: 'stable',
            canaryVersion: 'canary',
            switcherContainerId: 'version-switcher',
            storageKey: 'version',
            onVersionSwitch: null, // Optional callback when version is switched
            ...config
        };

        // Try to get CanaryConfig if available
        if (window.CanaryConfig) {
            this.canaryConfig = window.CanaryConfig;
        }

        this.currentVersion = this._getCurrentVersion();
        this._createSwitcher();
        
        // Log version switch events using main canary object directly
        if (window.canary) {
            window.canary.trackEvent('version_switcher_init', {
                currentVersion: this.currentVersion,
                referrer: document.referrer,
                url: window.location.href
            });
        }
    }

    /**
     * Get current version from localStorage
     * @private
     * @returns {string} Current version
     */
    _getCurrentVersion() {
        // If canary object is available, try to use its version first
        if (window.canary && window.canary._assignment && window.canary._assignment.version) {
            return window.canary._assignment.version;
        }
        
        // Otherwise use localStorage
        try {
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored) {
                return stored;
            }
        } catch (e) {
            console.error('Error accessing localStorage', e);
        }
        
        // Default to stable if no version is found
        return this.config.stableVersion;
    }

    /**
     * Switch to a different version
     * @param {string} version - Version to switch to
     */
    switchToVersion(version) {
        if (this.currentVersion === version) {
            return; // Already on this version
        }

        // Track the switch using canary directly
        if (window.canary) {
            window.canary.trackEvent('version_switched', {
                fromVersion: this.currentVersion,
                toVersion: version
            });
        }
        
        // Update current version
        this.currentVersion = version;
        
        // Update UI
        if (document.getElementById('vs-btn-stable')) {
            document.getElementById('vs-btn-stable').classList.toggle('active', version === this.config.stableVersion);
        }
        if (document.getElementById('vs-btn-canary')) {
            document.getElementById('vs-btn-canary').classList.toggle('active', version === this.config.canaryVersion);
        }
        
        // Call callback if provided
        if (typeof this.config.onVersionSwitch === 'function') {
            this.config.onVersionSwitch(version);
        }
        
        // If canary object exists, update its assignment
        if (window.canary && typeof window.canary.updateVersion === 'function') {
            window.canary.updateVersion(version);
        } else {
            // Update localStorage
            try {
                localStorage.setItem(this.config.storageKey, version);
            } catch (e) {
                console.error('Error saving to localStorage', e);
            }
            
            // Reload page to apply changes if canary isn't available
            window.location.reload();
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
            container.className = 'version-switcher';
            document.body.appendChild(container);
        }
        
        let canaryPercentage = '';
        if (this.canaryConfig && typeof this.canaryConfig.getCurrentCanaryPercentage === 'function') {
            canaryPercentage = this.canaryConfig.getCurrentCanaryPercentage() + '%';
        } else if (window.canary && window.canary._config) {
            canaryPercentage = window.canary._config.initialCanaryPercentage + '%';
        }
        
        container.innerHTML = `
            <style>
                #version-switcher.version-switcher {
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
                }

                #version-switcher.version-switcher .version-info {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 8px;
                }

                #version-switcher.version-switcher .version-switcher-options {
                    display: flex;
                    gap: 8px;
                }

                #version-switcher.version-switcher button {
                    flex: 1;
                    background: #fff;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    padding: 6px 10px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
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
                ${canaryPercentage ? `<div class="version-info">Canary distribution: ${canaryPercentage}</div>` : ''}
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