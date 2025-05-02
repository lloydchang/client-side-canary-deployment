# Client-Side Canary Deployment

A lightweight implementation of client-side canary deployments using vanilla JavaScript and browser session storage with integrated analytics and automatic evaluation.

## Overview

This project demonstrates how to implement canary deployments for static web applications entirely on the client side. It allows you to gradually roll out new features to a subset of users without requiring server-side configuration, while collecting analytics data to make informed decisions about rollbacks or rollouts.

## How It Works

1. When a user visits the [index.html](index.html) page, the script checks if they have already been assigned to a version (stored in `sessionStorage`)
2. If no version is assigned, the user is assigned based on the configured canary percentage:
   - The stable version (stable)
   - The canary version (canary)
3. The assignment persists in the user's session, ensuring a consistent experience during their visit
4. The user is automatically redirected to the appropriate version
5. Analytics are collected to track performance, errors, and user engagement
6. Automated processes evaluate the canary's performance and adjust distribution percentages

## Key Features

- **Gradual Rollout**: Configurable percentage-based distribution between stable and canary versions
- **Feature Flags**: Control specific features within the canary version
- **Analytics Integration**: Built-in tracking of metrics with PostHog integration
- **Version Switcher**: UI component allowing users to manually switch between versions
- **Theme Switching**: Example of feature flags controlling UI appearance (classic vs. modern shadcn-inspired theme)
- **Automated Evaluation**: GitHub Actions workflows to analyze metrics and make rollback/rollforward decisions

## Files and Directory Structure

### Core Files
- [index.html](index.html): Entry point that handles version assignment and redirection
- [config/canary-config.json](config/canary-config.json): Configuration file for canary distribution and feature flags
- [stable/index.html](stable/index.html): The stable version of the application
- [canary/index.html](canary/index.html): The canary version with new features and designs

### JavaScript Libraries
- [js/analytics.js](js/analytics.js): Analytics implementation with metrics collection
- [js/canary-config.js](js/canary-config.js): Configuration management and decision logic
- [js/version-switcher.js](js/version-switcher.js): UI component for manual version switching

### Automation
- [.github/workflows/evaluate-canary.yml](.github/workflows/evaluate-canary.yml): GitHub Actions workflow for regular canary evaluation
- [.github/workflows/canary-automation.yml](.github/workflows/canary-automation.yml): Automation for canary deployment management
- [.github/workflows/canary-evaluation.yml](.github/workflows/canary-evaluation.yml): Scheduled evaluation of canary metrics
- [.github/scripts/canary-evaluator.js](.github/scripts/canary-evaluator.js): Script that analyzes metrics and updates configuration

## Configuration Options

The canary deployment can be customized through the [canary-config.json](config/canary-config.json) file:

Key configuration options:
- `canaryPercentage`: The percentage of users that should see the canary version
- `gradualRollout`: Whether to automatically increase the percentage over time
- `rolloutPeriod`: Number of days to reach 100% rollout
- `featureFlags`: Toggle specific features within the canary version

## Analytics Implementation

The system includes a comprehensive analytics solution specifically designed for canary deployments:

### Metrics Collection:
- Performance metrics (page load time, Core Web Vitals)
- Error tracking (with rate calculation)
- User engagement (scroll depth, session duration)
- Custom events

### PostHog Integration:
- Events are sent to PostHog for aggregation and analysis
- Version information is attached to all events
- Feature flag status is tracked for correlation analysis

### In-App Visualization:
- Both canary and stable versions include metrics visualization interfaces
- Allows for real-time inspection of collected data

## Automated Canary Evaluation

The project includes GitHub Actions workflows that:

1. Periodically fetch metrics from PostHog
2. Analyze performance differences between stable and canary versions
3. Make data-driven decisions about whether to:
   - Accelerate the rollout (increase canary percentage)
   - Hold the current distribution
   - Slow down the rollout
   - Roll back to stable
4. Update the configuration based on these decisions

Decision logic evaluates:
- Error rates
- Performance metrics
- User engagement metrics

## Feature Flag System

Feature flags allow for granular control over which features are enabled in the canary version:

- This allows testing individual features even within the canary deployment
- Currently implemented features include the modern UI theme (`newDesign` flag)
- Feature flag status is tracked in analytics for correlation analysis

## Deployment

Simply deploy all files to your static hosting provider (like GitHub Pages, Netlify, or Vercel). For the automated evaluation system to work:

1. Set up PostHog for analytics collection
2. Configure GitHub repository secrets for PostHog API keys
3. Enable GitHub Actions workflows

## Future Enhancements

Potential improvements could include:
- A/B testing framework extension
- More sophisticated statistical analysis for evaluation
- User segmentation for targeted canary deployment
- Server-side rendering compatibility
- Multi-variant testing (more than just stable/canary)
- Enhanced visualization dashboards

## License

[GNU Affero General Public License v3.0](LICENSE)