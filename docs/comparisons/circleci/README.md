# Client-Side Canary Deployments with CircleCI

This document outlines how CircleCI, a continuous integration and continuous delivery (CI/CD) platform, can be used to support a client-side canary deployment strategy. The client-side JavaScript handles the canary decision logic, while CircleCI automates the build and deployment of application versions and the `canary-config.json` file.

## Core Concepts

Client-side canary deployment involves:
1. JavaScript in the browser fetching a `canary-config.json` file (or similar).
2. This configuration specifies the canary rollout percentage.
3. The script loads either stable or canary application assets based on this percentage.

CircleCI facilitates this by:

*   **Automating Builds**: Compiling/transpiling frontend assets (e.g., using Node.js, Webpack, Parcel).
*   **Testing**: Running unit, integration, or end-to-end tests.
*   **Deploying Static Assets**: Publishing stable and canary versions of static assets to various hosting platforms (e.g., AWS S3, Google Cloud Storage, Netlify, Vercel, GitHub Pages).
*   **Managing `canary-config.json`**: Automating the update and deployment of `canary-config.json` to a location accessible by clients.
*   **Workflow Orchestration**: Defining complex workflows with jobs for different stages like build, test, deploy-stable, deploy-canary, and update-config.

## How CircleCI Supports Client-Side Canary

A typical CircleCI configuration (`.circleci/config.yml`) would define jobs and workflows:

1.  **Build Job**:
    *   Checks out the source code.
    *   Installs dependencies (e.g., `npm install`).
    *   Builds the frontend application (e.g., `npm run build`). This might produce assets for both stable and canary if they are built from the same codebase but differ only by runtime configuration, or you might have different build processes/branches for them.
    *   Persists the built assets to the CircleCI workspace to be used by downstream deployment jobs.

2.  **Deployment Jobs**:
    *   **Deploying Application Assets**:
        *   Separate jobs can deploy stable assets to `s3://my-bucket/app/stable/` and canary assets to `s3://my-bucket/app/canary/`.
        *   These jobs would use CircleCI orbs (e.g., `aws-s3` orb) or custom scripts with CLI tools (e.g., `aws s3 sync`).
    *   **Updating `canary-config.json`**:
        *   A dedicated job can update and deploy `canary-config.json`.
        *   This job could:
            *   Take the `canary-config.json` directly from the repository.
            *   Modify it based on environment variables or parameters passed to the CircleCI workflow (e.g., a new `CANARY_PERCENTAGE`).
            *   Use tools like `jq` to modify the JSON file.
            *   Deploy the updated file to its designated location (e.g., S3).

3.  **Workflows**:
    *   CircleCI workflows orchestrate these jobs.
    *   A workflow might be triggered on commits to specific branches.
    *   You can have workflows that only update the `canary-config.json` (e.g., for adjusting rollout percentages without a full app deploy) or full deployment workflows.
    *   Approval jobs can be inserted before deploying configuration changes to production.

## Example Workflow for Adjusting Canary Percentage

1.  **Trigger**:
    *   A developer pushes a change to `canary-config.json` in the repository.
    *   Or, a scheduled workflow runs, potentially fetching desired percentages from an external source.
    *   Or, a manual trigger via CircleCI API with parameters.

2.  **`update-config` Job**:
    *   Checks out the latest `canary-config.json` (if source-controlled).
    *   Alternatively, uses environment variables (e.g., `NEW_CANARY_PERCENTAGE` set in the CircleCI UI or via API) to generate/update the `canary-config.json` content.
    *   Uploads the modified `canary-config.json` to the hosting provider (e.g., S3).
    *   Optionally, invalidates CDN cache for the config file.

## Considerations

*   **Environment Variables & Contexts**: Use CircleCI environment variables and contexts to securely store API keys, bucket names, and other sensitive deployment information.
*   **Orbs**: Leverage CircleCI orbs for common tasks like deploying to AWS, GCP, Azure, or interacting with tools like `jq`.
*   **Workspace & Artifacts**: Use workspaces to pass files (like built assets or the config file) between jobs in a workflow. Artifacts can store build outputs for inspection.
*   **Rollback Strategy**:
    *   For client-side canary, rollback often means quickly setting the canary percentage in `canary-config.json` to 0.
    *   CircleCI can have a dedicated workflow or job for this, perhaps by reverting a commit to `canary-config.json` or by running a job with `CANARY_PERCENTAGE=0`.
*   **Configuration as Code**: Keeping `canary-config.json` in your Git repository allows for versioning and audit trails, which CircleCI can easily work with.
*   **Deployment Targets**: CircleCI is flexible and can deploy to virtually any target that can be scripted, making it suitable for various hosting solutions for your static assets and config file.

CircleCI provides a powerful and flexible automation platform to build, test, and deploy the components needed for a client-side canary deployment, including the application assets and the critical `canary-config.json`.
