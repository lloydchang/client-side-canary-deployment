/**
 * Dashboard Bridge
 * 
 * This script creates and updates a simple HTML dashboard for the canary system.
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

    console.log('Dashboard bridge: Setting up dashboard container');

    // Create a simple container for the HTML dashboard
    dashboardRoot.innerHTML = `
      <div style="width: 100%; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
        <h3 style="margin: 0; padding: 10px; background-color: #f5f5f5; color: #000; font-size: 16px; border-bottom: 1px solid #ddd;">
          Deployment Metrics Dashboard
        </h3>
        <div id="html-dashboard" style="padding: 15px; background-color: #fff;"></div>
      </div>
    `;

    console.log('Dashboard bridge: Waiting for canary data...');
    
    // Function to attempt dashboard initialization
    function attemptDashboardInit() {
      if (!window.canary) {
        setTimeout(attemptDashboardInit, 500);
        return;
      }
      
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
      window.dashboardData = JSON.parse(JSON.stringify(dashboardData));
      
      // RENDER THE HTML DASHBOARD
      renderHtmlDashboard(dashboardData);
      
      // Set up periodic refresh to update the dashboard
      setupPeriodicRefresh();
    }
    
    // Function to render HTML dashboard
    function renderHtmlDashboard(dashboardData) {
      const htmlDashboardContainer = document.getElementById('html-dashboard');
      if (!htmlDashboardContainer) return;
      
      try {
        // Create the dashboard with direct HTML - enforcing black on white
        const directDashboardContainer = document.createElement('div');
        directDashboardContainer.className = 'html-dashboard';
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
              
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="text-align: left; padding: 8px; width: 25%;">Metric</th>
                    <th style="text-align: left; padding: 8px;">Stable Version</th>
                    <th style="text-align: left; padding: 8px;">Canary Version</th>
                  </tr>
                </thead>
                <tbody id="metrics-comparison-table">
                  <tr>
                    <td style="padding: 8px; border-top: 1px solid #eee;">Pageviews</td>
                    <td style="padding: 8px; border-top: 1px solid #eee;">${dashboardData.metrics.stable.pageviews}</td>
                    <td style="padding: 8px; border-top: 1px solid #eee;">${dashboardData.metrics.canary.pageviews}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-top: 1px solid #eee;">Clicks</td>
                    <td style="padding: 8px; border-top: 1px solid #eee;">${dashboardData.metrics.stable.clicks}</td>
                    <td style="padding: 8px; border-top: 1px solid #eee;">${dashboardData.metrics.canary.clicks}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-top: 1px solid #eee;">Errors</td>
                    <td style="padding: 8px; border-top: 1px solid #eee;">${dashboardData.metrics.stable.errors}</td>
                    <td style="padding: 8px; border-top: 1px solid #eee;">${dashboardData.metrics.canary.errors}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-top: 1px solid #eee;">Error Rate</td>
                    <td style="padding: 8px; border-top: 1px solid #eee;">${
                      dashboardData.metrics.stable.pageviews > 0 
                        ? ((dashboardData.metrics.stable.errors / dashboardData.metrics.stable.pageviews) * 100).toFixed(1) 
                        : '0.0'
                    }%</td>
                    <td style="padding: 8px; border-top: 1px solid #eee;">${
                      dashboardData.metrics.canary.pageviews > 0 
                        ? ((dashboardData.metrics.canary.errors / dashboardData.metrics.canary.pageviews) * 100).toFixed(1) 
                        : '0.0'
                    }%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Events Section -->
            <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px; background-color: #ffffff;">
              <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #000000;">Recent Events</h3>
              <div id="events-list" style="color: #000000;">
                ${dashboardData.metrics.events && dashboardData.metrics.events.length > 0 ? 
                  dashboardData.metrics.events.slice(0, 5).map(event => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; color: #000000;">
                      <div style="font-weight: 500; color: #000000;">${event.event || event.type || 'Unknown Event'}</div>
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
        
        console.log('Dashboard bridge: HTML dashboard rendered successfully');
      } catch(e) {
        console.error('Dashboard bridge: Error rendering HTML dashboard:', e);
        htmlDashboardContainer.innerHTML = `
          <div style="padding: 15px; color: #ff0000; background-color: #ffffff;">
            Error rendering HTML dashboard: ${e.message}
          </div>
        `;
      }
    }
    
    // Function to setup periodic refresh
    function setupPeriodicRefresh() {
      setInterval(() => {
        if (window.canary) {
          // Update the dashboard data
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
          
          // UPDATE THE HTML DASHBOARD
          try {
            // Update the metrics comparison table
            const metricsTable = document.getElementById('metrics-comparison-table');
            if (metricsTable) {
              const stableMetrics = dashboardData.metrics.stable;
              const canaryMetrics = dashboardData.metrics.canary;
              const stableErrorRate = stableMetrics.pageviews > 0 
                ? ((stableMetrics.errors / stableMetrics.pageviews) * 100).toFixed(1) 
                : '0.0';
              const canaryErrorRate = canaryMetrics.pageviews > 0 
                ? ((canaryMetrics.errors / canaryMetrics.pageviews) * 100).toFixed(1) 
                : '0.0';
              
              metricsTable.innerHTML = `
                <tr>
                  <td style="padding: 8px; border-top: 1px solid #eee;">Pageviews</td>
                  <td style="padding: 8px; border-top: 1px solid #eee;">${stableMetrics.pageviews}</td>
                  <td style="padding: 8px; border-top: 1px solid #eee;">${canaryMetrics.pageviews}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-top: 1px solid #eee;">Clicks</td>
                  <td style="padding: 8px; border-top: 1px solid #eee;">${stableMetrics.clicks}</td>
                  <td style="padding: 8px; border-top: 1px solid #eee;">${canaryMetrics.clicks}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-top: 1px solid #eee;">Errors</td>
                  <td style="padding: 8px; border-top: 1px solid #eee;">${stableMetrics.errors}</td>
                  <td style="padding: 8px; border-top: 1px solid #eee;">${canaryMetrics.errors}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-top: 1px solid #eee;">Error Rate</td>
                  <td style="padding: 8px; border-top: 1px solid #eee;">${stableErrorRate}%</td>
                  <td style="padding: 8px; border-top: 1px solid #eee;">${canaryErrorRate}%</td>
                </tr>
              `;
            }

            // Events update
            const eventsList = document.getElementById('events-list');
            if (eventsList && dashboardData.metrics.events) {
              if (dashboardData.metrics.events.length > 0) {
                eventsList.innerHTML = dashboardData.metrics.events.slice(0, 5).map(event => `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; color: #000000;">
                    <div style="font-weight: 500; color: #000000;">${event.event || event.type || 'Unknown Event'}</div>
                    <div style="color: #000000;">${new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                  </div>
                `).join('');
              } else {
                eventsList.innerHTML = '<div style="text-align: center; padding: 10px 0; color: #000000;">No events recorded</div>';
              }
            }
          } catch(e) {
            console.error('Dashboard bridge: Error updating HTML dashboard:', e);
          }
        }
      }, 2000);
    }
    
    // Start initialization process
    attemptDashboardInit();
  });
})();
