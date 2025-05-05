/**
 * Variant Switcher Module
 * 
 * Allows users to manually switch between stable and canary variants
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
        
        // Wait for next tick to ensure DOM is ready
        setTimeout(() => {
            // Start the configuration detection process
            this._initWithRetry();
        }, 0);
    }
    
    /**
     * Initialize with retry logic to ensure configuration is available
     * @private
     */
    _initWithRetry(attempts = 0) {
        const maxAttempts = 20; // More retries
        const retryInterval = 200; // Slightly faster retries
        
        console.log(`[Variant Switcher] Init attempt ${attempts + 1}/${maxAttempts}`);
        console.log(`[Variant Switcher] Current URL path: ${window.location.pathname}`);
        
        // Use a priority order for configuration sources
        let percentage = null;
        let source = '';
        
        // Debug all potential configuration sources
        if (window.CanaryConfigManager) {
            console.log(`[Variant Switcher] CanaryConfigManager exists, loaded: ${window.CanaryConfigManager._configLoaded}`);
            if (window.CanaryConfigManager._configLoaded) {
                console.log(`[Variant Switcher] Config data:`, window.CanaryConfigManager._config);
            }
        }
        
        if (window.CanaryConfig && window.CanaryConfig.distribution) {
            console.log(`[Variant Switcher] CanaryConfig.distribution:`, window.CanaryConfig.distribution);
        }
        
        if (window.canary && window.canary._config) {
            console.log(`[Variant Switcher] canary._config:`, window.canary._config);
        }
        
        if (window.DEFAULT_CONSTANTS) {
            console.log(`[Variant Switcher] DEFAULT_CONSTANTS.CANARY_PERCENTAGE:`, window.DEFAULT_CONSTANTS.CANARY_PERCENTAGE);
        }
        
        // 1. Check ConfigManager (preferred)
        if (window.CanaryConfigManager && window.CanaryConfigManager._configLoaded) {
            percentage = window.CanaryConfigManager.get('CANARY_PERCENTAGE');
            source = 'ConfigManager';
        }
        // 2. Try direct onConfigReady registration
        else if (window.CanaryConfigManager) {
            // This is the most reliable approach - register for when config is actually ready
            window.CanaryConfigManager.onConfigReady(config => {
                console.log('[Variant Switcher] ConfigManager ready via callback with percentage:', config.CANARY_PERCENTAGE);
                this.canaryPercentage = config.CANARY_PERCENTAGE + '%';
                this._completeInitialization();
            });
            
            // Keep retrying in case the callback doesn't fire for some reason
            if (attempts < maxAttempts) {
                setTimeout(() => this._initWithRetry(attempts + 1), retryInterval);
            }
            return; // Exit early as we're waiting for callback
        }
        // 3. Try deprecated CanaryConfig global
        else if (window.CanaryConfig && window.CanaryConfig.distribution) {
            percentage = window.CanaryConfig.distribution.canaryPercentage;
            source = 'CanaryConfig global';
        }
        // 4. Try canary object configuration
        else if (window.canary && window.canary._config && 
                 typeof window.canary._config.initialCanaryPercentage !== 'undefined') {
            percentage = window.canary._config.initialCanaryPercentage;
            source = 'canary._config';
        }
        // 5. Try DEFAULT_CONSTANTS as last resort
        else if (window.DEFAULT_CONSTANTS && typeof window.DEFAULT_CONSTANTS.CANARY_PERCENTAGE !== 'undefined') {
            percentage = window.DEFAULT_CONSTANTS.CANARY_PERCENTAGE;
            source = 'DEFAULT_CONSTANTS';
        }
        
        // If we found a percentage, use it
        if (percentage !== null) {
            console.log(`[Variant Switcher] Found percentage ${percentage} from ${source}`);
            this.canaryPercentage = percentage + '%';
            this._completeInitialization();
            return;
        }
        
        // If we've exhausted retries, use a hard default
        if (attempts >= maxAttempts) {
            console.warn('[Variant Switcher] Could not get canary percentage from any source after maximum attempts');
            this.canaryPercentage = '5%'; // Default fallback
            this._completeInitialization();
            return;
        }
        
        // Otherwise, retry after delay
        setTimeout(() => this._initWithRetry(attempts + 1), retryInterval);
    }
    
    /**
     * Create the container for the variant switcher UI
     * @private
     */
    _createContainer() {
        // Create container if it doesn't exist
        let container = document.getElementById(this.options.switcherContainerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.options.switcherContainerId;
            container.className = 'variant-switcher';
            document.body.appendChild(container);
            
            // Add loading indicator immediately
            container.innerHTML = `
                <style>
                    #version-switcher.variant-switcher {
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
                    <h4>Variant Switcher</h4>
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
        console.log('[Variant Switcher] Fully initialized with percentage:', this.canaryPercentage);
    }
    
    /**
     * Create the variant switcher UI
     * @private
     */
    createUI() {
        // Create container if it doesn't exist
        let container = document.getElementById(this.options.switcherContainerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.options.switcherContainerId;
            container.className = 'variant-switcher';
            document.body.appendChild(container);
        }
        
        // Determine active button based on current page or assignment
        let activePage = this.options.currentPage;
        
        // If no current page specified, determine from the URL path first
        if (!activePage || activePage === 'home') {  // Modified this line to also check URL if currentPage is 'home'
            // Check if URL contains /canary/ or /stable/
            const path = window.location.pathname;
            console.log('[Variant Switcher] Current path for variant detection:', path);
            
            // More robust detection for GitHub Pages and other environments
            // Check for /canary/ or /canary at the end of the URL
            if (path.includes('/canary/') || path.endsWith('/canary')) {
                activePage = 'canary';
                console.log('[Variant Switcher] Detected canary variant from URL');
            } 
            // Check for /stable/ or /stable at the end of the URL
            else if (path.includes('/stable/') || path.endsWith('/stable')) {
                activePage = 'stable';
                console.log('[Variant Switcher] Detected stable variant from URL');
            } 
            // Any other path is considered home
            else {
                activePage = 'home';
                console.log('[Variant Switcher] Detected home variant from URL');
            }
        }
        
        // Now, only check assignment if path detection didn't work
        if (!activePage && window.canary && window.canary._assignment) {
            activePage = window.canary._assignment.version;
            console.log('[Variant Switcher] Using assignment from localStorage:', activePage);
        }
        
        // If still no active page is determined, default to home
        if (!activePage) {
            activePage = 'home';
            console.log('[Variant Switcher] No specific variant detected, defaulting to home');
        }

        container.innerHTML = `
            <style>
                #version-switcher.variant-switcher {
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

                #version-switcher.variant-switcher * {
                    box-sizing: border-box;
                    font-family: inherit;
                }

                #version-switcher.variant-switcher h4 {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #333;
                }

                #version-switcher.variant-switcher .version-info {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 8px;
                }

                #version-switcher.variant-switcher .version-switcher-options {
                    display: flex;
                    gap: 8px;
                }

                #version-switcher.variant-switcher button {
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

                #version-switcher.variant-switcher button:hover {
                    background: #f0f0f0;
                }

                #version-switcher.variant-switcher button.active {
                    background: #0366d6;
                    color: white;
                    border-color: #0366d6;
                }

                #version-switcher.variant-switcher .vs-tag {
                    display: inline-block;
                    padding: 2px 4px;
                    font-size: 10px;
                    font-weight: 600;
                    border-radius: 3px;
                    margin-left: 4px;
                }
            </style>
            <div>
                <h4>Variant Switcher</h4>
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
     * Add event listeners to the variant switcher buttons
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
     * Switch variant and redirect
     * @param {string} version - The variant to switch to
     * @private
     */
    _switchVersion(version) {
        console.log('Switching to variant:', version);
        
        // Check if we're already on the variant - FIX: separate path and assignment checks
        const currentPath = window.location.pathname;
        const pathContainsVersion = currentPath.includes(`/${version}/`);
        
        // Only skip if we're actually on the variant's path
        if (pathContainsVersion) {
            console.log('Already on path for variant', version, '- skipping redirect');
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
        
        // Ensure we have exactly one slash before the variant
        normalizedPath = normalizedPath.replace(/\/+$/, '');
        
        // Redirect to the appropriate variant with clean URLs
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
     * @param {string} version - The active variant ('stable', 'canary', or 'home')
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
            console.log('[Variant Switcher] Starting initialization');
            
            // Initialize the variant switcher - it will handle waiting for config internally
            window.versionSwitcher = new VersionSwitcher();
            window.versionSwitcherInitialized = true;
        }
    };
    
    // Handle case where script loads before DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Give more time for other scripts to load
        setTimeout(initVersionSwitcher, 200);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initVersionSwitcher, 200);
        });
    }
})();