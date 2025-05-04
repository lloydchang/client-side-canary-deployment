import React from 'react';
import styles from './MetricsCard.module.css';

interface MetricsCardProps {
  title: string;
  metrics: {
    pageviews: number;
    errors: number;
    clicks: number;
  };
  type: 'stable' | 'canary';
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, metrics, type }) => {
  const errorRate = metrics.pageviews > 0 
    ? ((metrics.errors / metrics.pageviews) * 100).toFixed(1) 
    : '0.0';
  
  const cardClass = `${styles.card} ${type === 'canary' ? styles.canary : styles.stable}`;
  
  return (
    <div className={cardClass}>
      <h4 className={styles.title}>{title}</h4>
      <ul className={styles.list}>
        <li><span className={styles.label}>Pageviews:</span> {metrics.pageviews}</li>
        <li><span className={styles.label}>Clicks:</span> {metrics.clicks}</li>
        <li><span className={styles.label}>Errors:</span> {metrics.errors}</li>
        <li><span className={styles.label}>Error Rate:</span> {errorRate}%</li>
      </ul>
    </div>
  );
};

export default MetricsCard;
