# Advanced Options

While Client-Side Canary Deployment is designed to work with zero configuration, some projects may require more control. This document explains advanced options and customization.

## Full Configuration Options

```javascript
canary.config({
  initialCanaryPercentage: 5,      // Starting percentage for canary
  maxCanaryPercentage: 50,         // Maximum percentage allowed by auto-scaling
  safetyThreshold: 2,              // Minimum percentage on rollback
  gradualRollout: true,            // Automatically increase percentage
  rolloutPeriod: 7,                // Days to reach max percentage
  storageKey: 'canary_assignment', // localStorage key for assignment
  metricsStorageKey: 'canary_metrics', // localStorage key for metrics
  autoEvaluate: true,              // Auto-evaluate metrics periodically
  evaluationInterval: 3600000,     // Evaluate every hour (in milliseconds)
  errorThreshold: 1.5,             // Rollback if error rate 1.5x stable version
  posthogEnabled: false,           // PostHog disabled by default
  posthogApiKey: null              // PostHog API key
});
```

## Version Management & Client Updates

The system automatically checks for version updates every 5 minutes by polling the `version.json` file:

```javascript
// Simplified version check logic
setInterval(async function() {
  const response = await fetch('version.json?nocache=' + Date.now());
  const data = await response.json();
  const currentVersion = localStorage.getItem('app-version');
  
  if (currentVersion && currentVersion !== data.version) {
    localStorage.setItem('app-version', data.version);
    window.location.reload(true);
  }

// Schedule periodic checks (system default is 5 minutes)
setInterval(checkForVersionUpdates, 5 * 60 * 1000);
```

This enables configuration changes to propagate quickly without requiring users to manually refresh.

## Custom Assignments

Override the default assignment logic:

```javascript
// Custom assignment based on user properties
canary.customAssignment(function(user) {
  // Power users always get canary features
  if (user.isPowerUser) return 'canary';
  
  // Regular assignment for others
  return null; // null means use default assignment
});

// Associate current user with properties
canary.identifyUser({
  id: 'user123',
  isPowerUser: true,
  joinDate: '2025-05-01'
});
```

## Debugging

```javascript
// Enable debug mode
canary.debug(true);

// Get debug information
const debugInfo = canary.debugInfo();
console.table(debugInfo.metrics);

// Export all data (useful for support)
const exportData = canary.exportData();
console.log(JSON.stringify(exportData));
```

## Event Hooks

```javascript
// React to canary events
canary.on('rollback', function(data) {
  console.log(`Rollback triggered - error rates: stable ${data.stableErrorRate}, canary ${data.canaryErrorRate}`);
});

canary.on('evaluationComplete', function(result) {
  if (result.recommendation === 'ROLLBACK') {
    notifyTeam('Canary deployment experiencing issues!');
  }
});

// Other available events
canary.on('percentageIncrease', function(data) {
  console.log(`Canary percentage increased to ${data.newPercentage}%`);
});

canary.on('analyticsBlocked', function(data) {
  console.log(`Analytics blocked: ${data.reason}`);
});
```
