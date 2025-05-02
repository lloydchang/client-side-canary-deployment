/**
 * Client-Side Canary Analytics Module
 * 
 * A lightweight analytics solution for canary deployments that tracks:
 * - Performance metrics
 * - Error rates
 * - User engagement
 * - Custom events
 * 
 * Integrates with PostHog for analytics collection
 */

class CanaryAnalytics {
    constructor(config = {}) {
        // Set default configuration
        this.config = {
            version: 'unknown',  // default or canary
            sampleRate: 1.0,     // percentage of users to track (1.0 = 100%)
            storageKey: 'canary_analytics',
            endpoint: config.endpoint || null,
            debug: config.debug || false,
            bufferInterval: config.bufferInterval || 10000, // ms between sending data
            posthogEnabled: config.posthogEnabled !== undefined ? config.posthogEnabled : true,
            posthogApiKey: config.posthogApiKey || 'your-posthog-project-key',
            ...config
        };

        // Initialize metrics storage
        this.metrics = {
            performance: {},
            errors: [],
            events: [],
            engagement: {
                startTime: Date.now(),
                interactions: 0,
                scrollDepth: 0
            }
        };

        // Initialize
        this._setupStorage();
        this._capturePerformance();
        this._setupEventListeners();
        this._setupErrorCapture();
        this._initPostHog();

        // Start data submission timer
        if (this.config.endpoint) {
            this._startDataSubmission();
        }
        
        this.logDebug('CanaryAnalytics initialized for version: ' + this.config.version);
    }

    /**
     * Initialize PostHog integration
     * @private
     */
    _initPostHog() {
        if (!this.config.posthogEnabled) {
            this.logDebug('PostHog integration disabled');
            return;
        }

        try {
            // Initialize PostHog script
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            
            posthog.init(this.config.posthogApiKey, {
                api_host: 'https://app.posthog.com',
                persistence: 'localStorage',
                capture_pageview: false, // We'll handle this manually
                loaded: (ph) => {
                    // Register the version as a persistent property
                    ph.register({
                        version: this.config.version,
                        sessionId: this._getSessionId()
                    });
                    this.logDebug('PostHog initialized');
                }
            });
            
            // Track initial page view
            this._sendToPostHog('pageview', {
                version: this.config.version
            });
            
        } catch (error) {
            this.logDebug(`Error initializing PostHog: ${error.message}`);
        }
    }
    
    /**
     * Send event to PostHog
     * @private
     * @param {string} eventName - Event name
     * @param {object} properties - Event properties
     */
    _sendToPostHog(eventName, properties = {}) {
        if (!this.config.posthogEnabled || !window.posthog) {
            return;
        }
        
        try {
            window.posthog.capture(eventName, {
                ...properties,
                version: this.config.version
            });
            this.logDebug(`Sent to PostHog: ${eventName}`);
        } catch (error) {
            this.logDebug(`Error sending to PostHog: ${error.message}`);
        }
    }

    /**
     * Track a custom event
     * @param {string} eventName - Name of the event
     * @param {object} data - Additional event data
     */
    trackEvent(eventName, data = {}) {
        const event = {
            eventName,
            timestamp: Date.now(),
            data
        };
        
        this.metrics.events.push(event);
        this._storeMetrics();
        this.logDebug(`Event tracked: ${eventName}`);
        
        // Send to PostHog
        this._sendToPostHog(eventName, data);
    }

    /**
     * Track an error
     * @param {string} errorMessage - Error message
     * @param {string} errorStack - Error stack trace
     */
    trackError(errorMessage, errorStack = '') {
        const error = {
            message: errorMessage,
            stack: errorStack,
            timestamp: Date.now()
        };
        
        this.metrics.errors.push(error);
        this._storeMetrics();
        this.logDebug(`Error tracked: ${errorMessage}`);
        
        // Send to PostHog as a special "error" event
        this._sendToPostHog('error_occurred', {
            error_message: errorMessage,
            error_stack: errorStack ? errorStack.substring(0, 500) : ''
        });
    }

    /**
     * Get collected analytics data
     * @returns {object} All collected metrics
     */
    getMetrics() {
        const sessionData = this._getStoredMetrics();
        return {
            ...this.metrics,
            sessionData
        };
    }

    /**
     * Send metrics to the configured endpoint
     * @returns {Promise} Promise resolving to the response
     */
    async sendMetrics() {
        if (!this.config.endpoint) {
            this.logDebug('No endpoint configured for sending metrics');
            return null;
        }

        try {
            const payload = {
                version: this.config.version,
                sessionId: this._getSessionId(),
                timestamp: Date.now(),
                metrics: this.getMetrics()
            };

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            this.logDebug('Metrics sent successfully');
            return response;
        } catch (error) {
            this.logDebug(`Error sending metrics: ${error.message}`);
            return null;
        }
    }

    /**
     * Clear all stored metrics
     */
    clearMetrics() {
        this.metrics = {
            performance: {},
            errors: [],
            events: [],
            engagement: {
                startTime: Date.now(),
                interactions: 0,
                scrollDepth: 0
            }
        };
        this._storeMetrics();
        this.logDebug('Metrics cleared');
    }

    /**
     * Log debug messages if debug mode is enabled
     * @param {string} message - Debug message
     */
    logDebug(message) {
        if (this.config.debug) {
            console.log(`[CanaryAnalytics] ${message}`);
        }
    }

    // Private methods

    /**
     * Set up storage for metrics
     * @private
     */
    _setupStorage() {
        if (!sessionStorage.getItem(this.config.storageKey)) {
            sessionStorage.setItem(this.config.storageKey, JSON.stringify({
                sessionId: this._generateSessionId(),
                metrics: {}
            }));
        }
    }

    /**
     * Generate a random session ID
     * @private
     * @returns {string} A unique session ID
     */
    _generateSessionId() {
        return 'session_' + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Get the current session ID
     * @private
     * @returns {string} The current session ID
     */
    _getSessionId() {
        const data = JSON.parse(sessionStorage.getItem(this.config.storageKey) || '{}');
        return data.sessionId || this._generateSessionId();
    }

    /**
     * Store metrics in session storage
     * @private
     */
    _storeMetrics() {
        const data = JSON.parse(sessionStorage.getItem(this.config.storageKey) || '{}');
        data.metrics = this.metrics;
        sessionStorage.setItem(this.config.storageKey, JSON.stringify(data));
    }

    /**
     * Get metrics from session storage
     * @private
     * @returns {object} Stored metrics
     */
    _getStoredMetrics() {
        const data = JSON.parse(sessionStorage.getItem(this.config.storageKey) || '{}');
        return data.metrics || {};
    }

    /**
     * Capture performance metrics
     * @private
     */
    _capturePerformance() {
        // Use Performance API if available
        if (window.performance) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    // Basic navigation timing metrics
                    const perfData = window.performance.timing;
                    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                    const domReadyTime = perfData.domComplete - perfData.domLoading;
                    
                    this.metrics.performance = {
                        pageLoadTime,
                        domReadyTime,
                        timestamp: Date.now()
                    };

                    // Capture Core Web Vitals if available
                    if (window.PerformanceObserver) {
                        this._captureWebVitals();
                    }

                    this._storeMetrics();
                    this.logDebug('Performance metrics captured');
                }, 0);
            });
        }
    }

    /**
     * Capture Core Web Vitals
     * @private
     */
    _captureWebVitals() {
        try {
            // This is a simplified approach - in production, use the web-vitals library for accurate measurement
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.name === 'LCP') {
                        this.metrics.performance.lcp = entry.startTime;
                    }
                    if (entry.name === 'FID') {
                        this.metrics.performance.fid = entry.processingStart - entry.startTime;
                    }
                    if (entry.name === 'CLS') {
                        this.metrics.performance.cls = entry.value;
                    }
                });
                this._storeMetrics();
            });
            
            observer.observe({ type: 'largest-contentful-paint', buffered: true });
            observer.observe({ type: 'first-input', buffered: true });
            observer.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
            this.logDebug('Web Vitals collection not supported');
        }
    }

    /**
     * Set up event listeners for user engagement
     * @private
     */
    _setupEventListeners() {
        // Track user interactions
        document.addEventListener('click', () => {
            this.metrics.engagement.interactions++;
            this._storeMetrics();
        });

        // Track scroll depth
        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (scrollTop / height) * 100;
            
            // Update only if we've scrolled further than before
            if (scrolled > this.metrics.engagement.scrollDepth) {
                this.metrics.engagement.scrollDepth = Math.round(scrolled);
                this._storeMetrics();
            }
        });

        // Update session time on page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                const sessionDuration = Date.now() - this.metrics.engagement.startTime;
                this.metrics.engagement.duration = sessionDuration;
                this._storeMetrics();
                
                // Send metrics when user leaves the page
                if (this.config.endpoint) {
                    // Use sendBeacon for more reliable data sending on page unload
                    if (navigator.sendBeacon) {
                        const payload = {
                            version: this.config.version,
                            sessionId: this._getSessionId(),
                            timestamp: Date.now(),
                            metrics: this.getMetrics()
                        };
                        
                        navigator.sendBeacon(this.config.endpoint, JSON.stringify(payload));
                        this.logDebug('Metrics sent via beacon');
                    } else {
                        this.sendMetrics();
                    }
                }
            }
        });
    }

    /**
     * Set up global error capturing
     * @private
     */
    _setupErrorCapture() {
        window.addEventListener('error', (event) => {
            this.trackError(event.message, event.error ? event.error.stack : '');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.trackError(`Promise rejection: ${event.reason}`, '');
        });
    }

    /**
     * Start periodically sending data
     * @private
     */
    _startDataSubmission() {
        setInterval(() => {
            this.sendMetrics();
        }, this.config.bufferInterval);
    }
}

// Make available globally
window.CanaryAnalytics = CanaryAnalytics;