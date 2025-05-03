# PostHog Analytics Integration

This document explains how our client-side canary deployment system integrates with PostHog for analytics and how to use the GitHub Actions workflows to analyze deployment performance.

## How It Works

1. **Client-side tracking**: The canary.js and analytics.js scripts automatically track:
   - Pageviews with version information (stable/canary)
   - Error events with stack traces and context
   - Feature flag evaluations
   - Custom events defined in your application

2. **PostHog dashboard**: All events are sent to your PostHog instance where you can:
   - Build custom dashboards for monitoring
   - Create funnels to analyze user behavior differences
   - Set up alerts for anomalies

3. **GitHub Actions integration**: Automated workflows query the PostHog API to:
   - Monitor error rates between versions
   - Generate reports for stakeholders
   - Trigger automatic rollbacks if needed

## Setup Instructions

### 1. PostHog Setup

1. Create an account at [PostHog](https://posthog.com)
2. Create a new project
3. Get your API credentials:
   - API Key (for server-side operations)
   - Project API Key (for client-side tracking)
   - Project ID

### 2. GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

- `POSTHOG_API_KEY`: Your PostHog API key (private, server-side)
- `POSTHOG_PUBLIC_KEY`: Your PostHog project API key (public, client-side)
- `POSTHOG_PROJECT_ID`: Your PostHog project ID

### 3. Workflow Configuration

The consolidated workflow file (`deploy-gh-pages.yml`) includes analytics capabilities with several configurable parameters:

- `ERROR_THRESHOLD`: Maximum acceptable error rate difference (default: 2%)
- `TIMEFRAME`: Time period for analysis (default: 24h)
- Schedule: By default, runs every 6 hours

You can also manually trigger specific tasks from the Actions tab in GitHub by selecting the "Canary Deployment & Analytics" workflow and choosing one of these operations:

- **deploy**: Deploy the latest code to GitHub Pages
- **analyze**: Run analytics to evaluate canary performance using `.github/scripts/analyze-canary.js`
- **adjust-canary**: Change the percentage of users directed to the canary version

#### Analysis Reports

The workflow generates detailed analysis reports that include:
- Pageview and error statistics for both stable and canary versions
- Calculated error rates and relative increases
- Recommended actions (continue or rollback)
- Automatic rollback process when thresholds are exceeded

These reports are available in the GitHub Actions run summary and are also stored as artifacts.

#### Adjusting Canary Percentage

To change the percentage of users who receive the canary version:

1. Go to the Actions tab in your GitHub repository
2. Select the "Canary Deployment & Analytics" workflow
3. Click "Run workflow"
4. Select "adjust-canary" from the task dropdown
5. Enter the desired percentage (0-100) in the "canary_percentage" field
6. Click "Run workflow"

This will update the configuration and deploy it to GitHub Pages.

## Analyzing Results

The canary analytics workflow:

1. Queries PostHog for pageview and error events
2. Compares error rates between stable and canary versions
3. Produces a summary report in the workflow run
4. Archives detailed JSON results as an artifact
5. Automatically triggers a rollback if thresholds are exceeded

## Custom Analytics

To add custom event tracking in your application:

```javascript
// Track a custom event
window.canary.trackEvent('button_clicked', {
  element: 'signup-button',
  page: '/homepage'
});
```

## PostHog Dashboard Setup

We recommend creating the following dashboards in PostHog:

1. **Canary Performance Dashboard**:
   - Pageview counts by version
   - Error rates by version
   - User engagement metrics by version

2. **Feature Flag Impact Dashboard**:
   - Conversion rates with/without feature
   - Error rates with/without feature
   - Performance metrics with/without feature

## Troubleshooting

If you're not seeing analytics data:

1. Check browser console for errors
2. Verify PostHog keys are correctly set in GitHub secrets
3. Ensure the analytics script is properly loaded
4. Check for ad blockers or privacy tools that might block analytics
