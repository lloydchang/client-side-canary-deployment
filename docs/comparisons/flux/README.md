# Client-Side Canary Deployments with Flux

This document explains how Flux, a GitOps toolkit for Kubernetes, can support a client-side canary deployment strategy. Flux ensures your Kubernetes cluster reflects the state defined in Git, which includes deploying application versions and the configuration files needed by the client-side canary logic.

## Core Concepts

In a client-side canary deployment:
1. JavaScript in the user's browser fetches a `canary-config.json` file.
2. This configuration specifies the canary rollout percentage.
3. The script then loads assets for either the stable or canary version of the application.

Flux facilitates this by:

*   **GitOps Automation**: Continuously synchronizing the Kubernetes cluster state with configurations defined in one or more Git repositories.
*   **Deploying Application Versions**: Managing Kubernetes `Deployment` resources for stable (`frontend-stable`) and canary (`frontend-canary`) versions of your frontend application. These deployments serve the static assets.
*   **Managing `canary-config.json`**:
    *   The `canary-config.json` data is typically stored as a Kubernetes `ConfigMap` manifest within the Git repository monitored by Flux.
    *   When this `ConfigMap` manifest is updated in Git, Flux automatically applies the change to the cluster.
*   **Kustomize and Helm Integration**: Flux can manage deployments using Kustomize overlays or Helm charts, allowing for sophisticated configuration management.

## How Flux Supports Client-Side Canary

1.  **Git Repository Structure**:
    *   Your Git repository (or repositories) contains Kubernetes manifests, possibly organized with Kustomize or Helm:
        *   `Deployment` for the stable frontend version.
        *   `Deployment` for the canary frontend version.
        *   `Service` resources for these deployments.
        *   `Ingress` resource to expose the application.
        *   A `ConfigMap` manifest for `canary-config.json` (e.g., `canary-config-cm.yaml`):
            ```yaml
            # manifests/base/canary-config-cm.yaml
            apiVersion: v1
            kind: ConfigMap
            metadata:
              name: canary-settings
            data:
              config.json: |
                {
                  "CANARY_PERCENTAGE": 5,
                  "FEATURE_FLAGS": {}
                }
            ```
        *   Flux `Kustomization` or `HelmRelease` resources defining how to apply these manifests.

2.  **Flux Controllers**:
    *   **Source Controller**: Fetches manifests from Git, Helm repositories, etc.
    *   **Kustomize Controller**: Applies Kustomize overlays.
    *   **Helm Controller**: Manages Helm chart releases.
    *   These controllers work together to deploy resources to your Kubernetes cluster (e.g., EKS, GKE, AKS).
    *   Frontend pods (e.g., Nginx) are configured to serve `config.json` from the mounted ConfigMap (e.g., at `/usr/share/nginx/html/config/canary.json`).

3.  **Updating Canary Percentage**:
    *   To change the `CANARY_PERCENTAGE`:
        1.  A developer (or an automated process) updates the `canary-config-cm.yaml` file (or a Kustomize patch, or Helm values file) in the Git repository.
        2.  Commit and push the change to Git.
        3.  Flux's Source Controller detects the change.
        4.  The appropriate controller (Kustomize Controller or Helm Controller) applies this change to the Kubernetes cluster, updating the `ConfigMap`.
    *   Frontend pods might need a rolling update to pick up changes if they serve the ConfigMap data as a static file and don't reload it. Tools like `Reloader` can automate this, or your Deployment spec can be updated (e.g., via an annotation change) to trigger a rollout.

4.  **Client-Side Logic**:
    *   The `index.html` (served by Kubernetes pods managed by Flux) contains JavaScript.
    *   This script fetches `canary-config.json` (e.g., from `/config/canary.json`).
    *   Based on the configuration, it loads stable or canary assets (also served by pods managed by Flux).

## Considerations

*   **Git as the Source of Truth**: Flux enforces GitOps, making Git the definitive source for your application's desired state, including the `canary-config.json`.
*   **Rollbacks**: Rollbacks are achieved by reverting commits in Git. Flux will then synchronize the cluster to the previous known good state.
*   **Image Automation**: Flux's Image Automation Controllers can monitor container image registries (like Docker Hub, ACR, GCR, ECR) for new image tags and automatically update your Git repository with the new image version, triggering a deployment. This can be used for both stable and canary application versions.
*   **Progressive Delivery with Flagger**: Flux is often used with Flagger for advanced progressive delivery (including server-side canary, A/B testing, blue/green) for applications on Kubernetes. Flagger automates the promotion or rollback of canary deployments by analyzing metrics.
    *   If using Flagger for server-side canaries of your frontend service, it would manage traffic shifting. The client-side canary logic would be a separate concern, though Flagger could deploy the different frontend versions that the client-side logic then chooses between.
*   **Security**: Flux supports features like GPG commit verification and OCI-based artifact storage for enhanced security.

Flux provides a robust GitOps framework for managing the Kubernetes resources essential for a client-side canary strategy. It ensures that your frontend versions and the critical `canary-config.json` (as a ConfigMap) are consistently deployed and updated based on the declarative configurations in your Git repository.
