/**
 * Dashboard Bridge
 * 
 * This script bridges the embedded dashboard React application with the canary system.
 * It initializes the React application when dashboard data becomes available.
 */

(function() {
  // Wait for DOM content to be loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Check if the root element exists
    const dashboardRoot = document.getElementById('dashboard-root');
    if (!dashboardRoot) {
      console.error('Dashboard bridge: Root element #dashboard-root not found');
      return;
    }

    console.log('Dashboard bridge: Waiting for dashboard data...');
    
    // Wait for canary to be available before initializing
    const checkInterval = setInterval(() => {
      if (window.canary) {
        clearInterval(checkInterval);
        console.log('Dashboard bridge: Dashboard data available, preparing dashboard');
        
        // Prepare formatted data for the dashboard
        const dashboardData = {
          metrics: window.canary._metrics || {
            stable: { pageviews: 0, errors: 0, clicks: 0 },
            canary: { pageviews: 0, errors: 0, clicks: 0 },
            events: []
          },
          assignment: window.canary._assignment || {
            version: 'stable',
            timestamp: new Date().toISOString()
          },
          config: window.canary._config || {
            initialCanaryPercentage: 5
          }
        };
        
        // Make data globally available
        window.dashboardData = dashboardData;
        
        // Create a function to safely initialize the dashboard
        const safeInitDashboard = () => {
          // Only initialize if Next.js is ready
          if (typeof self.__NEXT_LOADED_PAGES__ === 'undefined' || 
              !Array.isArray(self.__NEXT_LOADED_PAGES__) || 
              self.__NEXT_LOADED_PAGES__.length === 0) {
            console.log('Dashboard bridge: Next.js not fully loaded yet, waiting...');
            return false;
          }
          
          try {
            window.__NEXT_DASHBOARD_INIT__(dashboardData);
            console.log('Dashboard bridge: React dashboard initialized successfully');
            return true;
          } catch(e) {
            console.error('Dashboard bridge: Failed to initialize React dashboard:', e);
            // Make sure data is still available via the global variable
            window.dashboardData = dashboardData;
            window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
            return false;
          }
        };
        
        // Try to initialize with increasing timeouts to ensure Next.js is ready
        let attempts = 0;
        const maxAttempts = 5;
        
        const attemptInit = () => {
          if (attempts >= maxAttempts) {
            console.warn('Dashboard bridge: Max init attempts reached. Using fallback.');
            window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
            return;
          }
          
          attempts++;
          const timeoutMs = 300 * attempts; // Increasing timeout: 300ms, 600ms, 900ms, etc.
          
          console.log(`Dashboard bridge: Init attempt ${attempts}/${maxAttempts} in ${timeoutMs}ms`);
          
          setTimeout(() => {
            if (!safeInitDashboard()) {
              attemptInit(); // Try again with a longer timeout
            }
          }, timeoutMs);
        };
        
        // Start the initialization attempts
        attemptInit();
        
        // Set up periodic refresh regardless of initialization status
        setInterval(() => {
          if (window.canary) {
            // Update the dashboard data
            dashboardData.metrics = window.canary._metrics || dashboardData.metrics;
            dashboardData.assignment = window.canary._assignment || dashboardData.assignment;
            dashboardData.config = window.canary._config || dashboardData.config;
            
            // Trigger an update event if available
            if (window.__NEXT_DASHBOARD_UPDATE__) {
              window.__NEXT_DASHBOARD_UPDATE__(dashboardData);
            }
          }
        }, 2000);
      }
    }, 500);
  });
})();
