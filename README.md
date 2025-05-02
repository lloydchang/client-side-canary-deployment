# Client-Side Canary Deployment

A lightweight implementation of client-side canary deployments using vanilla JavaScript and browser session storage with integrated analytics and automatic evaluation.

## Overview

This project demonstrates how to implement canary deployments for static web applications mostly on the client side. It allows you to gradually roll out new features to a subset of users with minimal server-side configuration, while collecting analytics data to make informed decisions about rollouts or rollbacks.

## How It Works

1. When a user visits the [index.html](index.html) page, the script checks if they have already been assigned to a version (stored in `sessionStorage`)
2. If no version is assigned, the user is assigned based on the configured canary percentage:
   - The stable version (stable)
   - The canary version (canary)
3. The assignment persists in the user's session, ensuring a consistent experience during their visit
4. The user is automatically redirected to the appropriate version
5. Analytics are collected to track performance, errors, and user engagement
6. Automated processes evaluate the canary's performance and adjust distribution percentages

## Quick Start Guide

To get started with this project:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/client-side-canary-deployment.git
   cd client-side-canary-deployment
   ```

2. **Configure PostHog integration**:
   - Create a free account at [PostHog](https://posthog.com/)
   - Create a new project and get your public API key (starts with `ph_pub_`)
   - Create a `.env` file using `.env.example` as a template:
     ```
     POSTHOG_PUBLIC_KEY=ph_pub_YOUR_KEY_HERE
     POSTHOG_PROJECT_ID=YOUR_PROJECT_ID
     ```

3. **Run the build script** to inject your PostHog key:
   ```bash
   npm install
   node scripts/build.js
   ```

4. **Deploy to your static hosting provider** (GitHub Pages, Netlify, Vercel, etc.)
   - For GitHub Pages, set up the GitHub Actions workflow (details below)

5. **Monitor results** in your PostHog dashboard to evaluate canary performance

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
- [stable/index.html](stable/index.html): The stable version

### JavaScript Libraries
- [js/analytics.js](js/analytics.js): Analytics implementation with metrics collection
- [js/canary-config.js](js/canary-config.js): Configuration management and decision logic
- [js/version-switcher.js](js/version-switcher.js): UI component for manual version switching

### Automation
- [.github/workflows/deploy-gh-pages.yml](.github/workflows/deploy-gh-pages.yml): GitHub Action for deployment to GitHub Pages
- [.github/workflows/evaluate-canary.yml](.github/workflows/evaluate-canary.yml): Regular canary evaluation
- [.github/workflows/canary-automation.yml](.github/workflows/canary-automation.yml): Automation for canary deployment management
- [.github/scripts/canary-evaluator.js](.github/scripts/canary-evaluator.js): Script that analyzes metrics and updates configuration

## Configuration Options

The canary deployment can be customized through the [canary-config.json](config/canary-config.json) file:

```json
{
  "canaryVersion": "1.0.0",             // Version identifier
  "distribution": {
    "canaryPercentage": 15,             // % of users who see the canary
    "gradualRollout": true,             // Auto-increase percentage over time
    "rolloutPeriod": 7,                 // Days to reach 100% rollout
    "initialDate": "2025-05-01",        // Start date of canary deployment
    "safetyThreshold": 5                // Min % to maintain even on rollback
  },
  "featureFlags": {
    "newDesign": true,                  // Enable modern UI in canary
    "betaFeatures": false,              // Experimental features
    "performanceOptimizations": true    // Performance improvements
  },
  "analytics": {
    "posthogApiKey": "__POSTHOG_PUBLIC_KEY__",    // Replaced during build
    "posthogProjectId": "__POSTHOG_PROJECT_ID__"  // Replaced during build
  }
}
```

## Analytics Implementation

The system includes a comprehensive analytics solution specifically designed for canary deployments:

### Metrics Collection:
- Performance metrics (page load time, Core Web Vitals)
- Error tracking (with rate calculation)
- User engagement (scroll depth, session duration)
- Custom events

### PostHog Integration:
- **Setup Steps**:
  1. Sign up for a free [PostHog](https://posthog.com/) account
  2. Create a new project
  3. Get your public API key (starts with `ph_pub_`)
  4. Add the key to your environment variables or GitHub Secrets

- **What's Being Tracked**:
  - Version information (stable vs canary)
  - Feature flag status
  - Error rates and performance metrics
  - User engagement patterns

- **Viewing Analytics**:
  1. Log in to your PostHog dashboard
  2. Navigate to Insights → Create new insight
  3. Filter by `version` property to compare stable vs canary

## GitHub Pages Deployment

To deploy this project to GitHub Pages with secure PostHog integration:

1. **Create GitHub repository secrets**:
   - Go to your repository → Settings → Secrets and Variables → Actions
   - Add these secrets:
     - `POSTHOG_PUBLIC_KEY`: Your PostHog public API key
     - `POSTHOG_PROJECT_ID`: Your PostHog project ID

2. **Set up the GitHub Pages workflow**:
   - The provided `.github/workflows/deploy-gh-pages.yml` file handles:
     - Building the site with your PostHog keys securely injected
     - Deploying the result to the gh-pages branch
     - Running on each push to main and on a schedule for automated evaluation

3. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Set Source to "Deploy from a branch"
   - Select the "gh-pages" branch and "/ (root)" folder
   - Click Save

4. **Access your deployed site**:
   - Your site will be available at `https://yourusername.github.io/client-side-canary-deployment/`

## Security Considerations

### PostHog Integration Security

This project uses PostHog for analytics, which requires special security considerations for client-side usage:

1. **Use Public API Keys Only**: 
   - PostHog provides special "public" API keys (starting with `ph_pub_`) designed for client-side usage
   - These keys can ONLY send events, not access or read data
   - Never use admin API keys (starting with `phx_`) in client-side code

2. **Never commit API keys to the repository**:
   - Always use placeholder values in source code
   - The build process replaces these placeholders with actual keys
   - This ensures sensitive values aren't in your Git history

3. **Environment-specific keys**:
   - Use different PostHog projects/keys for development, staging, and production
   - This prevents test data from contaminating production analytics

### Safe Implementation with GitHub Pages

GitHub Pages is a static hosting service, but you can still implement this securely by:

1. Using the GitHub Actions workflow to inject keys at build time
2. Storing the actual keys as GitHub Secrets
3. Using only public PostHog API keys that are designed for client-side usage

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

## Troubleshooting

**Missing analytics data?**
- Verify PostHog key is correctly set up in config
- Check browser console for any errors
- Ensure you're not blocking analytics with ad blockers

**Version assignment not working?**
- Clear browser's sessionStorage
- Verify the distribution percentage in config isn't set to 0%
- Check browser console for JavaScript errors

**GitHub Actions workflow failing?**
- Verify GitHub Secrets are correctly set up
- Check workflow logs for specific errors
- Ensure PostHog API key has correct permissions

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
