# GitHub Workflows & Scripts Documentation

This document provides detailed information about the GitHub Actions workflow and scripts used in this project for canary deployment automation.

## Workflow Overview

The project uses a single GitHub Actions workflow to manage all aspects of canary deployments:

| Workflow | File | Purpose |
|----------|------|---------|
| Canary Deployment & Analytics | `deploy-gh-pages.yml` | All-in-one workflow for deployment, analytics, and adjustments |

## Main Workflow: Canary Deployment & Analytics

This consolidated workflow (`deploy-gh-pages.yml`) handles all aspects of the canary deployment process.

### Triggers
- **Push to main branch**: Automatic deployment
- **Schedule**: Runs analytics every 6 hours
- **Manual trigger** with options:
  - `deploy`: Deploy latest code
  - `analyze`: Evaluate canary performance
  - `adjust-canary`: Change canary percentage

### Jobs

#### 1. build-and-deploy
Handles the deployment of the application to GitHub Pages:
- Builds the project with Rollup
- Injects PostHog API keys from GitHub secrets
- Configures base path for GitHub Pages
- Deploys to the gh-pages branch

#### 2. analyze-canary
Analyzes canary performance using PostHog data:
- Runs the analysis script (`analyze-canary.js`)
- Creates a summary report with error rates and recommendations
- Saves detailed results as artifacts
- Can trigger automatic rollback if thresholds are exceeded

#### 3. adjust-canary
Allows manual adjustment of canary percentages:
- Updates the canary configuration with new percentage
- Deploys only the updated config file to GitHub Pages
- Creates a summary report confirming the change

## Supporting Scripts

### analyze-canary.js

This script queries the PostHog API to compare stable and canary version performance:

- Fetches pageviews and error events for both versions
- Calculates error rates and relative increases
- Determines if thresholds are exceeded
- Returns a recommendation (continue or rollback)

**Configuration options:**
- `POSTHOG_API_KEY`: API key for server-side operations
- `POSTHOG_PROJECT_ID`: PostHog project ID
- `POSTHOG_HOST`: PostHog host (default: app.posthog.com)
- `ERROR_THRESHOLD`: Maximum acceptable error rate increase (default: 0.02)
- `TIMEFRAME`: Analysis time period (default: 24h)

### update-canary.js

Script for updating the canary percentage configuration:

- Reads existing configuration or creates default
- Updates the canary percentage
- Writes updated configuration back to file

**Usage:**
```
node update-canary.js --percentage=20
```

## Setting Up GitHub Secrets

For the workflow to function properly, you need to set up the following secrets in your GitHub repository:

1. `POSTHOG_API_KEY`: PostHog API key (for server-side operations)
2. `POSTHOG_PUBLIC_KEY`: PostHog project API key (for client-side tracking)
3. `POSTHOG_PROJECT_ID`: PostHog project ID

## Environment Variables

You can configure the workflow further with repository variables:

- `ERROR_THRESHOLD`: Maximum acceptable error rate difference (default: 0.02)
- `TIMEFRAME`: Time period for analysis (default: 24h)
