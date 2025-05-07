# Client-Side Canary Deployments with Argo CD

This document explains how Argo CD, a declarative, GitOps continuous delivery tool for Kubernetes, can support a client-side canary deployment strategy. Argo CD manages the Kubernetes resources that serve your application versions and configuration, while the client-side JavaScript handles the actual canary assignment.

## Core Concepts

In a client-side canary deployment:
1. JavaScript in the browser fetches a `canary-config.json` file.
2. This configuration specifies the canary rollout percentage.
3. The script loads assets for either the stable or canary version.

Argo CD facilitates this by:

*   **GitOps Management**: Ensuring that the state of your Kubernetes cluster (including frontend deployments and configuration) matches the desired state defined in a Git repository.
*   **Deploying Application Versions**: Managing Kubernetes `Deployment` resources for stable (`frontend-stable`) and canary (`frontend-canary`) versions of your frontend application. These deployments serve the static assets.
*   **Managing `canary-config.json`**:
    *   The `canary-config.json` data can be stored as a Kubernetes `ConfigMap` manifest within the Git repository that Argo CD monitors.
    *   When this ConfigMap manifest is updated in Git, Argo CD automatically applies the change to the cluster.
*   **Automated Synchronization**: Argo CD continuously monitors the Git repository and the live state in the Kubernetes cluster, automatically syncing changes or alerting on drift.

## How Argo CD Supports Client-Side Canary

1.  **Git Repository Structure**:
    *   Your Git repository contains Kubernetes manifests for:
        *   `Deployment` for the stable frontend version.
        *   `Deployment` for the canary frontend version.
        *   `Service` resources for these deployments.
        *   `Ingress` resource to expose the application.
        *   A `ConfigMap` manifest containing the `canary-config.json` data (e.g., `canary-config-cm.yaml`).
            ```yaml
            # canary-config-cm.yaml
            apiVersion: v1
            kind: ConfigMap
            metadata:
              name: canary-settings
            data:
              config.json: |
                {
                  "CANARY_PERCENTAGE": 10,
                  "FEATURE_FLAGS": {}
                }
            ```

2.  **Argo CD Application**:
    *   You define an Argo CD `Application` CRD that points to your Git repository and the path containing these manifests.
    *   Argo CD deploys these resources to your Kubernetes cluster (e.g., EKS, GKE, AKS).
    *   The frontend pods (e.g., Nginx) are configured to serve the `config.json` from the mounted ConfigMap (e.g., at `/app/config/canary.json`).

3.  **Updating Canary Percentage**:
    *   To change the `CANARY_PERCENTAGE`:
        1.  A developer (or an automated process) updates the `canary-config-cm.yaml` file in the Git repository (e.g., changes `CANARY_PERCENTAGE` from 10 to 20).
        2.  Commit and push the change to Git.
        3.  Argo CD detects the change in the Git repository.
        4.  Argo CD automatically syncs this change to the Kubernetes cluster, updating the `ConfigMap`.
    *   Frontend pods might need a rolling update if they don't dynamically reload the config, or if an intermediate service serves the config. Argo CD can also manage this if the Deployment spec changes (e.g., an annotation to trigger a rollout).

4.  **Client-Side Logic**:
    *   The `index.html` (served by Kubernetes pods managed by Argo CD) contains JavaScript.
    *   This script fetches `canary-config.json` (e.g., from `/app/config/canary.json`).
    *   Based on the configuration, it loads stable or canary assets (also served by pods managed by Argo CD).

## Considerations

*   **Git as Single Source of Truth**: With Argo CD, Git becomes the single source of truth for both your application deployments and the `canary-config.json`.
*   **Rollbacks**: Rollbacks are straightforward: revert the commit in Git that changed the `canary-config-cm.yaml` (or application image versions), and Argo CD will sync the cluster back to the previous state.
*   **ConfigMap Updates and Pod Restarts**: If the `canary-config.json` is served directly from a file mounted from a ConfigMap, pods might need to be restarted to pick up changes. Some strategies include:
    *   Using a tool like `Reloader` to watch for ConfigMap changes and trigger rolling updates on Deployments.
    *   Having an intermediate small service that reads the ConfigMap and serves it, which can be updated more dynamically.
    *   The client-side application fetching the config with cache-busting headers.
*   **Argo Rollouts for Server-Side Canary**: Argo CD is often used with Argo Rollouts for more advanced server-side canary deployments. If you are using Argo Rollouts, it would manage the traffic shifting between different versions of a backend service or even a frontend service at the Ingress/Service Mesh level. Client-side canary can complement this or be an alternative for purely static frontends. The `canary-config.json` for client-side logic would still be managed via GitOps by Argo CD.

Argo CD streamlines the management of Kubernetes resources needed for a client-side canary strategy by enforcing GitOps principles. It ensures that your frontend versions and the critical `canary-config.json` (as a ConfigMap) are consistently deployed and updated according to the definitions in your Git repository.
