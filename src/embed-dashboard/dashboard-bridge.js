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
          <h3 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000;">
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
          <h3 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000;">
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
            // Create the dashboard with direct HTML - using black text on white background
            const directDashboardContainer = document.createElement('div');
            directDashboardContainer.className = 'Dashboard_dashboard__FnfVe';
            directDashboardContainer.style.backgroundColor = '#fff';
            directDashboardContainer.style.color = '#000';
            directDashboardContainer.innerHTML = `
              <div class="Dashboard_grid__OoIFh">
                <div class="Dashboard_section__6mn3y" style="background-color: #fff; color: #000;">
                  <div>
                    <h3 style="color: #000; margin-top: 0;">Current Version</h3>
                    <div>
                      <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span>Assigned to: </span>
                        <strong style="margin-left: 5px;">${dashboardData.assignment.version}</strong>
                      </div>
                      <div>
                        <span>Canary percentage: </span>
                        <strong>${dashboardData.config.initialCanaryPercentage}%</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="Dashboard_section__6mn3y" style="background-color: #fff; color: #000;">
                  <h3 style="color: #000; margin-top: 0;">Metrics Comparison</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="border-radius: 5px; padding: 15px; background: #fff; border: 1px solid #ccc; color: #000;">
                      <h4 style="margin: 0 0 10px 0; color: #000;">Stable Version</h4>
                      <ul style="list-style: none; margin: 0; padding: 0; color: #000;">
                        <li><span style="font-weight: 500; margin-right: 5px;">Pageviews:</span> ${dashboardData.metrics.stable.pageviews}</li>
                        <li><span style="font-weight: 500; margin-right: 5px;">Clicks:</span> ${dashboardData.metrics.stable.clicks}</li>
                        <li><span style="font-weight: 500; margin-right: 5px;">Errors:</span> ${dashboardData.metrics.stable.errors}</li>
                        <li><span style="font-weight: 500; margin-right: 5px;">Error Rate:</span> ${
                          dashboardData.metrics.stable.pageviews > 0 
                            ? ((dashboardData.metrics.stable.errors / dashboardData.metrics.stable.pageviews) * 100).toFixed(1) 
                            : '0.0'
                        }%</li>
                      </ul>
                    </div>
                    <div style="border-radius: 5px; padding: 15px; background: #fff; border: 1px solid #ccc; color: #000;">
                      <h4 style="margin: 0 0 10px 0; color: #000;">Canary Version</h4>
                      <ul style="list-style: none; margin: 0; padding: 0; color: #000;">
                        <li><span style="font-weight: 500; margin-right: 5px;">Pageviews:</span> ${dashboardData.metrics.canary.pageviews}</li>
                        <li><span style="font-weight: 500; margin-right: 5px;">Clicks:</span> ${dashboardData.metrics.canary.clicks}</li>
                        <li><span style="font-weight: 500; margin-right: 5px;">Errors:</span> ${dashboardData.metrics.canary.errors}</li>
                        <li><span style="font-weight: 500; margin-right: 5px;">Error Rate:</span> ${
                          dashboardData.metrics.canary.pageviews > 0 
                            ? ((dashboardData.metrics.canary.errors / dashboardData.metrics.canary.pageviews) * 100).toFixed(1) 
                            : '0.0'
                        }%</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="Dashboard_section__6mn3y" style="background-color: #fff; color: #000;">
                  <h3 style="color: #000; margin-top: 0;">Recent Events</h3>
                  <div style="color: #000;">
                    ${dashboardData.metrics.events && dashboardData.metrics.events.length > 0 ? 
                      dashboardData.metrics.events.slice(0, 5).map(event => `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; color: #000;">
                          <div style="font-weight: 500; color: #000;">${event.event || 'Unknown Event'}</div>
                          <div style="color: #000;">${new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                        </div>
                      `).join('') :
                      '<div style="text-align: center; padding: 10px 0; color: #000;">No events recorded</div>'
                    }
                  </div>
                </div>
              </div>
            `;
            
            // Add our direct HTML dashboard to its container
            htmlDashboardContainer.appendChild(directDashboardContainer);
            dashboardRendered = true;
            
            console.log('Dashboard bridge: Direct HTML dashboard rendered');
          } catch(e) {
            console.error('Dashboard bridge: Error rendering direct HTML dashboard:', e);
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
              const htmlDashboardContainer = document.getElementById('html-dashboard');
              if (htmlDashboardContainer) {
                const directDashboard = htmlDashboardContainer.querySelector('.Dashboard_dashboard__FnfVe');
                if (directDashboard) {
                  // Stable metrics update
                  const stableMetricsList = directDashboard.querySelector('div:nth-child(2) > div > div:first-child > ul');
                  if (stableMetricsList) {
                    const stableMetrics = dashboardData.metrics.stable;
                    const stableErrorRate = stableMetrics.pageviews > 0 
                      ? ((stableMetrics.errors / stableMetrics.pageviews) * 100).toFixed(1) 
                      : '0.0';
                    
                    stableMetricsList.innerHTML = `
                      <li><span style="font-weight: 500; margin-right: 5px;">Pageviews:</span> ${stableMetrics.pageviews}</li>
                      <li><span style="font-weight: 500; margin-right: 5px;">Clicks:</span> ${stableMetrics.clicks}</li>
                      <li><span style="font-weight: 500; margin-right: 5px;">Errors:</span> ${stableMetrics.errors}</li>
                      <li><span style="font-weight: 500; margin-right: 5px;">Error Rate:</span> ${stableErrorRate}%</li>
                    `;
                  }

                  // Canary metrics update
                  const canaryMetricsList = directDashboard.querySelector('div:nth-child(2) > div > div:last-child > ul');
                  if (canaryMetricsList) {
                    const canaryMetrics = dashboardData.metrics.canary;
                    const canaryErrorRate = canaryMetrics.pageviews > 0 
                      ? ((canaryMetrics.errors / canaryMetrics.pageviews) * 100).toFixed(1) 
                      : '0.0';
                    
                    canaryMetricsList.innerHTML = `
                      <li><span style="font-weight: 500; margin-right: 5px;">Pageviews:</span> ${canaryMetrics.pageviews}</li>
                      <li><span style="font-weight: 500; margin-right: 5px;">Clicks:</span> ${canaryMetrics.clicks}</li>
                      <li><span style="font-weight: 500; margin-right: 5px;">Errors:</span> ${canaryMetrics.errors}</li>
                      <li><span style="font-weight: 500; margin-right: 5px;">Error Rate:</span> ${canaryErrorRate}%</li>
                    `;
                  }

                  // Events update
                  const eventsSection = directDashboard.querySelector('div:nth-child(3) > div');
                  if (eventsSection && dashboardData.metrics.events) {
                    if (dashboardData.metrics.events.length > 0) {
                      eventsSection.innerHTML = dashboardData.metrics.events.slice(0, 5).map(event => `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; color: #000;">
                          <div style="font-weight: 500; color: #000;">${event.event || 'Unknown Event'}</div>
                          <div style="color: #000;">${new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                        </div>
                      `).join('');
                    } else {
                      eventsSection.innerHTML = '<div style="text-align: center; padding: 10px 0; color: #000;">No events recorded</div>';
                    }
                  }
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
