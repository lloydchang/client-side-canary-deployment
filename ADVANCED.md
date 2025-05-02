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

## Feature-Specific Configuration

Features can be configured individually:

```javascript
canary.defineFeature('advancedSearch', {
  description: 'New search algorithm with better results',
  initialPercentage: 2,            // Start with just 2% of canary users
  evaluationCriteria: {            // Custom evaluation criteria
    errorThreshold: 1.2,           // More sensitive error threshold
    performanceThreshold: 1.1      // Maximum allowed performance degradation
  }
});
```

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
  joinDate: '2023-05-01'
});
```

## Manual Metrics Submission

```javascript
// Track custom performance metrics
canary.trackPerformance('api_response_time', 250); // milliseconds

// Track business metrics
canary.trackBusinessMetric('cart_value', 75.99);
canary.trackBusinessMetric('items_per_cart', 3);
```

## Server-Side Integration

For hybrid deployments with server analytics:

```javascript
// Submit metrics to your server
canary.setMetricsEndpoint('https://your-api.example.com/canary-metrics');

// Configure metrics submission frequency
canary.config({
  metricsSubmissionInterval: 60000, // Send every minute
  batchMetrics: true                // Batch metrics together
});
```

## Manual Feature Control

```javascript
// Force enable a feature for testing
canary.forceFeature('newCheckout', true);

// Reset to default behavior
canary.resetFeature('newCheckout');

// Get feature details
const featureDetails = canary.getFeature('newCheckout');
```

## Debugging

```javascript
// Enable debug mode
canary.debug(true);

// Get debug information
const debugInfo = canary.debugInfo();
console.table(debugInfo.features);
console.table(debugInfo.metrics);

// Export all data (useful for support)
const exportData = canary.exportData();
console.log(JSON.stringify(exportData));
```

## Event Hooks

```javascript
// React to canary events
canary.on('featureEnabled', function(feature) {
  console.log(`Feature ${feature.name} was enabled`);
});

canary.on('evaluationComplete', function(result) {
  if (result.recommendation === 'ROLLBACK') {
    notifyTeam('Canary deployment experiencing issues!');
  }
});
```

## License

[MIT License](LICENSE)
