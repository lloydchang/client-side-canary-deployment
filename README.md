# Client-Side Canary Deployment

A lightweight implementation of client-side canary deployments using vanilla JavaScript and browser session storage.

## Overview

This project demonstrates how to implement canary deployments for static web applications entirely on the client side. It allows you to gradually roll out new features to a subset of users without requiring server-side configuration.

## How It Works

1. When a user visits the [index.html](index.html) page, the script checks if they have already been assigned to a version (stored in `sessionStorage`)
2. If no version is assigned, the user is randomly directed to either:
   - The stable version (stable)
   - The canary version (canary)
3. The assignment persists in the user's session, ensuring a consistent experience during their visit
4. The user is automatically redirected to the appropriate version

## Files

- [index.html](index.html): Entry point that handles version assignment and redirection
- [config.json](config.json): Configuration file defining stable and canary versions
- [stable/index.html](stable/index.html): The stable version of the application
- [canary/index.html](canary/index.html): The canary (new) version of the application

## Customization

You can modify the [config.json](config.json) file to change the version names or update the probability distribution in the JavaScript code to control the percentage of users who receive the canary version.

## Benefits

- No server-side logic required
- Works with static hosting (GitHub Pages, Netlify, etc.)
- Easy to implement and maintain
- Session-based persistence prevents users from seeing version changes during a visit

## Deployment

Simply deploy all files to your static hosting provider. The system will automatically handle redirecting users to the appropriate version.

## Observability and A/B Testing

To make data-driven decisions about whether to roll back or roll forward with canary deployments, you can implement the following observability and A/B testing solutions:

### Client-Side Analytics Implementation

1. **Basic Analytics Integration**:
   - Add a simple analytics module to both stable and canary versions
   - Track key metrics like page load time, user interactions, and custom events
   - Store analytics data in sessionStorage or localStorage temporarily

2. **OpenTelemetry Integration**:
   - Implement [OpenTelemetry](https://opentelemetry.io/) JavaScript SDK for standardized telemetry collection
   - Collect traces, metrics, and logs from user interactions
   - Export telemetry data to compatible backends

3. **Metrics to Monitor**:
   - Performance metrics (page load time, time-to-interactive)
   - Error rates and JavaScript exceptions
   - User engagement (time on page, interaction events)
   - Conversion metrics for key user journeys

### Reporting and Analysis Options

1. **GitHub Pages with External Analytics**:
   - GitHub Pages does not offer built-in analytics, but you can integrate:
     - Google Analytics
     - Plausible Analytics (privacy-focused alternative)
     - Microsoft Clarity for heatmaps and session recordings

2. **GitHub Actions Integration**:
   - Use GitHub Actions to build reporting pipelines
   - Schedule jobs to collect, process, and visualize canary deployment data
   - Generate automated reports comparing versions

3. **Self-hosted Analytics Backend**:
   - Deploy an OpenTelemetry Collector to ingest and process telemetry data
   - Use visualization tools like Grafana for dashboards
   - Set up alerts for anomaly detection

### Automated Rollback/Roll-forward System

1. **Decision Logic**:
   - Define thresholds for key metrics that trigger rollback
   - Implement progressive exposure (gradually increase canary traffic)
   - Create a scoring system weighing multiple metrics

2. **Implementation Options**:
   - Use GitHub Actions for scheduled evaluations of canary performance
   - Implement client-side health checks with reporting
   - Adjust canary traffic allocation in config.json based on performance data

While GitHub does not offer a built-in experimentation platform, this lightweight approach enables data-driven canary deployment decisions using familiar web technologies.

## Future Enhancements

Potential improvements could include:
- Adding analytics to track version performance
- Implementing feature flags for more granular control
- Adding A/B testing capabilities
- Supporting cookies for longer-term version assignment

## License

[GNU Affero General Public License v3.0](LICENSE)