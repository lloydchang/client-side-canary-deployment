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
            currentPage: null, // Can be 'home', 'stable', or 'canary'
            ...config
        };
        
        // Store canary distribution percentage for reuse
        this.canaryPercentage = this._getCanaryPercentage();
        
        // Create UI
        this._createSwitcher();
        
        // Add event listeners
        this._addEventListeners();
    }
    
    /**
     * Get canary distribution percentage
     * @returns {string} Canary percentage as a string with % symbol
     * @private
     */
    _getCanaryPercentage() {
        if (window.CanaryConfig && window.CanaryConfig.distribution && 
            typeof window.CanaryConfig.distribution.canaryPercentage !== 'undefined') {
            // Properly handle zero percentage case
            return window.CanaryConfig.distribution.canaryPercentage + '%';
        } else if (window.canary && window.canary._config && 
                   typeof window.canary._config.initialCanaryPercentage !== 'undefined') {
            // Fall back to the runtime config if needed
            return window.canary._config.initialCanaryPercentage + '%';
        }
        return 'N/A'; // Return "N/A" when no percentage found
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
        
        // Determine active button based on current page or assignment
        let activePage = this.config.currentPage;
        
        // If no current page specified, determine from the URL path first
        if (!activePage) {
            // Check if URL contains /canary/ or /stable/
            const path = window.location.pathname;
            console.log('Current path for version detection:', path);
            
            // More robust detection for GitHub Pages and other environments
            // Check for /canary/ or /canary at the end of the URL
            if (path.includes('/canary/') || path.endsWith('/canary')) {
                activePage = 'canary';
                console.log('Detected canary version from URL');
            } 
            // Check for /stable/ or /stable at the end of the URL
            else if (path.includes('/stable/') || path.endsWith('/stable')) {
                activePage = 'stable';
                console.log('Detected stable version from URL');
            } 
            // Any other path is considered home
            else {
                activePage = 'home';
                console.log('Detected home version from URL');
            }
        }
        
        // Now, only check assignment if path detection didn't work
        if (!activePage && window.canary && window.canary._assignment) {
            activePage = window.canary._assignment.version;
            console.log('Using assignment from localStorage:', activePage);
        }
        
        // If still no active page is determined, default to home
        if (!activePage) {
            activePage = 'home';
            console.log('No specific version detected, defaulting to home');
        }

        // Ensure home page is always correctly set
        if (this.config.currentPage === 'home') {
            activePage = 'home';
            console.log('Force setting active page to home based on config');
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
                    z-index: 9999 !important;
                    color: #333;
                    font-size: 14px;
                    line-height: 1.4;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
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
                <div class="version-info">
                    Canary distribution: ${this.canaryPercentage || 'N/A'}
                    <div style="font-size:10px;margin-top:4px;color:#666;">Config v${this._getConfigVersion()}</div>
                </div>
                <div class="version-switcher-options">
                    <button id="vs-home-btn" class="${activePage === 'home' ? 'active' : ''}">
                        Home
                    </button>
                    <button id="vs-stable-btn" class="${activePage === 'stable' ? 'active' : ''}">
                        Stable
                    </button>
                    <button id="vs-canary-btn" class="${activePage === 'canary' ? 'active' : ''}">
                        Canary
                    </button>
                </div>
            </div>
        `;
        
        console.log('Active page set to:', activePage);
    }
    
    /**
     * Get the configuration version timestamp
     * @returns {string} Configuration version or timestamp
     * @private
     */
    _getConfigVersion() {
        const savedVersion = localStorage.getItem('app-version') || 'unknown';
        return savedVersion;
    }
    
    /**
     * Add event listeners to the version switcher buttons
     * @private
     */
    _addEventListeners() {
        const homeBtn = document.getElementById('vs-home-btn');
        const stableBtn = document.getElementById('vs-stable-btn');
        const canaryBtn = document.getElementById('vs-canary-btn');
        
        if (homeBtn && stableBtn && canaryBtn) {
            homeBtn.addEventListener('click', () => this._goHome());
            stableBtn.addEventListener('click', () => this._switchVersion('stable'));
            canaryBtn.addEventListener('click', () => this._switchVersion('canary'));
        }
    }
    
    /**
     * Navigate to the home page
     * @private
     */
    _goHome() {
        console.log('Navigating to home page');
        
        // Get the base path for the application
        let basePath = this._getBasePath();
        
        // Update the active button in the UI
        this._updateActiveButton('home');
        
        // Normalize the URL similar to _switchVersion
        const baseUrl = window.location.origin;
        let normalizedPath = '';
        
        if (basePath) {
            basePath = basePath.replace(/^\/+|\/+$/g, '');
            normalizedPath = baseUrl + '/' + basePath;
        } else {
            normalizedPath = baseUrl;
        }
        
        // Navigate to the home page with a clean URL
        window.location.href = normalizedPath + '/';
    }
    
    /**
     * Switch version and redirect
     * @param {string} version - The version to switch to
     * @private
     */
    _switchVersion(version) {
        console.log('Switching to version:', version);
        
        // Check if we're already on the version - FIX: separate path and assignment checks
        const currentPath = window.location.pathname;
        const pathContainsVersion = currentPath.includes(`/${version}/`);
        
        // Only skip if we're actually on the version's path
        if (pathContainsVersion) {
            console.log('Already on path for version', version, '- skipping redirect');
            return;
        }
        
        // Update UI
        this._updateActiveButton(version);
        
        // Call callback if provided
        if (this.config.onVersionSwitch) {
            this.config.onVersionSwitch(version);
        }
        
        // Get the base path for the application
        let basePath = this._getBasePath();
        console.log('Base path for redirection:', basePath);
        
        // Normalize the URL: clean up any potential issues with slashes
        const baseUrl = window.location.origin;
        let normalizedPath = '';
        
        // Only add basePath if it's not empty
        if (basePath) {
            // Remove leading and trailing slashes from basePath
            basePath = basePath.replace(/^\/+|\/+$/g, '');
            normalizedPath = baseUrl + '/' + basePath;
        } else {
            normalizedPath = baseUrl;
        }
        
        // Ensure we have exactly one slash before the version
        normalizedPath = normalizedPath.replace(/\/+$/, '');
        
        // Redirect to the appropriate version with clean URLs
        if (version === 'canary') {
            window.location.href = normalizedPath + '/canary/';
        } else {
            window.location.href = normalizedPath + '/stable/';
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
     * @param {string} version - The active version ('stable', 'canary', or 'home')
     * @private
     */
    _updateActiveButton(version) {
        const homeBtn = document.getElementById('vs-home-btn');
        const stableBtn = document.getElementById('vs-stable-btn');
        const canaryBtn = document.getElementById('vs-canary-btn');
        
        if (homeBtn && stableBtn && canaryBtn) {
            // Remove active class from all buttons first
            homeBtn.classList.remove('active');
            stableBtn.classList.remove('active');
            canaryBtn.classList.remove('active');
            
            // Add active class to the correct button
            if (version === 'stable') {
                stableBtn.classList.add('active');
            } else if (version === 'canary') {
                canaryBtn.classList.add('active');
            } else if (version === 'home') {
                homeBtn.classList.add('active');
            }
        }
    }
}

// Make available globally
window.VersionSwitcher = VersionSwitcher;

// Improve initialization to handle race conditions
(function() {
    // Ensure canary config is loaded before initializing
    const checkAndInitialize = function() {
        if (!window.versionSwitcherInitialized) {
            // Log config state for debugging
            console.log('CanaryConfig at init time:', window.CanaryConfig ? 
                JSON.stringify(window.CanaryConfig.distribution || {}) : 'Not loaded');
                
            window.versionSwitcher = new VersionSwitcher();
            window.versionSwitcherInitialized = true;
            console.log('Version switcher initialized with percentage:', 
                window.versionSwitcher.canaryPercentage);
        }
    };
    
    // Wait slightly longer to ensure configs are loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(checkAndInitialize, 100); // Small delay to ensure configs are loaded
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(checkAndInitialize, 100);
        });
    }
})();