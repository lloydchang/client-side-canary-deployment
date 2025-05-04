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
        
        // Safe direct initialization - bypass the problematic __NEXT_DASHBOARD_INIT__
        setTimeout(() => {
          try {
            // First approach: Try direct access to exported initDashboard function
            if (self.__NEXT_LOADED_PAGES__ && 
                Array.isArray(self.__NEXT_LOADED_PAGES__) && 
                self.__NEXT_LOADED_PAGES__[0] && 
                Array.isArray(self.__NEXT_LOADED_PAGES__[0]) && 
                self.__NEXT_LOADED_PAGES__[0].length > 1) {
              
              const appModule = self.__NEXT_LOADED_PAGES__[0][1];
              if (appModule && typeof appModule.initDashboard === 'function') {
                console.log('Dashboard bridge: Calling initDashboard directly');
                appModule.initDashboard(dashboardData);
              }
            }
            
            // Second approach: Skip using the init function entirely
            // This triggers a re-render by dispatching an event that the React component listens for
            window.dashboardData = dashboardData;
            window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
            console.log('Dashboard bridge: Dashboard data updated via event');
          } catch(e) {
            console.error('Dashboard bridge: Error during initialization:', e);
            // Still make the data available
            window.dashboardData = dashboardData;
            window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
          }
        }, 500);
        
        // Set up periodic refresh
        setInterval(() => {
          if (window.canary) {
            // Update the dashboard data
            dashboardData.metrics = window.canary._metrics || dashboardData.metrics;
            dashboardData.assignment = window.canary._assignment || dashboardData.assignment;
            dashboardData.config = window.canary._config || dashboardData.config;
            
            // Update directly
            window.dashboardData = dashboardData;
            window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
            
            // If NEXT_DASHBOARD_UPDATE exists and doesn't cause errors, use it too
            try {
              if (window.__NEXT_DASHBOARD_UPDATE__) {
                window.__NEXT_DASHBOARD_UPDATE__(dashboardData);
              }
            } catch(e) {
              console.error('Dashboard bridge: Error updating dashboard:', e);
            }
          }
        }, 2000);
      }
    }, 500);
  });
})();
