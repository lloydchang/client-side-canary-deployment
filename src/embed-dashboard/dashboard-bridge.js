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
        
        // Ensure any existing content is removed first
        const existingDashboard = dashboardRoot.querySelector('.Dashboard_dashboard__FnfVe');
        if (existingDashboard) {
          existingDashboard.remove();
        }
        
        // Create dashboard container div
        const dashboardContainer = document.createElement('div');
        dashboardContainer.className = 'Dashboard_dashboard__FnfVe';
        dashboardContainer.innerHTML = `
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
        `;
        
        // Replace dashboard root content with our container
        dashboardRoot.appendChild(dashboardContainer);
        dashboardRendered = true;
        
        console.log('Dashboard bridge: Dashboard rendered with HTML', dashboardRoot);
        
        // Ensure the dashboard is visible by forcing display style
        dashboardRoot.style.display = 'block';
        dashboardContainer.style.display = 'block';
        
        // Ensure children are displayed too
        const dashboardChildren = dashboardContainer.querySelectorAll('*');
        dashboardChildren.forEach(child => {
          child.style.opacity = '1';
          child.style.visibility = 'visible';
        });
        
        // Log the rendered state to console for debugging
        console.log('Dashboard HTML structure:', dashboardRoot.innerHTML);

        // Periodically check if the dashboard is still visible and re-render if necessary
        setInterval(() => {
          const currentDashboard = dashboardRoot.querySelector('.Dashboard_dashboard__FnfVe');
          if (!currentDashboard || currentDashboard.children.length === 0) {
            console.log('Dashboard disappeared, re-rendering...');
            dashboardRoot.appendChild(dashboardContainer.cloneNode(true));
          }
        }, 1000);

        // Set up periodic refresh to update the dashboard
        setInterval(() => {
          if (window.canary) {
            // Update the dashboard data
            dashboardData.metrics = window.canary._metrics || dashboardData.metrics;
            dashboardData.assignment = window.canary._assignment || dashboardData.assignment;
            dashboardData.config = window.canary._config || dashboardData.config;
            
            // Find our dashboard container - it might have been replaced
            const currentDashboard = dashboardRoot.querySelector('.Dashboard_dashboard__FnfVe');
            if (!currentDashboard) {
              console.log('Dashboard element missing, re-rendering...');
              dashboardRoot.appendChild(dashboardContainer.cloneNode(true));
              return;
            }
            
            // Update the metrics values directly in the DOM
            try {
              // Stable metrics
              const stableMetricsList = currentDashboard.querySelector('.MetricsCard_stable__JZdAI .MetricsCard_list__vtaKw');
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
              const canaryMetricsList = currentDashboard.querySelector('.MetricsCard_canary__XRk5M .MetricsCard_list__vtaKw');
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
              const eventsList = currentDashboard.querySelector('.EventsList_eventsList__8HWLo');
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
              // If there's an error updating, try re-rendering the whole dashboard
              if (dashboardRendered) {
                console.log('Re-rendering dashboard after update error');
                dashboardRoot.innerHTML = '';
                dashboardRoot.appendChild(dashboardContainer.cloneNode(true));
              }
            }

            // Trigger the update event for any listeners
            try {
              window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
            } catch(e) {
              console.error('Dashboard bridge: Error triggering update event:', e);
            }
          }
        }, 2000);
      }
    }, 500);
  });
})();
