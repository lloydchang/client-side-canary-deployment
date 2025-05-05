/**
 * Version Switcher Module
 * 
 * Allows users to manually switch between stable and canary versions
 */

class VersionSwitcher {
    constructor(options = {}) {
        // Default options
        this.options = {
            currentPage: 'home',
            position: 'bottom-right',
            switcherContainerId: 'version-switcher',
            ...options
        };
        
        // Initialize with a default percentage value
        this.canaryPercentage = 'Loading...';
        
        // Create container immediately so it's visible in the DOM
        this._createContainer();
        
        // Use a more robust initialization approach with retry
        this._initWithRetry();
    }
    
    /**
     * Initialize with retry logic to ensure configuration is available
     * @private
     */
    _initWithRetry(attempts = 0) {
        const maxAttempts = 10; // Maximum number of retries
        const retryInterval = 300; // Retry every 300ms
        
        console.log(`Version Switcher init attempt ${attempts + 1}/${maxAttempts}`);
        
        // Check if ConfigManager is loaded and ready
        if (window.CanaryConfigManager && window.CanaryConfigManager._configLoaded) {
            // ConfigManager is ready, use its data
            const percentage = window.CanaryConfigManager.get('CANARY_PERCENTAGE');
            console.log('Using ConfigManager percentage:', percentage);
            this.canaryPercentage = percentage + '%';
            this._completeInitialization();
        } 
        // Try alternatives if ConfigManager isn't ready
        else if (window.CanaryConfig && window.CanaryConfig.distribution) {
            // Legacy fallback 1: Use direct CanaryConfig
            const percentage = window.CanaryConfig.distribution.canaryPercentage;
            console.log('Using legacy CanaryConfig percentage:', percentage);
            this.canaryPercentage = percentage + '%';
            this._completeInitialization();
        } 
        // Try canary object as last resort
        else if (window.canary && window.canary._config && typeof window.canary._config.initialCanaryPercentage !== 'undefined') {
            // Legacy fallback 2: Use canary object
            const percentage = window.canary._config.initialCanaryPercentage;
            console.log('Using canary object percentage:', percentage);
            this.canaryPercentage = percentage + '%';
            this._completeInitialization();
        }
        // If ConfigManager exists but isn't loaded yet, wait for it
        else if (window.CanaryConfigManager && attempts < maxAttempts) {
            console.log('Waiting for ConfigManager to load...');
            if (attempts === 0) {
                // On first attempt, try using the onConfigReady method
                window.CanaryConfigManager.onConfigReady(config => {
                    console.log('ConfigManager ready via callback:', config.CANARY_PERCENTAGE);
                    this.canaryPercentage = config.CANARY_PERCENTAGE + '%';
                    this._completeInitialization();
                });
            }
            
            // Keep retrying with a timeout as a backup plan
            setTimeout(() => this._initWithRetry(attempts + 1), retryInterval);
        } 
        // Last resort - use a default value after max attempts
        else {
            console.warn('Could not get canary percentage from any source after maximum attempts');
            this.canaryPercentage = '5%'; // Default fallback
            this._completeInitialization();
        }
    }
    
    /**
     * Create the container for the version switcher UI
     * @private
     */
    _createContainer() {
        // Create container if it doesn't exist
        let container = document.getElementById(this.options.switcherContainerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.options.switcherContainerId;
            container.className = 'version-switcher';
            document.body.appendChild(container);
            
            // Add loading indicator immediately
            container.innerHTML = `
                <style>
                    #version-switcher.version-switcher {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        width: 200px;
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
                </style>
                <div>
                    <h4>Version Switcher</h4>
                    <div class="version-info">
                        Canary distribution: ${this.canaryPercentage}
                    </div>
                    <div class="version-info">
                        Loading...
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Complete initialization after configuration is available
     * @private
     */
    _completeInitialization() {
        this.createUI();
        this.attachEvents();
        console.log('Version switcher fully initialized with percentage:', this.canaryPercentage);
    }
    
    /**
     * Get canary distribution percentage
     * @returns {string} Canary percentage as a string with % symbol
     * @private
     */
    _getCanaryPercentage() {
        // We don't need this method anymore as we handle this in _initWithRetry
        // Keeping it for backward compatibility
        return this.canaryPercentage;
    }
    
    /**
     * Create the version switcher UI
     * @private
     */
    createUI() {
        // Create container if it doesn't exist
        let container = document.getElementById(this.options.switcherContainerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.options.switcherContainerId;
            container.className = 'version-switcher';
            document.body.appendChild(container);
        }
        
        // Determine active button based on current page or assignment
        let activePage = this.options.currentPage;
        
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
        if (this.options.currentPage === 'home') {
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
     * Add event listeners to the version switcher buttons
     * @private
     */
    attachEvents() {
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
        if (this.options.onVersionSwitch) {
            this.options.onVersionSwitch(version);
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
    // Wait for DOM to be ready
    const initVersionSwitcher = function() {
        if (!window.versionSwitcherInitialized) {
            console.log('Starting version switcher initialization');
            
            // Initialize the version switcher - it will handle waiting for config internally
            window.versionSwitcher = new VersionSwitcher();
            window.versionSwitcherInitialized = true;
        }
    };
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Give more time for other scripts to load
        setTimeout(initVersionSwitcher, 200);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initVersionSwitcher, 200);
        }
    }
})();