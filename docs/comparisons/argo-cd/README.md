# Canary Deployments with Argo CD (and Argo Rollouts/Flagger)

This document explains how Argo CD, a GitOps continuous delivery tool, typically supports server-side canary deployments in Kubernetes, usually by managing resources for progressive delivery controllers like Argo Rollouts or Flagger. It then contrasts this with using Argo CD for a client-side canary strategy.

## Core Concepts of Argo CD for Server-Side Canary (with Argo Rollouts/Flagger)

Argo CD itself is a GitOps engine that ensures the Kubernetes cluster state matches the configuration in Git. For server-side canary deployments, it's commonly paired with:

*   **Argo CD (GitOps Management)**:
    *   Synchronizes Kubernetes manifests from a Git repository to the cluster.
    *   Manages the lifecycle of applications defined in Git, including `Deployment`, `Service`, `Ingress` resources, and custom resources for progressive delivery tools.
*   **Argo Rollouts or Flagger (Progressive Delivery Execution)**:
    *   These tools execute the canary deployment strategy (traffic shifting, metric analysis, automated promotion/rollback).
    *   Argo CD deploys and manages the `Rollout` (for Argo Rollouts) or `Canary` (for Flagger) custom resources, along with the application's base manifests.

## How Argo CD Supports Server-Side Canary (with Argo Rollouts/Flagger)

1.  **Git Repository Structure**:
    *   Contains all Kubernetes manifests, including:
        *   Standard application manifests (e.g., `Deployment` or the base for a `Rollout`).
        *   `Service` and `Ingress` manifests.
        *   The `Rollout` (Argo Rollouts) or `Canary` (Flagger) custom resource defining the canary strategy (steps, analysis, traffic management integration).
    *   These are organized in a way Argo CD can consume (e.g., plain manifests, Helm charts, Kustomize overlays).

2.  **Argo CD Application**:
    *   An Argo CD `Application` CRD is defined, pointing to the Git repository path containing the above manifests.
    *   Argo CD applies these manifests to the cluster. This deploys the application and tells Argo Rollouts/Flagger how to manage its progressive delivery.

3.  **Triggering and Managing the Canary Rollout**:
    *   **Change in Git**: A developer updates the application's image tag or any other relevant configuration in the Git repository.
    *   **Argo CD Sync**: Argo CD detects the change and syncs the manifests to the cluster. This might update the pod template in a `Rollout` resource or a `Deployment` monitored by Flagger.
    *   **Argo Rollouts/Flagger Execution**: The progressive delivery controller (Argo Rollouts or Flagger) takes over:
        *   It initiates the canary process based on its custom resource definition.
        *   Performs traffic shifting, metric analysis, and automated promotion or rollback.
    *   Argo CD provides visibility into the sync status of these resources and the overall application health, often reflecting the status reported by Argo Rollouts/Flagger.

## Comparison: Argo CD with Server-Side Tools vs. Client-Side Canary (with Argo CD)

### Argo CD with Argo Rollouts/Flagger (Server-Side Canary)
*   **Mechanism**: Argo Rollouts/Flagger manage the server-side traffic shifting and analysis. Argo CD ensures that the declarative configuration for the application and its canary strategy (defined in Git) is applied and maintained in the cluster.
*   **Decision Logic**: Resides in the `Rollout` or `Canary` CRD, executed by Argo Rollouts/Flagger, often driven by metrics.
*   **Scope**: Affects entire user requests routed to the canary version. Ideal for full-stack testing.
*   **Argo CD Role**: GitOps engine for all Kubernetes resources, including those that define and enable server-side canary. It doesn't perform traffic shifting itself but ensures the tools that do are correctly configured as per Git.

### Client-Side Canary (with Argo CD for Deployments)
*   **Mechanism**: JavaScript in the browser fetches a `canary-config.json` and decides which version of assets/features to load.
*   **Decision Logic**: Resides in client-side JavaScript.
*   **Scope**: Granular control over frontend elements.
*   **Argo CD Role**: Manages the deployment of different frontend application versions (as Kubernetes `Deployments`) and the `canary-config.json` (typically as a `ConfigMap`) from Git. Argo CD ensures these specific resources are in the desired state.

### Key Differences & Considerations

| Feature             | Argo CD + Server-Side Tools (e.g., Rollouts)                | Client-Side Canary (Argo CD for Deployments)                  |
|---------------------|-------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Argo Rollouts/Flagger (Server-side, metric-driven)          | User's Browser (Client)                                           |
| **Granularity**     | Application version (pods, services)                        | Per-feature, per-user attribute, specific assets                  |
| **Automation**      | High (GitOps for config; automated execution by Rollouts/Flagger) | Argo CD automates deployment of assets/config from Git             |
| **Use Cases**       | Critical services, backend APIs, full-stack applications    | UI/UX changes, frontend A/B testing                               |
| **Rollback**        | Automated by Rollouts/Flagger; or Git revert synced by Argo CD | Update `canary-config.json` in Git (synced by Argo CD)            |
| **Why?**            | Robust, automated, metric-driven canary releases via GitOps. Reduces risk for critical updates. Centralizes deployment strategy in Git. | Simpler for frontend-only changes if progressive delivery tools are overkill. Argo CD still provides strong GitOps benefits for deploying versions and config. |

---

**Conclusion**:
Argo CD, when paired with progressive delivery controllers like Argo Rollouts or Flagger, provides a comprehensive GitOps solution for server-side canary deployments in Kubernetes. Argo CD handles the declarative configuration management from Git, while Argo Rollouts/Flagger execute the complex traffic shifting and analysis. For a client-side canary strategy, Argo CD is highly effective for managing the deployment of frontend application versions and the `canary-config.json` (as a ConfigMap) using GitOps principles, even though the canary decision logic itself is client-driven.
