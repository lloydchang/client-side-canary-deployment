import React from 'react';
import { DashboardData } from '../interfaces/types';
import MetricsCard from './MetricsCard';
import VersionInfo from './VersionInfo';
import EventsList from './EventsList';
import styles from './Dashboard.module.css';

interface DashboardProps {
  data: DashboardData | null;
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  if (!data) {
    return <div className={styles.loading}>Loading canary data...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <h2 className={styles.title}>Canary Deployment Dashboard</h2>
      
      <div className={styles.grid}>
        <div className={styles.section}>
          <VersionInfo 
            version={data.assignment.version} 
            percentage={data.config.initialCanaryPercentage} 
          />
        </div>
        
        <div className={styles.section}>
          <h3>Metrics Comparison</h3>
          <div className={styles.metricsGrid}>
            <MetricsCard 
              title="Stable Version" 
              metrics={data.metrics.stable} 
              type="stable"
            />
            <MetricsCard 
              title="Canary Version" 
              metrics={data.metrics.canary} 
              type="canary"
            />
          </div>
        </div>
        
        <div className={styles.section}>
          <EventsList events={data.metrics.events.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
