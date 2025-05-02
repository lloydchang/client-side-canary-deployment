/**
 * Version Switcher Module
 * 
 * Allows users to manually switch between stable and canary versions
 */

class VersionSwitcher {
    /**
     * Create a new Version Switcher instance
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        this.config = {
            switcherContainerId: 'version-switcher',
            onVersionSwitch: null,
            position: 'bottom-right',
            ...config
        };
        
        // Create UI
        this._createSwitcher();
        
        // Add event listeners
        this._addEventListeners();
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
        
        // Get info directly from the global canary object
        let canaryPercentage = '';
        if (window.canary && window.canary._config) {
            canaryPercentage = window.canary._config.initialCanaryPercentage + '%';
        }
        
        // Get current version
        const currentVersion = window.canary && window.canary._assignment ? 
            window.canary._assignment.version : 'unknown';
        
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
                    <button id="vs-stable-btn" class="${currentVersion === 'stable' ? 'active' : ''}">
                        Stable
                    </button>
                    <button id="vs-canary-btn" class="${currentVersion === 'canary' ? 'active' : ''}">
                        Canary <span class="vs-tag" style="background: #f00; color: #fff;">BETA</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Add event listeners to the version switcher buttons
     * @private
     */
    _addEventListeners() {
        const stableBtn = document.getElementById('vs-stable-btn');
        const canaryBtn = document.getElementById('vs-canary-btn');
        
        if (stableBtn && canaryBtn) {
            stableBtn.addEventListener('click', () => this._switchVersion('stable'));
            canaryBtn.addEventListener('click', () => this._switchVersion('canary'));
        }
    }
    
    /**
     * Switch version and redirect
     * @param {string} version - The version to switch to
     * @private
     */
    _switchVersion(version) {
        // Only proceed if we're not already on this version
        if (window.canary && window.canary._assignment && window.canary._assignment.version === version) {
            return;
        }
        
        // Update assignment
        if (window.canary && window.canary._assignment) {
            window.canary._assignment.version = version;
            window.canary._saveAssignment();
        }
        
        // Update UI
        this._updateActiveButton(version);
        
        // Call callback if provided
        if (this.config.onVersionSwitch) {
            this.config.onVersionSwitch(version);
        }
        
        // Get the base path for the application
        let basePath = this._getBasePath();
        
        // Redirect to the appropriate version
        if (version === 'canary') {
            if (!window.location.pathname.includes('/canary/')) {
                window.location.href = `${basePath}/canary/`;
            }
        } else {
            if (!window.location.pathname.includes('/stable/')) {
                window.location.href = `${basePath}/stable/`;
            }
        }
    }
    
    /**
     * Determine the base path for the application
     * @returns {string} The base path
     * @private
     */
    _getBasePath() {
        // Get the current path
        const path = window.location.pathname;
        
        // If we're at the root of the domain
        if (path === '/' || path === '') {
            return '';
        }
        
        // If we're in /stable/ or /canary/ directly under domain root
        if (path === '/stable/' || path === '/canary/') {
            return '';
        }
        
        // For GitHub Pages or any other subdirectory deployment
        // Extract the base path by removing the '/stable/' or '/canary/' part
        if (path.includes('/stable/')) {
            return path.substring(0, path.indexOf('/stable/'));
        } else if (path.includes('/canary/')) {
            return path.substring(0, path.indexOf('/canary/'));
        } else {
            // If neither stable nor canary is in the path, assume we're at the repo root
            // Remove any trailing file names (like index.html)
            const lastSlashIndex = path.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                const potentialFilePath = path.substring(lastSlashIndex);
                if (potentialFilePath.includes('.')) {
                    // This is likely a file, so return the directory portion
                    return path.substring(0, lastSlashIndex);
                }
            }
            return path;
        }
    }
    
    /**
     * Update the active button in the UI
     * @param {string} version - The active version ('stable' or 'canary')
     * @private
     */
    _updateActiveButton(version) {
        const stableBtn = document.getElementById('vs-stable-btn');
        const canaryBtn = document.getElementById('vs-canary-btn');
        
        if (stableBtn && canaryBtn) {
            if (version === 'stable') {
                stableBtn.classList.add('active');
                canaryBtn.classList.remove('active');
            } else {
                canaryBtn.classList.add('active');
                stableBtn.classList.remove('active');
            }
        }
    }
}

// Make available globally
window.VersionSwitcher = VersionSwitcher;