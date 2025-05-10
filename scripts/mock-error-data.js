/**
 * Custom mock data with elevated canary error rates
 */
exports.getMockAnalyticsData = function() {
  return {
    stable: {
      pageviews: 500,
      errors: 10,
      errorRate: 0.02  // 2% error rate
    },
    canary: {
      pageviews: 50,
      errors: 10, 
      errorRate: 0.20  // 20% error rate - 10x higher than stable
    },
    analysis: {
      relativeErrorIncrease: 0.18, // 18% increase
      exceedsThreshold: true,
      recommendedAction: 'rollback'
    },
    timestamp: new Date().toISOString()
  };
};
