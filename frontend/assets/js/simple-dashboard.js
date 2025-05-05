/**
 * Simple Dashboard Module
 * 
 * A vanilla JavaScript alternative to the React dashboard component
 * for displaying canary deployment metrics.
 */

(function(window) {
  'use strict';
  
  // Create dashboard object
  const simpleDashboard = {
    // Store reference to container element and canary instance
    _root: null,
    _canary: null,
    _updateInterval: null,
    
    /**
     * Initialize the dashboard
     * @param {HTMLElement} rootElement - The container element
     * @param {Object} canary - The canary instance
     */
    init: function(rootElement, canary) {
      if (!rootElement) {
        console.error('Dashboard root element is required');
        return;
      }
      
      this._root = rootElement;
      this._canary = canary;
      
      // Initial render
      this.render();
      
      // Set up periodic updates
      this._updateInterval = setInterval(() => this.render(), 5000);
      
      console.log('Simple dashboard initialized');
    },
    
    /**
     * Destroy the dashboard
     */
    destroy: function() {
      if (this._updateInterval) {
        clearInterval(this._updateInterval);
      }
    },
    
    /**
     * Render the dashboard content
     */
    render: function() {
      if (!this._root || !this._canary) return;
      
      // Get data from canary
      const metrics = this._canary._metrics || {
        stable: { pageviews: 0, errors: 0, clicks: 0 },
        canary: { pageviews: 0, errors: 0, clicks: 0 }
      };
      
      // Get version assignment
      const assignment = this._canary._assignment || { version: 'unknown' };
      
      // Calculate derived metrics
      const stableErrorRate = metrics.stable.pageviews > 0 ? 
        ((metrics.stable.errors / metrics.stable.pageviews) * 100).toFixed(2) : '0.00';
      const canaryErrorRate = metrics.canary.pageviews > 0 ? 
        ((metrics.canary.errors / metrics.canary.pageviews) * 100).toFixed(2) : '0.00';
      
      // Create dashboard HTML
      this._root.innerHTML = `
        <div class="simple-dashboard">
          <div class="dashboard-header">
            <h3>Deployment Metrics</h3>
            <div class="dashboard-legend">
              <span class="legend-item stable-legend">■ Stable</span>
              <span class="legend-item canary-legend">■ Canary</span>
            </div>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-title">Page Views</div>
              <div class="metric-values">
                <div class="metric-value stable">${metrics.stable.pageviews}</div>
                <div class="metric-value canary">${metrics.canary.pageviews}</div>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Errors</div>
              <div class="metric-values">
                <div class="metric-value stable">${metrics.stable.errors}</div>
                <div class="metric-value canary">${metrics.canary.errors}</div>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Error Rate</div>
              <div class="metric-values">
                <div class="metric-value stable">${stableErrorRate}%</div>
                <div class="metric-value canary">${canaryErrorRate}%</div>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Clicks</div>
              <div class="metric-values">
                <div class="metric-value stable">${metrics.stable.clicks}</div>
                <div class="metric-value canary">${metrics.canary.clicks}</div>
              </div>
            </div>
          </div>
          
          <div class="dashboard-footer">
            <div class="user-assignment">
              You are currently assigned to: <span class="assignment ${assignment.version}">${assignment.version}</span>
            </div>
          </div>
        </div>
      `;
    }
  };
  
  // Make available globally
  window.simpleDashboard = simpleDashboard;
})(window);
