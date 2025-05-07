# Client-Side Canary Deployments with PipeCD

This document explores how PipeCD, a continuous delivery platform focused on GitOps for various application types, can support a client-side canary deployment strategy. PipeCD helps manage the deployment of application versions and configuration files, while the client-side JavaScript handles the canary assignment logic.

## Core Concepts

In a client-side canary deployment:
1. JavaScript in the user's browser fetches a `canary-config.json` file.
2. This configuration specifies the canary rollout percentage.
3. The script then loads assets for either the stable or canary version of the application.

PipeCD can facilitate this by:

*   **GitOps-centric CD**: Managing deployments based on configurations defined in a Git repository (the "App manifest").
*   **Multi-Platform Support**: Deploying various application types, including:
    *   Kubernetes applications.
    *   Cloud Run services.
    *   AWS Lambda functions.
    *   Static sites to cloud storage (e.g., S3, GCS).
*   **Deploying Application Versions**: Managing the deployment of stable and canary versions of your frontend application assets.
*   **Managing `canary-config.json`**:
    *   If deploying to Kubernetes, `canary-config.json` can be a `ConfigMap` defined in Git and managed by PipeCD.
    *   If deploying static sites to cloud storage, PipeCD can manage the upload of the `canary-config.json` file alongside other assets.
*   **Progressive Delivery Features**: PipeCD has built-in support for canary, blue/green, and metrics-based analysis for supported application kinds (primarily Kubernetes, Cloud Run, Lambda).

## How PipeCD Supports Client-Side Canary

The approach depends on where your frontend application and `canary-config.json` are hosted.

### 1. Frontend on Kubernetes (Managed by PipeCD)

1.  **Git Repository**:
    *   Contains Kubernetes manifests for:
        *   Stable frontend `Deployment`.
        *   Canary frontend `Deployment`.
        *   `ConfigMap` for `canary-config.json`.
    *   PipeCD application manifest (`app.pipecd.yaml`) defines the application, pointing to these manifests.

2.  **PipeCD Workflow**:
    *   When manifests (e.g., image version for canary, or data in `ConfigMap` for `canary-config.json`) are updated in Git:
        *   PipeCD detects the change.
        *   It plans and executes the deployment according to the strategy defined (e.g., simple sync, or a more advanced canary if PipeCD is managing traffic for the frontend service itself - though this leans towards server-side canary).
        *   For client-side canary, the key is that PipeCD updates the `ConfigMap` containing `canary-config.json` and deploys the pods serving stable/canary assets.

3.  **Client-Side Logic**: Consumes `canary-config.json` served by Kubernetes pods.

### 2. Static Frontend on Cloud Storage (e.g., S3, GCS - Managed by PipeCD)

PipeCD doesn't have a dedicated "static site" application kind out-of-the-box as of my last update, but custom deployment logic can be implemented, or it might be added in the future. Conceptually:

1.  **Git Repository**:
    *   Contains the static site assets (HTML, CSS, JS for stable and canary versions).
    *   Includes `canary-config.json`.
    *   PipeCD application manifest might define a custom deployment process.

2.  **PipeCD Workflow (Conceptual for Static Sites)**:
    *   A custom job/script executed by PipeCD:
        *   Builds the static site.
        *   Uploads stable assets to `s3://my-bucket/stable/`.
        *   Uploads canary assets to `s3://my-bucket/canary/`.
        *   Uploads `canary-config.json` to `s3://my-bucket/config/`.
    *   Changes to `canary-config.json` in Git would trigger PipeCD to re-upload this file.

3.  **Client-Side Logic**: Fetches `canary-config.json` from cloud storage.

## Updating Canary Percentage with PipeCD

1.  **Modify Config in Git**: Update the `canary-config.json` content (whether as a raw file for static sites or as data in a `ConfigMap` manifest for Kubernetes) in your Git repository.
2.  **Commit and Push**: Push the changes to Git.
3.  **PipeCD Sync**: PipeCD detects the commit and plans a new deployment.
    *   For Kubernetes, it applies the updated `ConfigMap`.
    *   For static sites (conceptual), it re-uploads the modified `canary-config.json`.
4.  **Client Impact**: Clients fetching the `canary-config.json` will get the new percentages.

## Considerations

*   **PipeCD's Progressive Delivery**: PipeCD's built-in canary and analysis features are primarily for server-side traffic shifting and health checks of application instances (Kubernetes, Cloud Run, Lambda).
    *   If you use PipeCD's canary for your frontend *service* on Kubernetes, it's a server-side canary.
    *   For client-side canary, PipeCD's role is more about deploying the *assets* and the *config file* that the client uses.
*   **Customization**: PipeCD's design allows for custom deployment logic, which could be leveraged for managing static site deployments if not directly supported.
*   **Focus on GitOps**: PipeCD strongly adheres to GitOps principles, making Git the source of truth for deployment configurations.
*   **Piped**: The control plane component of PipeCD, `piped`, runs in your environment (e.g., Kubernetes cluster) and executes deployments.

PipeCD can support client-side canary deployments by managing the deployment of different frontend versions and the crucial `canary-config.json` file through a GitOps workflow. While its advanced progressive delivery features are more aligned with server-side canaries, its core GitOps capabilities are valuable for maintaining the infrastructure needed by a client-side strategy.
