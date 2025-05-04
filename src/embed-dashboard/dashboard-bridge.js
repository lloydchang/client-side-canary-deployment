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
        
        // Insert dashboard CSS directly into the root element to ensure styling
        dashboardRoot.innerHTML = `
          <div class="Dashboard_dashboard__FnfVe">
            <h2 class="Dashboard_title__UZeKr">Canary Deployment Dashboard</h2>
            <div class="Dashboard_grid__OoIFh">
              <div class="Dashboard_section__6mn3y">
                <div class="VersionInfo_versionInfo__3S_vS">
                  <h3 class="VersionInfo_title__5FIZs">Current Version</h3>
                  <div class="VersionInfo_assignmentInfo__kvslh">
                    <div class="VersionInfo_version__acfZe">
                      <span>Assigned to: </span>
                      <strong>${dashboardData.assignment.version}</strong>
                    </div>
                    <div>
                      <span>Canary percentage: </span>
                      <strong>${dashboardData.config.initialCanaryPercentage}%</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div class="Dashboard_section__6mn3y">
                <h3>Metrics Comparison</h3>
                <div class="Dashboard_metricsGrid__i0BxR">
                  <div class="MetricsCard_card__vm_V4 MetricsCard_stable__JZdAI">
                    <h4 class="MetricsCard_title__bKslz">Stable Version</h4>
                    <ul class="MetricsCard_list__vtaKw">
                      <li><span class="MetricsCard_label__D_jWc">Pageviews:</span> ${dashboardData.metrics.stable.pageviews}</li>
                      <li><span class="MetricsCard_label__D_jWc">Clicks:</span> ${dashboardData.metrics.stable.clicks}</li>
                      <li><span class="MetricsCard_label__D_jWc">Errors:</span> ${dashboardData.metrics.stable.errors}</li>
                      <li><span class="MetricsCard_label__D_jWc">Error Rate:</span> ${
                        dashboardData.metrics.stable.pageviews > 0 
                          ? ((dashboardData.metrics.stable.errors / dashboardData.metrics.stable.pageviews) * 100).toFixed(1) 
                          : '0.0'
                      }%</li>
                    </ul>
                  </div>
                  <div class="MetricsCard_card__vm_V4 MetricsCard_canary__XRk5M">
                    <h4 class="MetricsCard_title__bKslz">Canary Version</h4>
                    <ul class="MetricsCard_list__vtaKw">
                      <li><span class="MetricsCard_label__D_jWc">Pageviews:</span> ${dashboardData.metrics.canary.pageviews}</li>
                      <li><span class="MetricsCard_label__D_jWc">Clicks:</span> ${dashboardData.metrics.canary.clicks}</li>
                      <li><span class="MetricsCard_label__D_jWc">Errors:</span> ${dashboardData.metrics.canary.errors}</li>
                      <li><span class="MetricsCard_label__D_jWc">Error Rate:</span> ${
                        dashboardData.metrics.canary.pageviews > 0 
                          ? ((dashboardData.metrics.canary.errors / dashboardData.metrics.canary.pageviews) * 100).toFixed(1) 
                          : '0.0'
                      }%</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="Dashboard_section__6mn3y">
                <h3>Recent Events</h3>
                <div class="EventsList_eventsList__8HWLo">
                  ${dashboardData.metrics.events && dashboardData.metrics.events.length > 0 ? 
                    dashboardData.metrics.events.slice(0, 5).map(event => `
                      <div class="EventsList_eventItem__QVOa1">
                        <div class="EventsList_eventType__24JCD">${event.event || 'Unknown Event'}</div>
                        <div class="EventsList_eventTime__2zAvi">${new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                      </div>
                    `).join('') :
                    '<div class="EventsList_empty__spL87">No events recorded</div>'
                  }
                </div>
              </div>
            </div>
          </div>
        `;
        
        console.log('Dashboard bridge: Dashboard rendered directly with HTML');

        // Set up periodic refresh to update the dashboard
        setInterval(() => {
          if (window.canary) {
            // Update the dashboard data
            dashboardData.metrics = window.canary._metrics || dashboardData.metrics;
            dashboardData.assignment = window.canary._assignment || dashboardData.assignment;
            dashboardData.config = window.canary._config || dashboardData.config;
            
            // Update the metrics values directly in the DOM
            try {
              // Stable metrics
              const stableMetricsList = dashboardRoot.querySelector('.MetricsCard_stable__JZdAI .MetricsCard_list__vtaKw');
              if (stableMetricsList) {
                const stableMetrics = dashboardData.metrics.stable;
                const stableErrorRate = stableMetrics.pageviews > 0 
                  ? ((stableMetrics.errors / stableMetrics.pageviews) * 100).toFixed(1) 
                  : '0.0';
                
                stableMetricsList.innerHTML = `
                  <li><span class="MetricsCard_label__D_jWc">Pageviews:</span> ${stableMetrics.pageviews}</li>
                  <li><span class="MetricsCard_label__D_jWc">Clicks:</span> ${stableMetrics.clicks}</li>
                  <li><span class="MetricsCard_label__D_jWc">Errors:</span> ${stableMetrics.errors}</li>
                  <li><span class="MetricsCard_label__D_jWc">Error Rate:</span> ${stableErrorRate}%</li>
                `;
              }

              // Canary metrics
              const canaryMetricsList = dashboardRoot.querySelector('.MetricsCard_canary__XRk5M .MetricsCard_list__vtaKw');
              if (canaryMetricsList) {
                const canaryMetrics = dashboardData.metrics.canary;
                const canaryErrorRate = canaryMetrics.pageviews > 0 
                  ? ((canaryMetrics.errors / canaryMetrics.pageviews) * 100).toFixed(1) 
                  : '0.0';
                
                canaryMetricsList.innerHTML = `
                  <li><span class="MetricsCard_label__D_jWc">Pageviews:</span> ${canaryMetrics.pageviews}</li>
                  <li><span class="MetricsCard_label__D_jWc">Clicks:</span> ${canaryMetrics.clicks}</li>
                  <li><span class="MetricsCard_label__D_jWc">Errors:</span> ${canaryMetrics.errors}</li>
                  <li><span class="MetricsCard_label__D_jWc">Error Rate:</span> ${canaryErrorRate}%</li>
                `;
              }

              // Events
              const eventsList = dashboardRoot.querySelector('.EventsList_eventsList__8HWLo');
              if (eventsList && dashboardData.metrics.events) {
                if (dashboardData.metrics.events.length > 0) {
                  eventsList.innerHTML = dashboardData.metrics.events.slice(0, 5).map(event => `
                    <div class="EventsList_eventItem__QVOa1">
                      <div class="EventsList_eventType__24JCD">${event.event || 'Unknown Event'}</div>
                      <div class="EventsList_eventTime__2zAvi">${new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                    </div>
                  `).join('');
                } else {
                  eventsList.innerHTML = '<div class="EventsList_empty__spL87">No events recorded</div>';
                }
              }
              
              console.log('Dashboard bridge: Dashboard updated with new data');
            } catch(e) {
              console.error('Dashboard bridge: Error updating UI:', e);
            }

            // Trigger the update event that React components might listen for
            try {
              window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
              if (window.__NEXT_DASHBOARD_UPDATE__) {
                window.__NEXT_DASHBOARD_UPDATE__(dashboardData);
              }
            } catch(e) {
              console.error('Dashboard bridge: Error triggering update event:', e);
            }
          }
        }, 2000);
      }
    }, 500);
  });
})();
