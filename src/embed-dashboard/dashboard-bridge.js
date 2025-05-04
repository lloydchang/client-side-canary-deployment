/**
 * Dashboard Bridge
 * 
 * This script bridges the embedded dashboard React application with the canary system.
 * It initializes the React application when dashboard data becomes available.
 */

(function() {
  // Flag to track if dashboard has been rendered
  let dashboardRendered = false;
  
  // Wait for DOM content to be loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Check if the root element exists
    const dashboardRoot = document.getElementById('dashboard-root');
    if (!dashboardRoot) {
      console.error('Dashboard bridge: Root element #dashboard-root not found');
      return;
    }

    // Split the dashboard area to show both React and Direct HTML implementations
    dashboardRoot.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <h3 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000; background-color: #fff;">
            React Dashboard (Original)
          </h3>
          <div id="react-dashboard" style="min-height: 100px; border: 1px dashed #ccc; padding: 10px; position: relative; background-color: #fff; color: #000;">
            <div id="dashboard" style="width: 100%;"></div>
            <div style="position: absolute; top: 0; right: 0; background: #fff; padding: 4px 8px; font-size: 12px; color: #000; border-radius: 0 0 0 4px;">
              React Implementation
            </div>
          </div>
        </div>
        
        <div>
          <h3 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000; background-color: #fff;">
            Direct HTML Dashboard (Fallback)
          </h3>
          <div id="html-dashboard" style="min-height: 100px; border: 1px dashed #ccc; padding: 10px; position: relative; background-color: #fff; color: #000;">
            <!-- This will be filled with our direct HTML implementation -->
            <div style="position: absolute; top: 0; right: 0; background: #fff; padding: 4px 8px; font-size: 12px; color: #000; border-radius: 0 0 0 4px;">
              Direct HTML Implementation
            </div>
          </div>
        </div>
      </div>
    `;

    console.log('Dashboard bridge: Waiting for canary data...');
    
    // Wait for canary to be available before initializing
    const checkInterval = setInterval(() => {
      if (window.canary) {
        clearInterval(checkInterval);
        console.log('Dashboard bridge: Canary data available, initializing dashboard');
        
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
        
        // 1. INITIALIZE THE REACT DASHBOARD
        try {
          // Try to initialize the React app in its container
          console.log('Dashboard bridge: Initializing React dashboard');
          
          // Try using the Next.js provided initialization function
          if (window.__NEXT_DASHBOARD_INIT__) {
            try {
              window.__NEXT_DASHBOARD_INIT__(dashboardData);
              console.log('Dashboard bridge: React dashboard initialized successfully');
            } catch(e) {
              console.error('Dashboard bridge: Failed to initialize React dashboard:', e);
            }
          } else {
            console.warn('Dashboard bridge: __NEXT_DASHBOARD_INIT__ not found');
          }
        } catch(e) {
          console.error('Dashboard bridge: Error setting up React dashboard:', e);
        }
        
        // 2. RENDER THE DIRECT HTML DASHBOARD
        const htmlDashboardContainer = document.getElementById('html-dashboard');
        if (htmlDashboardContainer) {
          try {
            // Create the dashboard with direct HTML - enforcing black on white
            const directDashboardContainer = document.createElement('div');
            directDashboardContainer.className = 'Dashboard_dashboard__FnfVe';
            // Inline styles to override any external CSS
            directDashboardContainer.style = `
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              border-radius: 8px;
              padding: 20px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 800px;
              margin: 0 auto;
            `;
            
            directDashboardContainer.innerHTML = `
              <div class="Dashboard_grid__OoIFh" style="color: #000000 !important; background-color: #ffffff !important;">
                <div class="Dashboard_section__6mn3y" style="background-color: #ffffff !important; color: #000000 !important; box-shadow: none; border: 1px solid #cccccc;">
                  <div style="color: #000000 !important;">
                    <h3 style="color: #000000 !important; margin-top: 0;">Current Version</h3>
                    <div style="color: #000000 !important;">
                      <div style="display: flex; align-items: center; margin-bottom: 8px; color: #000000 !important;">
                        <span style="color: #000000 !important;">Assigned to: </span>
                        <strong style="margin-left: 5px; color: #000000 !important;">${dashboardData.assignment.version}</strong>
                      </div>
                      <div style="color: #000000 !important;">
                        <span style="color: #000000 !important;">Canary percentage: </span>
                        <strong style="color: #000000 !important;">${dashboardData.config.initialCanaryPercentage}%</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="Dashboard_section__6mn3y" style="background-color: #ffffff !important; color: #000000 !important; box-shadow: none; border: 1px solid #cccccc; margin-top: 15px;">
                  <h3 style="color: #000000 !important; margin-top: 0;">Metrics Comparison</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; color: #000000 !important;">
                    <div style="border-radius: 5px; padding: 15px; background-color: #ffffff !important; border: 1px solid #cccccc; color: #000000 !important;">
                      <h4 style="margin: 0 0 10px 0; color: #000000 !important;">Stable Version</h4>
                      <ul style="list-style: none; margin: 0; padding: 0; color: #000000 !important;">
                        <li style="color: #000000 !important;"><span style="font-weight: 500; margin-right: 5px; color: #000000 !important;">Pageviews:</span> <span style="color: #000000 !important
