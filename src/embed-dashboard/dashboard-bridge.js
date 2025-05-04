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

    console.log('Dashboard bridge: Setting up dashboard containers');

    // Split the dashboard area to show both React and Direct HTML implementations
    // Use inline styles to prevent external CSS from affecting the layout
    dashboardRoot.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px; width: 100%;">
        <div style="width: 100%; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
          <h3 style="margin: 0; padding: 10px; background-color: #f5f5f5; color: #000; font-size: 16px; border-bottom: 1px solid #ddd;">
            React Dashboard (Original)
          </h3>
          <div id="react-dashboard" style="padding: 15px; background-color: #fff;">
            <div id="dashboard" style="width: 100%;"></div>
          </div>
        </div>
        
        <div style="width: 100%; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
          <h3 style="margin: 0; padding: 10px; background-color: #f5f5f5; color: #000; font-size: 16px; border-bottom: 1px solid #ddd;">
            Direct HTML Dashboard (Fallback)
          </h3>
          <div id="html-dashboard" style="padding: 15px; background-color: #fff;"></div>
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
          const reactDashboardContainer = document.getElementById('react-dashboard');
          if (!reactDashboardContainer) {
            console.error('Dashboard bridge: React dashboard container not found');
          } else {
            const dashboardElement = document.getElementById('dashboard');
            if (!dashboardElement) {
              console.error('Dashboard bridge: Dashboard element not found');
              reactDashboardContainer.innerHTML = '<div style="padding: 20px; color: #000; background: #fff;">React dashboard element not found</div>';
            } else {
              console.log('Dashboard bridge: Initializing React dashboard with data', dashboardData);
              
              // First ensure we can access the dashboard element
              console.log('Dashboard element exists:', !!dashboardElement);
              
              // Try direct initialization through window.initDashboard
              if (typeof window.initDashboard === 'function') {
                try {
                  window.initDashboard(dashboardData);
                  console.log('Dashboard bridge: React dashboard initialized via window.initDashboard');
                } catch (e) {
                  console.error('Dashboard bridge: Error initializing via window.initDashboard', e);
                }
              } else {
                console.log('Dashboard bridge: window.initDashboard not found');
              }
              
              // Try via Next.js init function
              if (window.__NEXT_DASHBOARD_INIT__) {
                try {
                  window.__NEXT_DASHBOARD_INIT__(dashboardData);
                  console.log('Dashboard bridge: React dashboard initialized via __NEXT_DASHBOARD_INIT__');
                } catch (e) {
                  console.error('Dashboard bridge: Error initializing via __NEXT_DASHBOARD_INIT__', e);
                }
              } else {
                console.warn('Dashboard bridge: __NEXT_DASHBOARD_INIT__ not found');
              }
              
              // Also dispatch event for any event listeners
              window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
              console.log('Dashboard bridge: Dispatched dashboard-data-updated event');
              
              // Display a fallback message if the dashboard appears empty after initialization attempts
              setTimeout(() => {
                if (dashboardElement.childElementCount === 0) {
                  dashboardElement.innerHTML = `
                    <div style="padding: 15px; border: 1px solid #fcc; background-color: #fff; color: #000;">
                      <p><strong>React initialization failed</strong></p>
                      <p>The React dashboard could not be initialized. This might be because:</p>
                      <ul>
                        <li>The React bundle isn't compatible with this environment</li>
                        <li>Next.js initialization hooks aren't available in static HTML</li>
                        <li>There was an error during React component initialization</li>
                      </ul>
                      <p>See the Direct HTML implementation below for a working dashboard.</p>
                    </div>
                  `;
                }
              }, 1000);
            }
          }
        } catch (e) {
          console.error('Dashboard bridge: Error setting up React dashboard:', e);
        }
        
        // 2. RENDER THE DIRECT HTML DASHBOARD
        const htmlDashboardContainer = document.getElementById('html-dashboard');
        if (htmlDashboardContainer) {
          try {
            // Create the dashboard with direct HTML - enforcing black on white
            const directDashboardContainer = document.createElement('div');
            directDashboardContainer.className = 'direct-html-dashboard';
            // Set explicit inline styles for black on white
            directDashboardContainer.style.cssText = `
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #000000;
              background-color: #ffffff;
              padding: 0;
              margin: 0;
              width: 100%;
            `;
            
            // Use a simpler HTML structure with explicit styling
            directDashboardContainer.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 15px;">
                <!-- Current Version Section -->
                <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px; background-color: #ffffff;">
                  <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #000000;">Current Version</h3>
                  <div style="color: #000000;">
                    <div style="margin-bottom: 8px; color: #000000;">
                      <span style="color: #000000;">Assigned to: </span>
                      <strong style="color: #000000;">${dashboardData.assignment.version}</strong>
                    </div>
                    <div style="color: #000000;">
                      <span style="color: #000000;">Canary percentage: </span>
                      <strong style="color: #000000;">${dashboardData.config.initialCanaryPercentage}%</strong>
                    </div>
                  </div>
                </div>
                
                <!-- Metrics Section -->
                <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                  <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">Metrics Comparison</h3>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <!-- Stable Metrics -->
                    <div style="padding: 15px; border-radius: 5px; border-top: 3px solid #4CAF50;">
                      <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 14px;">Stable Version</h4>
                      <ul style="list-style: none; margin: 0; padding: 0;" id="stable-metrics-list">
                        <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Pageviews:</span> <span>${dashboardData.metrics.stable.pageviews}</span></li>
                        <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Clicks:</span> <span>${dashboardData.metrics.stable.clicks}</span></li>
                        <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Errors:</span> <span>${dashboardData.metrics.stable.errors}</span></li>
                        <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Error Rate:</span> <span>${
                          dashboardData.metrics.stable.pageviews > 0 
                            ? ((dashboardData.metrics.stable.errors / dashboardData.metrics.stable.pageviews) * 100).toFixed(1) 
                            : '0.0'
                        }%</span></li>
                      </ul>
                    </div>
                    
                    <!-- Canary Metrics -->
                    <div style="padding: 15px; border-radius: 5px; border-top: 3px solid #FFC107;">
                      <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 14px;">Canary Version</h4>
                      <ul style="list-style: none; margin: 0; padding: 0;" id="canary-metrics-list">
                        <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Pageviews:</span> <span>${dashboardData.metrics.canary.pageviews}</span></li>
                        <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Clicks:</span> <span>${dashboardData.metrics.canary.clicks}</span></li>
                        <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Errors:</span> <span>${dashboardData.metrics.canary.errors}</span></li>
                        <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Error Rate:</span> <span>${
                          dashboardData.metrics.canary.pageviews > 0 
                            ? ((dashboardData.metrics.canary.errors / dashboardData.metrics.canary.pageviews) * 100).toFixed(1) 
                            : '0.0'
                        }%</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <!-- Events Section -->
                <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px; background-color: #ffffff;">
                  <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #000000;">Recent Events</h3>
                  <div id="events-list" style="color: #000000;">
                    ${dashboardData.metrics.events && dashboardData.metrics.events.length > 0 ? 
                      dashboardData.metrics.events.slice(0, 5).map(event => `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; color: #000000;">
                          <div style="font-weight: 500; color: #000000;">${event.event || 'Unknown Event'}</div>
                          <div style="color: #000000;">${new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                        </div>
                      `).join('') :
                      '<div style="text-align: center; padding: 10px 0; color: #000000;">No events recorded</div>'
                    }
                  </div>
                </div>
              </div>
            `;
            
            // Clear any previous content and add the new dashboard
            htmlDashboardContainer.innerHTML = '';
            htmlDashboardContainer.appendChild(directDashboardContainer);
            dashboardRendered = true;
            
            console.log('Dashboard bridge: Direct HTML dashboard rendered successfully');
          } catch(e) {
            console.error('Dashboard bridge: Error rendering direct HTML dashboard:', e);
            htmlDashboardContainer.innerHTML = `
              <div style="padding: 15px; color: #ff0000; background-color: #ffffff;">
                Error rendering HTML dashboard: ${e.message}
              </div>
            `;
          }
        }

        // Set up periodic refresh to update both dashboards
        setInterval(() => {
          if (window.canary) {
            // Update the dashboard data
            dashboardData.metrics = window.canary._metrics || dashboardData.metrics;
            dashboardData.assignment = window.canary._assignment || dashboardData.assignment;
            dashboardData.config = window.canary._config || dashboardData.config;
            
            // 1. UPDATE THE REACT DASHBOARD
            try {
              // Trigger React update via custom event and update function
              window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
              if (window.__NEXT_DASHBOARD_UPDATE__) {
                window.__NEXT_DASHBOARD_UPDATE__(dashboardData);
              }
            } catch(e) {
              console.error('Dashboard bridge: Error updating React dashboard:', e);
            }
            
            // 2. UPDATE THE DIRECT HTML DASHBOARD
            try {
              // Stable metrics update
              const stableMetricsList = document.getElementById('stable-metrics-list');
              if (stableMetricsList) {
                const stableMetrics = dashboardData.metrics.stable;
                const stableErrorRate = stableMetrics.pageviews > 0 
                  ? ((stableMetrics.errors / stableMetrics.pageviews) * 100).toFixed(1) 
                  : '0.0';
                
                stableMetricsList.innerHTML = `
                  <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Pageviews:</span> <span>${stableMetrics.pageviews}</span></li>
                  <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Clicks:</span> <span>${stableMetrics.clicks}</span></li>
                  <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Errors:</span> <span>${stableMetrics.errors}</span></li>
                  <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Error Rate:</span> <span>${stableErrorRate}%</span></li>
                `;
              }

              // Canary metrics update
              const canaryMetricsList = document.getElementById('canary-metrics-list');
              if (canaryMetricsList) {
                const canaryMetrics = dashboardData.metrics.canary;
                const canaryErrorRate = canaryMetrics.pageviews > 0 
                  ? ((canaryMetrics.errors / canaryMetrics.pageviews) * 100).toFixed(1) 
                  : '0.0';
                
                canaryMetricsList.innerHTML = `
                  <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Pageviews:</span> <span>${canaryMetrics.pageviews}</span></li>
                  <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Clicks:</span> <span>${canaryMetrics.clicks}</span></li>
                  <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Errors:</span> <span>${canaryMetrics.errors}</span></li>
                  <li style="margin-bottom: 5px;"><span style="font-weight: 500;">Error Rate:</span> <span>${canaryErrorRate}%</span></li>
                `;
              }

              // Events update
              const eventsList = document.getElementById('events-list');
              if (eventsList && dashboardData.metrics.events) {
                if (dashboardData.metrics.events.length > 0) {
                  eventsList.innerHTML = dashboardData.metrics.events.slice(0, 5).map(event => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; color: #000000;">
                      <div style="font-weight: 500; color: #000000;">${event.event || 'Unknown Event'}</div>
                      <div style="color: #000000;">${new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                    </div>
                  `).join('');
                } else {
                  eventsList.innerHTML = '<div style="text-align: center; padding: 10px 0; color: #000000;">No events recorded</div>';
                }
              }
            } catch(e) {
              console.error('Dashboard bridge: Error updating direct HTML dashboard:', e);
            }
          }
        }, 2000);
      }
    }, 500);
  });
})();
