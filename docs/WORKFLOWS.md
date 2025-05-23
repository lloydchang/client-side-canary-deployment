# GitHub Workflows & Scripts Documentation

This document provides detailed information about the GitHub Actions workflow and scripts used in this project for canary deployment automation.

## Workflow Overview

The project uses a single GitHub Actions workflow to manage all aspects of canary deployments:

| Workflow | File | Purpose |
|----------|------|---------|
| Canary Deployment & Analytics | `.github/workflows/deploy-gh-pages.yml` | All-in-one workflow for deployment, analytics, and adjustments |

## Main Workflow: Canary Deployment & Analytics

This consolidated workflow (`.github/workflows/deploy-gh-pages.yml`) handles all aspects of the canary deployment process.

### Triggers
- **Push to main branch**: Automatic deployment
- **Schedule**: Runs analytics every 6 hours
- **Manual trigger** with options:
  - `deploy`: Deploy latest code
  - `analyze`: Evaluate canary performance
  - `adjust-canary`: Change canary percentage

### Variant Management & Client Updates

The workflow ensures that clients always get the latest configuration:

1. **Version File Updates**:
   - Each job runs `update-version.sh` which:
     - Reads current version from `version.json`
     - Increments the patch version (e.g., 1.0.3 → 1.0.4)
     - Updates the timestamp
     - **Creates two copies of version.json**:
       - Root version.json: The source of truth used by scripts and GitHub Actions
       - Frontend version.json: A deployment copy for client-side access

   > **Why two version.json files?** The GitHub Pages deployment only publishes the `frontend/` 
   > directory to production. However, build scripts and GitHub Actions workflows need access 
   > to version information from the repository root. This dual-file approach maintains one 
   > source of truth while ensuring the deployed site has access to the same version data.

2. **Configuration Updates**:
   - The `.github/scripts/canary-analyzer.js` script updates:
     - `frontend/assets/config/canary-config.json`: Main JSON configuration 
     - `frontend/assets/config/canary-config.js`: JavaScript configuration for client use

3. **Clean Deployment**:
   - For full deployments, all files are pushed to `gh-pages`
   - For config-only updates, selective deployment targets only:
     - `frontend/version.json`
     - `frontend/assets/config/**`

4. **Client Detection**:
   - All HTML pages (index, stable, canary) check for version changes
   - Pages reload automatically when version changes are detected
   - 5-minute polling interval ensures timely updates

This creates a seamless update pipeline where configuration changes are automatically propagated to all clients.

### Jobs

#### 1. build-and-deploy
Handles the deployment of the application to GitHub Pages:
- Injects PostHog API keys from GitHub secrets
- Configures base path for GitHub Pages
- Deploys to the gh-pages branch

#### 2. analyze-canary
Analyzes canary performance using PostHog data:
- Runs the analysis script (`.github/scripts/canary-analyzer.js`)
- Creates a summary report with error rates and recommendations
- Saves detailed results as artifacts
- Can trigger automatic rollback if thresholds are exceeded
- Periodically adjusts canary percentage based on analysis results

#### 3. adjust-canary
Provides manual control over canary distribution percentages:
- Allows immediate adjustment of canary traffic percentage via workflow dispatch
- Serves as a critical override for the automated system
- Updates the canary configuration with the specified percentage
- Deploys only the updated configuration to GitHub Pages
- Creates a summary report confirming the change

**Why manual control alongside automation?**
While the system includes automated analysis and adjustment through the `analyze-canary` job, the manual job serves several important purposes:
- **Emergency control**: Quickly respond to issues by adjusting or rolling back canary distribution percentages
- **Special scenarios**: Handle business requirements that automated metrics can't account for
- **Testing & validation**: Set specific percentages during development or QA processes
- **Fine-grained control**: Allow product managers to directly influence rollout pace
- **Safety mechanism**: Provide a "break glass in case of emergency" option when automation isn't sufficient

This hybrid approach combining automated analysis with manual override capabilities is considered a best practice in progressive deployment systems.

## Supporting Scripts

### `.github/scripts/canary-analyzer.js`

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

## File Update Process

```mermaid
flowchart LR
    subgraph "GitHub Actions Jobs"
        A["build-and-deploy job"]
        B["analyze-canary job"]
        C["adjust-canary job"]
    end
    
    subgraph "File Updates"
        A --> A1[Update version.json]
        A --> A2[Create frontend/assets/config/canary-config.json]
        A --> A3[Deploy all files to gh-pages]
        
        B --> B1[Update version.json]
        B --> B2[Update frontend/assets/config/canary-config.json]
        B --> B3[Update frontend/assets/config/canary-config.js]
        B --> B4[Selective deployment to gh-pages]
        
        C --> C1[Update version.json]
        C --> C2[Update frontend/assets/config/canary-config.json]
        C --> C3[Update frontend/assets/config/canary-config.js]
        C --> C4[Selective deployment to gh-pages]
        
        B2 --"Contains canary percentage"--> Config
        C2 --"Contains canary percentage"--> Config
        B3 --"Contains canary configuration"--> JSConfig
        C3 --"Contains canary configuration"--> JSConfig
        A1 --"Increments version number"--> Version
        B1 --"Increments version number"--> Version
        C1 --"Increments version number"--> Version
    end
    
    subgraph "GitHub Pages"
        Config[frontend/assets/config/canary-config.json]
        JSConfig[frontend/assets/config/canary-config.js]
        Version[version.json]
    end
    
    subgraph "Client Detection"
        Version --> CheckVersion["Client checks version.json"]
        CheckVersion --> Reload["Page reloads on version change"]
        Reload --> LoadConfig["Loads updated config files"]
    end
    
    style Config fill:#f9f,stroke:#333,stroke-width:2px
    style JSConfig fill:#bbf,stroke:#333,stroke-width:2px
    style Version fill:#ff9,stroke:#333,stroke-width:2px
```

```mermaid
graph LR
    A[GitHub Actions] -->|Reads/Updates| B[frontend/assets/config/canary-config.json]
    A -->|Generates| C[frontend/assets/config/canary-config.js]
    C -->|Loaded by| D[Browser]
    D -->|Accesses via| E[window.CanaryConfig]
```

### Selective Deployment Details

When running `analyze-canary` or `adjust-canary` jobs, only specific files are updated in GitHub Pages:

1. `version.json` - Updated to trigger client refreshes
2. `frontend/assets/config/canary-config.json` - Contains the updated canary percentage
3. `frontend/assets/config/canary-config.js` - JavaScript version of configuration for client use

This selective deployment is implemented through the GitHub Pages deploy action via `.github/workflows/deploy-gh-pages.yml`

## Setting Up GitHub Secrets

For the workflow to function properly, you need to set up the following secrets in your GitHub repository:

1. `POSTHOG_API_KEY`: PostHog API key (for server-side operations)
2. `POSTHOG_PUBLIC_KEY`: PostHog project API key (for client-side tracking)
3. `POSTHOG_PROJECT_ID`: PostHog project ID

## Environment Variables

You can configure the workflow further with repository variables:

- `ERROR_THRESHOLD`: Maximum acceptable error rate difference (default: 0.02)
- `TIMEFRAME`: Time period for analysis (default: 24h)
