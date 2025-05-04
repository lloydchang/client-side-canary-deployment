import { useEffect, useState } from 'react';
import Head from 'next/head';
import Dashboard from '../components/Dashboard';
import { DashboardData } from '../interfaces/types';

declare global {
  interface Window {
    canary: any;
    dashboardData: any;
    __NEXT_DASHBOARD_UPDATE__: (data: any) => void;
  }
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  useEffect(() => {
    // Only runs in browser
    if (typeof window !== 'undefined') {
      // Use data from window.dashboardData if available (set by bridge)
      if (window.dashboardData) {
        setDashboardData(window.dashboardData);
      } else if (window.canary) {
        // Fallback to direct canary object access
        const metrics = window.canary._metrics || {
          stable: { pageviews: 0, errors: 0, clicks: 0 },
          canary: { pageviews: 0, errors: 0, clicks: 0 },
          events: []
        };
        
        const assignment = window.canary._assignment || {
          version: 'stable',
          timestamp: new Date().toISOString()
        };
        
        const config = window.canary._config || {
          initialCanaryPercentage: 5
        };
        
        setDashboardData({
          metrics,
          assignment,
          config
        });
      }

      // Set up update handler for bridge to call
      window.__NEXT_DASHBOARD_UPDATE__ = (data) => {
        setDashboardData(data);
      };
      
      // Listen for custom event as backup
      window.addEventListener('dashboard-data-updated', () => {
        if (window.dashboardData) {
          setDashboardData(window.dashboardData);
        }
      });
    }
  }, []);
  
  return (
    <>
      <Head>
        <title>Canary Dashboard</title>
      </Head>
      <Dashboard data={dashboardData} />
    </>
  );
}

// This function will be called from the bridge script
export function initDashboard(data: any) {
  if (typeof window !== 'undefined') {
    // Store the data in a global variable for the component
    window.dashboardData = data;
    
    // Force re-render if needed
    const event = new CustomEvent('dashboard-data-updated');
    window.dispatchEvent(event);
  }
}
