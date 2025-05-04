import { useEffect, useState } from 'react';
import Head from 'next/head';
import Dashboard from '../components/Dashboard';
import { DashboardData } from '../interfaces/types';

declare global {
  interface Window {
    dashboard: any;
    DashboardData?: any;
  }
}

export default function Home() {
  const [DashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  useEffect(() => {
    // Only runs in browser
    if (typeof window !== 'undefined') {
      const getDashboardData = () => {
        if (window.dashboard) {
          try {
            const metrics = window.dashboard._metrics || {
              stable: { pageviews: 0, errors: 0, clicks: 0 },
              dashboard: { pageviews: 0, errors: 0, clicks: 0 },
              events: []
            };
            
            const assignment = window.dashboard._assignment || {
              version: 'stable',
              timestamp: new Date().toISOString()
            };
            
            const config = window.dashboard._config || {
              initialCanaryPercentage: 5
            };
            
            setDashboardData({
              metrics,
              assignment,
              config
            });
          } catch (e) {
            console.error('Error fetching dashboard data:', e);
          }
        }
      };
      
      // Initial load
      getDashboardData();
      
      // Set up polling
      const interval = setInterval(getDashboardData, 5000);
      return () => clearInterval(interval);
    }
  }, []);
  
  return (
    <>
      <Head>
        <title>Dashboard</title>
      </Head>
      <Dashboard data={DashboardData} />
    </>
  );
}

// This function will be called from the bridge script
// It needs to be attached to the module exports
export function initDashboard(DashboardData: any) {
  if (typeof window !== 'undefined') {
    // Store the data in a global variable for the component
    window.DashboardData = DashboardData;
    
    // Force re-render if needed
    const event = new CustomEvent('dashboard-data-ready');
    window.dispatchEvent(event);
  }
}
