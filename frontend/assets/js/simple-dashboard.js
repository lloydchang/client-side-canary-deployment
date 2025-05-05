/**
 * Simple Dashboard Component
 * Vanilla JS replacement for the React dashboard
 */

(function(window) {
  'use strict';
  
  const simpleDashboard = {
    /**
     * Initialize the dashboard
     * @param {HTMLElement} container - Container element
     * @param {Object} canary - Canary instance
     */
    init: function(container, canary) {
      if (!container) {
        console.error('Dashboard container element is required');
        return;
      }
      
      if (!canary) {
        console.error('Canary instance is required');
        return;
      }
      
      this.container = container;
      this.canary = canary;
      
      // Render initial dashboard
      this.render();
      
      // Set up periodic refresh
      this.setupRefresh();
    },
    
    /**
     * Set up periodic refresh of dashboard data
     */
    setupRefresh: function() {
      const self = this;
      setInterval(function() {
        self.render();
      }, 5000);
    },
    
    /**
     * Render the dashboard
     */
    render: function() {
      const metrics = this.canary._metrics || {
        stable: { pageviews: 0, errors: 0, clicks: 0 },
        canary: { pageviews: 0, errors: 0, clicks: 0 },
        events: []
      };
      
      const assignment = this.canary._assignment || {
        version: 'stable',
        timestamp: new Date().toISOString()
      };
      
      const config = this.canary._config || {
        initialCanaryPercentage: 5
      };
      
      const stableMetrics = metrics.stable;
      const canaryMetrics = metrics.canary;
      
      const stableErrorRate = stableMetrics.pageviews > 0 
        ? ((stableMetrics.errors / stableMetrics.pageviews) * 100).toFixed(1) 
        : '0.0';
      
      const canaryErrorRate = canaryMetrics.pageviews > 0 
        ? ((canaryMetrics.errors / canaryMetrics.pageviews) * 100).toFixed(1) 
        : '0.0';
      
      // Create HTML for the dashboard
      let html = `
        <div class="dashboard">
          <div class="dashboard-section">
            <h3>Current Version</h3>
            <div class="dashboard-card">
              <div class="dashboard-row">
                <strong>Assigned to:</strong> ${assignment.version}
              </div>
              <div class="dashboard-row">
                <strong>Canary percentage:</strong> ${config.initialCanaryPercentage}%
              </div>
            </div>
          </div>
          
          <div class="dashboard-section">
            <h3>Metrics Comparison</h3>
            <div class="dashboard-card">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Stable Version</th>
                    <th>Canary Version</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Pageviews</td>
                    <td>${stableMetrics.pageviews}</td>
                    <td>${canaryMetrics.pageviews}</td>
                  </tr>
                  <tr>
                    <td>Clicks</td>
                    <td>${stableMetrics.clicks}</td>
                    <td>${canaryMetrics.clicks}</td>
                  </tr>
                  <tr>
                    <td>Errors</td>
                    <td>${stableMetrics.errors}</td>
                    <td>${canaryMetrics.errors}</td>
                  </tr>
                  <tr>
                    <td>Error Rate</td>
                    <td>${stableErrorRate}%</td>
                    <td>${canaryErrorRate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="dashboard-section">
            <h3>Recent Events</h3>
            <div class="dashboard-card">
              <div class="events-list">
      `;
      
      // Add events if available
      if (metrics.events && metrics.events.length > 0) {
        metrics.events.slice(0, 5).forEach(event => {
          const eventTime = new Date(event.timestamp || Date.now()).toLocaleTimeString();
          html += `
            <div class="event-item">
              <div class="event-name">${event.name || event.event || event.type || 'Unknown Event'}</div>
              <div class="event-time">${eventTime}</div>
            </div>
          `;
        });
      } else {
        html += `<div class="no-events">No events recorded</div>`;
      }
      
      html += `
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Update the container
      this.container.innerHTML = html;
    }
  };
  
  // Make available globally
  window.simpleDashboard = simpleDashboard;
})(window);
