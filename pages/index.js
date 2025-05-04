import { useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';

export default function Home() {
  useEffect(() => {
    // Initialize canary after the scripts are loaded
    if (typeof window !== 'undefined') {
      if (window.canary) {
        try {
          window.canary.init({
            initialCanaryPercentage: 5,
            posthogEnabled: true,
            posthogApiKey: 'phc_dI0DmYHs1qJu7tZRfdaAxw7GqmvUMinb1VHnBnA9LlR'
          });
          console.log('Canary initialized on page load');
        } catch (e) {
          console.error('Failed to initialize canary on page load:', e);
        }
      }

      // Set up version checker
      const checkForUpdates = async () => {
        try {
          const response = await fetch('version.json?nocache=' + new Date().getTime());
          if (!response.ok) return;
          
          const data = await response.json();
          const currentVersion = localStorage.getItem('app-version');
          
          // Update version display elements
          const versionElement = document.getElementById('app-version');
          const lastUpdatedElement = document.getElementById('last-updated');
          
          if (versionElement) {
            versionElement.textContent = data.version;
          }
          
          if (lastUpdatedElement && data.lastUpdated) {
            try {
              const date = new Date(data.lastUpdated);
              const options = { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
              };
              
              lastUpdatedElement.textContent = date.toLocaleString(undefined, options);
            } catch (err) {
              console.error('Error formatting date:', err);
              lastUpdatedElement.textContent = data.lastUpdated;
            }
          }
          
          if (currentVersion && currentVersion !== data.version) {
            console.log('New version detected, refreshing page...');
            localStorage.setItem('app-version', data.version);
            window.location.reload(true);
          } else {
            localStorage.setItem('app-version', data.version);
          }
        } catch (err) {
          console.error('Failed to check for updates:', err);
        }
      };
      
      // Check for updates and setup countdown
      checkForUpdates();
      setInterval(checkForUpdates, 5 * 60 * 1000);
      
      // Set up countdown redirector
      setTimeout(() => {
        const countdownElement = document.getElementById('countdown-number');
        const assignedVersionText = document.getElementById('assigned-version-text');
        
        if (countdownElement) {
          // Start with 10 seconds
          let secondsLeft = 10;
          countdownElement.textContent = secondsLeft;
          
          // Determine the target version
          let targetVersion = 'stable'; // Default to stable
          
          if (window.canary && window.canary._assignment && window.canary._assignment.version) {
            targetVersion = window.canary._assignment.version;
          }
          
          // Update version text
          if (assignedVersionText) {
            assignedVersionText.textContent = targetVersion + ' version';
          }
          
          // Start countdown
          const countdownInterval = setInterval(function() {
            secondsLeft--;
            countdownElement.textContent = secondsLeft.toString();
            
            if (secondsLeft <= 0) {
              clearInterval(countdownInterval);
              window.location.href = targetVersion + '/';
            }
          }, 1000);
        }
      }, 500);
    }
  }, []);

  return (
    <>
      <Head>
        <title>Client-Side Canary Deployment</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Load scripts */}
      <Script src="/src/canary.js" strategy="beforeInteractive" />
      <Script src="/src/analytics.js" strategy="beforeInteractive" />
      <Script src="/src/components/version-switcher.js" strategy="beforeInteractive" />
      <Script src="/src/embed-dashboard/dashboard.js" strategy="beforeInteractive" />
      <Script src="/src/embed-dashboard/dashboard-bridge.js" strategy="beforeInteractive" />
      
      <div className="container">
        <div className="card">
          <h1>Client-Side Canary Deployment</h1>
          <p>Welcome to the demonstration of client-side canary deployment.</p>
          <p>This system enables you to:</p>
          <ul>
            <li>Deploy new features to a subset of users</li>
            <li>Track metrics and performance differences between versions</li>
          </ul>
          
          <div className="button-container">
            <a href="stable/" className="button">Visit Stable Version</a>
            <a href="canary/" className="button button-outline">Visit Canary Version</a>
          </div>
          
          <div className="button-container">
            <button id="show-metrics" className="button button-outline">Show Metrics</button>
          </div>
          
          <pre id="metrics-output" style={{display: 'none', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', marginTop: '20px'}}></pre>
        </div>

        <div className="card">
          <h2>Dashboard</h2>
          <div id="dashboard-root" style={{margin: '10px 0'}}></div>
        </div>
        
        <div id="countdown" className="countdown">
          Redirecting to <span id="assigned-version-text">your assigned version</span> in <span id="countdown-number" className="countdown-number">10</span> seconds...
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
          margin: 0;
          padding: 40px;
          line-height: 1.6;
          color: #333;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        h1 {
          margin-top: 0;
          margin-bottom: 1rem;
        }
        
        .card {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .button-container {
          margin-top: 30px;
          display: flex;
          gap: 10px;
        }
        
        .button {
          display: inline-block;
          background-color: #0366d6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          font-weight: 500;
        }
        
        .button:hover {
          background-color: #0255b3;
        }
        
        .button-outline {
          background-color: transparent;
          border: 1px solid #0366d6;
          color: #0366d6;
        }
        
        .button-outline:hover {
          background-color: rgba(3, 102, 214, 0.1);
        }

        .countdown {
          text-align: center;
          margin-top: 20px;
          font-size: 16px;
          color: #666;
        }
        
        .countdown-number {
          font-weight: bold;
          font-size: 18px;
          color: #0366d6;
        }

        #version-switcher.version-switcher {
          display: block !important;
          z-index: 9999 !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          padding: 20px;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eaeaea;
        }
      `}</style>
    </>
  );
}
