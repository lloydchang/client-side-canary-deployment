import { useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';

export default function CanaryPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize canary
      if (window.canary) {
        try {
          window.canary.init({
            posthogEnabled: true,
            posthogApiKey: 'phc_dI0DmYHs1qJu7tZRfdaAxw7GqmvUMinb1VHnBnA9LlR',
            version: 'canary'
          });
        } catch (e) {
          console.error('Error initializing canary:', e);
        }
      }
      
      // Set up event handlers after DOM is loaded
      setTimeout(() => {
        // Initialize version switcher
        if (window.VersionSwitcher) {
          try {
            window.versionSwitcher = new window.VersionSwitcher({
              onVersionSwitch: function(newVersion) {
                if (window.canary && window.canary.trackEvent) {
                  window.canary.trackEvent('manual_version_switch', {
                    fromVersion: 'canary',
                    toVersion: newVersion,
                  });
                }
              }
            });
          } catch (e) {
            console.error('Error initializing version switcher:', e);
          }
        }

        // Display feature flags
        const displayFeatureFlags = () => {
          const featureList = document.getElementById('feature-list');
          if (featureList && window.CanaryConfig && window.CanaryConfig.featureFlags) {
            featureList.innerHTML = '';
            
            for (const [name, enabled] of Object.entries(window.CanaryConfig.featureFlags)) {
              const item = document.createElement('li');
              item.className = 'feature-item';
              item.innerHTML = `
                <span class="${enabled ? 'feature-enabled' : 'feature-disabled'}">
                  ${enabled ? '✓' : '✗'} ${name}
                </span>
              `;
              featureList.appendChild(item);
            }
          }
        };

        // Call display feature flags
        displayFeatureFlags();

        // Set up button handlers
        const trackClickBtn = document.getElementById('track-click');
        if (trackClickBtn) {
          trackClickBtn.addEventListener('click', function() {
            if (window.canary && window.canary.trackEvent) {
              window.canary.trackEvent('button_click', {
                button: 'track-click',
                version: 'canary'
              });
              alert('Event tracked in canary version!');
            }
          });
        }

        const simulateErrorBtn = document.getElementById('simulate-error');
        if (simulateErrorBtn) {
          simulateErrorBtn.addEventListener('click', function() {
            if (window.canary && window.canary.trackEvent) {
              window.canary.trackEvent('simulated_error_triggered', {
                type: 'user_initiated'
              });
              try {
                throw new Error('Simulated canary testing error');
              } catch (error) {
                alert('Simulated error tracked! Check the console.');
                console.error('Simulated error for canary testing:', error);
              }
            }
          });
        }

        const showMetricsBtn = document.getElementById('show-metrics');
        if (showMetricsBtn) {
          showMetricsBtn.addEventListener('click', function() {
            const output = document.getElementById('metrics-output');
            if (window.canary) {
              const metrics = window.canary._metrics;
              const posthogStatus = window.canary._posthogBlocked ? 
                'BLOCKED' : 'Working';
              
              output.innerHTML = 
                '<h3>Metrics</h3>' +
                '<p><strong>PostHog Status:</strong> ' + posthogStatus + '</p>' +
                '<h4>Stable Version:</h4>' +
                '<ul>' +
                  '<li>Pageviews: ' + metrics.stable.pageviews + '</li>' +
                  '<li>Errors: ' + metrics.stable.errors + '</li>' +
                  '<li>Clicks: ' + metrics.stable.clicks + '</li>' +
                '</ul>' +
                '<h4>Canary Version:</h4>' +
                '<ul>' +
                  '<li>Pageviews: ' + metrics.canary.pageviews + '</li>' +
                  '<li>Errors: ' + metrics.canary.errors + '</li>' +
                  '<li>Clicks: ' + metrics.canary.clicks + '</li>' +
                '</ul>' +
                '<h4>Last ' + (metrics.events ? metrics.events.length : 0) + ' Events:</h4>' +
                '<pre>' + JSON.stringify(metrics.events, null, 2) + '</pre>';
            } else {
              output.textContent = 'Analytics not available';
            }
            
            output.style.display = output.style.display === 'none' ? 'block' : 'none';
          });
        }

        // Track canary page view
        if (window.canary && window.canary.trackEvent) {
          window.canary.trackEvent('page_view', {
            page: 'canary_home'
          });
        }
      }, 500);
    }
  }, []);

  return (
    <>
      <Head>
        <title>Canary Version</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Load scripts */}
      <Script src="/src/canary.js" strategy="beforeInteractive" />
      <Script src="/src/analytics.js" strategy="beforeInteractive" />
      <Script src="/src/components/version-switcher.js" strategy="beforeInteractive" />
      <Script src="/src/config/canary-config.js" strategy="beforeInteractive" />
      <Script src="/src/embed-dashboard/dashboard.js" strategy="beforeInteractive" />
      <Script src="/src/embed-dashboard/dashboard-bridge.js" strategy="beforeInteractive" />

      <div className="container">
        <h1>Canary Version</h1>
        <p>This is the canary version of the application with red text on black background.</p>
        
        <div className="card">
          <h2>About This Application</h2>
          <p>This demonstrates client-side canary deployment functionality. You can switch back to the stable version using the Version Switcher in the bottom right corner.</p>
          
          <h3>Enabled Features:</h3>
          <ul id="feature-list" className="feature-list"></ul>
        </div>
        
        <div className="card">
          <h2>Test Controls</h2>
          <button id="track-click">Track Click</button>
          <button id="simulate-error">Simulate Error</button>
          <button id="show-metrics">Show Metrics</button>
          <pre id="metrics-output" style={{ display: 'none' }}></pre>
        </div>
        
        {/* Dashboard Container */}
        <div className="card">
          <h2>Dashboard</h2>
          <div id="dashboard-root" style={{ margin: '10px 0' }}></div>
        </div>
        
        {/* Add version footer */}
        <div className="footer">
          <p>Version: <span id="app-version">Loading...</span> | Last Updated: <span id="last-updated">Loading...</span></p>
        </div>
      </div>

      {/* Add styles */}
      <style jsx global>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: black;
          color: red;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        h1, h2, h3 {
          color: #ff5555;
          margin-top: 0;
        }
        
        .card {
          border: 1px solid #500;
          border-radius: 4px;
          padding: 16px;
          margin-bottom: 16px;
          background-color: #1a0000;
        }
        
        button {
          background-color: #800;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 8px;
        }
        
        button:hover {
          background-color: #a00;
        }
        
        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .feature-item {
          padding: 5px 0;
          display: flex;
          align-items: center;
        }
        
        .feature-enabled {
          color: #00ff00;
        }
        
        .feature-disabled {
          color: #ff5555;
        }
        
        pre {
          background-color: #300;
          color: #f55;
          padding: 10px;
          border-radius: 4px;
          overflow: auto;
        }
        
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          margin-left: 8px;
          background-color: #f00;
          color: #fff;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          padding: 20px;
          color: #ff5555;
          font-size: 14px;
          border-top: 1px solid #500;
        }
      `}</style>
    </>
  );
}
