/**
 * Dashboard Bridge
 * 
 * This script bridges the embedded dashboard React application with the canary system.
 * It initializes the React application when canary data becomes available.
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

    console.log('Dashboard bridge: Waiting for canary data...');
    
    // Wait for canary to be available before initializing
    const checkInterval = setInterval(() => {
      if (window.canary) {
        clearInterval(checkInterval);
        console.log('Dashboard bridge: Canary data available, initializing dashboard');
        
        // Initialize the React application
        if (window.__NEXT_DASHBOARD_INIT__) {
          try {
            window.__NEXT_DASHBOARD_INIT__(window.canary);
            console.log('Dashboard bridge: React dashboard initialized successfully');
          } catch(e) {
            console.error('Dashboard bridge: Failed to initialize React dashboard:', e);
          }
        } else {
          console.error('Dashboard bridge: Dashboard initialization function not found');
        }
      }
    }, 500);
  });
})();
