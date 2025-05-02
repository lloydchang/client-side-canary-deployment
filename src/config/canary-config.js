/**
 * Canary Configuration
 * Controls default settings for the canary deployment system
 */

const CanaryConfig = {
    // Distribution configuration
    distribution: {
        initialDate: '2023-06-01',      // When this version's distribution started
        initialCanaryPercentage: 10,    // Initial percentage of users to receive canary
        maxCanaryPercentage: 50,        // Maximum percentage for automatic scaling
        rampUpDays: 7,                  // Days to reach max percentage
        status: 'ACTIVE'                // Current status: ACTIVE, PAUSED, ROLLED_BACK
    },

    // Feature flags for canary version
    featureFlags: {
        newDesign: true,
        betaFeatures: false,
        performanceOptimizations: true
    },

    // Analytics configuration
    analytics: {
        debug: false,
        sampleRate: 1.0,                // Track 100% of users
        endpoint: null,                 // Set to your collection endpoint, or null for local storage only
        storageKey: 'canary_analytics',
        bufferInterval: 30000,          // Send data every 30 seconds if endpoint is defined
        maxEventsStored: 100,           // Maximum events to store locally
        posthogApiKey: 'ph_YOUR_KEY_HERE', // Replace with your actual PostHog API key
        posthogProjectId: 'YOUR_PROJECT_ID' // Your PostHog project ID for API requests
    },

    // Metrics thresholds for rollback decisions
    thresholds: {
        // Performance thresholds (milliseconds)
        performance: {
            pageLoad: 1.2,              // Max 20% slower page loads
            apiResponse: 1.3,           // Max 30% slower API responses
            rendering: 1.25             // Max 25% slower rendering
        },
        
        // Error thresholds
        errors: {
            jsErrors: 1.5,              // 50% more errors
            apiErrors: 1.2,             // 20% more API errors
            crashRate: 1.1              // 10% higher crash rate
        },
        
        // Engagement thresholds (compared to stable)
        engagement: {
            timeOnSite: 0.9,            // Min 90% of stable version's time on site
            conversion: 0.95            // Min 95% of stable conversion rate
        }
    },
    
    // Helper methods
    getCurrentCanaryPercentage: function() {
        const initialDate = new Date(this.distribution.initialDate);
        const currentDate = new Date();
        const daysSinceInitial = Math.floor((currentDate - initialDate) / (1000 * 60 * 60 * 24));
        
        if (this.distribution.status !== 'ACTIVE') {
            return 0; // No canary if not active
        }
        
        // Calculate percentage based on ramp-up period
        let calculatedPercentage = this.distribution.initialCanaryPercentage;
        
        if (daysSinceInitial > 0) {
            const dailyIncrease = 
                (this.distribution.maxCanaryPercentage - this.distribution.initialCanaryPercentage) / 
                this.distribution.rampUpDays;
                
            calculatedPercentage += daysSinceInitial * dailyIncrease;
        }
        
        // Cap at maximum percentage
        return Math.min(calculatedPercentage, this.distribution.maxCanaryPercentage);
    }
};

// Make it globally available
window.CanaryConfig = CanaryConfig;
