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
        console.log('Dashboard bridge: Dashboard data available, initializing dashboard');
        
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
        
        // Initialize the React application
        if (window.__NEXT_DASHBOARD_INIT__) {
          try {
            window.__NEXT_DASHBOARD_INIT__(dashboardData);
            console.log('Dashboard bridge: React dashboard initialized successfully');
          } catch(e) {
            console.error('Dashboard bridge: Failed to initialize React dashboard:', e);
          }
        } else {
          console.error('Dashboard bridge: Dashboard initialization function not found');
        }
        
        // Set up periodic refresh
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
