import { useEffect, useState } from 'react';
import Head from 'next/head';
import Dashboard from '../components/Dashboard';
import { CanaryData } from '../interfaces/types';

declare global {
  interface Window {
    canary: any;
    canaryDashboardData?: any;
  }
}

export default function Home() {
  const [canaryData, setCanaryData] = useState<CanaryData | null>(null);
  
  useEffect(() => {
    // Only runs in browser
    if (typeof window !== 'undefined') {
      const getCanaryData = () => {
        if (window.canary) {
          try {
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
            
            setCanaryData({
              metrics,
              assignment,
              config
            });
          } catch (e) {
            console.error('Error fetching canary data:', e);
          }
        }
      };
      
      // Initial load
      getCanaryData();
      
      // Set up polling
      const interval = setInterval(getCanaryData, 5000);
      return () => clearInterval(interval);
    }
  }, []);
  
  return (
    <>
      <Head>
        <title>Canary Dashboard</title>
      </Head>
      <Dashboard data={canaryData} />
    </>
  );
}

// This function will be called from the bridge script
// It needs to be attached to the module exports
export function initDashboard(canaryData: any) {
  if (typeof window !== 'undefined') {
    // Store the data in a global variable for the component
    window.canaryDashboardData = canaryData;
    
    // Force re-render if needed
    const event = new CustomEvent('canary-dashboard-data-ready');
    window.dispatchEvent(event);
  }
}
