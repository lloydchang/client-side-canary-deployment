import React from 'react';
import styles from './VersionInfo.module.css';

interface VersionInfoProps {
  version: string;
  percentage: number;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ version, percentage }) => {
  return (
    <div className={styles.versionInfo}>
      <div className={styles.assignmentInfo}>
        <h3 className={styles.title}>Your Version</h3>
        <div className={styles.version}>
          <div className={`${styles.tag} ${version === 'canary' ? styles.canary : styles.stable}`}>
            {version}
          </div>
        </div>
      </div>

      <div className={styles.distribution}>
        <h3 className={styles.title}>Canary Distribution</h3>
        <div className={styles.percentageBar}>
          <div 
            className={styles.canaryPercentage} 
            style={{ width: `${percentage}%` }}
          ></div>
          <span className={styles.stablePercentage} style={{ width: `${100 - percentage}%` }}></span>
        </div>
        <div className={styles.labels}>
          <span>Canary: {percentage}%</span>
          <span>Stable: {100 - percentage}%</span>
        </div>
      </div>
    </div>
  );
};

export default VersionInfo;
