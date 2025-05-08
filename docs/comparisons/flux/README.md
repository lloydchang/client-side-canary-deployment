# Canary Deployments with Flux (and Flagger)

This document explains how Flux, a GitOps toolkit for Kubernetes, typically supports server-side canary deployments, often in conjunction with a progressive delivery controller like Flagger. It then contrasts this with using Flux for a client-side canary strategy.

## Core Concepts of Flux for Server-Side Canary (with Flagger)

Flux itself focuses on ensuring the Kubernetes cluster state matches Git. For server-side canary deployments, Flux is commonly paired with Flagger:

*   **Flux (GitOps Automation)**:
    *   Synchronizes Kubernetes manifests from Git to the cluster. This includes `Deployment`, `Service`, `Ingress` resources, and Flagger's `Canary` custom resource.
*   **Flagger (Progressive Delivery)**:
    *   Automates canary releases and A/B testing.
    *   Manages traffic shifting by interacting with service meshes (e.g., Istio, Linkerd, App Mesh) or Ingress controllers (e.g., NGINX, Contour, Gloo, Skipper, Traefik, AWS ALB Ingress).
    *   Performs metric analysis (from Prometheus, Datadog, CloudWatch, etc.) to decide whether to promote or rollback the canary.
    *   Uses a `Canary` custom resource to define the rollout strategy.

## How Flux and Flagger Support Server-Side Canary

1.  **Git Repository Structure**:
    *   Contains standard Kubernetes manifests for the application (e.g., `Deployment`, `Service`).
    *   Includes Flagger's `Canary` custom resource manifest, defining:
        *   Target deployment.
        *   Service mesh or Ingress provider.
        *   Canary analysis steps (traffic weight, metrics, thresholds).
        *   Webhook configurations for testing.
    *   Flux `Kustomization` or `HelmRelease` resources point to these manifests.

2.  **Flux and Flagger Workflow**:
    *   **Initial Deployment**: Flux applies all manifests, including the `Deployment` and the `Canary` CR. Flagger detects the `Canary` CR and creates canary-specific resources (e.g., `my-app-primary`, `my-app-canary` deployments and services).
    *   **New Version Trigger**: A change in the application's container image tag in the `Deployment` manifest (in Git) is detected by Flux.
    *   **Flux Sync**: Flux updates the `Deployment` in the cluster.
    *   **Flagger Orchestration**:
        1.  Flagger detects the change in the target `Deployment`.
        2.  It scales up the canary deployment (`my-app-canary`) with the new version.
        3.  Gradually shifts traffic to the canary version based on the strategy in the `Canary` CR (e.g., 5%, 10%, 25% over time).
        4.  During each step, Flagger queries metrics.
        5.  If metrics are healthy, it promotes the canary (eventually replacing the primary).
        6.  If metrics fail or thresholds are breached, Flagger rolls back traffic to the primary and scales down the canary.

## Comparison: Flux/Flagger Server-Side Canary vs. Client-Side Canary (with Flux)

### Flux/Flagger Server-Side Canary
*   **Mechanism**: Flagger dynamically manipulates Kubernetes resources (Deployments, Services, Service Mesh/Ingress configurations) to shift traffic. Flux ensures these configurations are GitOps-driven.
*   **Decision Logic**: Resides in Flagger's `Canary` CR, driven by metric analysis and predefined thresholds.
*   **Scope**: Affects entire user requests routed to the canary version. Ideal for full-stack testing.
*   **Flux/Flagger Role**: Flux manages the desired state from Git (including Flagger's CRDs). Flagger executes the progressive delivery, traffic shifting, and analysis.

### Client-Side Canary (with Flux for Deployments)
*   **Mechanism**: JavaScript in the browser fetches a `canary-config.json` and decides which version of assets/features to load.
*   **Decision Logic**: Resides in client-side JavaScript.
*   **Scope**: Granular control over frontend elements.
*   **Flux Role**: Manages the deployment of different frontend application versions (as Kubernetes `Deployments`) and the `canary-config.json` (typically as a `ConfigMap`) from Git. Flux is not involved in the traffic shifting or canary decision itself.

### Key Differences & Considerations

| Feature             | Flux/Flagger Server-Side Canary                             | Client-Side Canary (Flux for Deployments)                      |
|---------------------|-------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Flagger (Server-side, metric-driven)                        | User's Browser (Client)                                           |
| **Granularity**     | Application version (pods, services)                        | Per-feature, per-user attribute, specific assets                  |
| **Automation**      | High (automated traffic shifting, metric analysis, rollback)| Flux automates deployment of assets/config from Git             |
| **Use Cases**       | Critical services, backend APIs, full-stack applications    | UI/UX changes, frontend A/B testing                               |
| **Rollback**        | Automated by Flagger based on metrics; or Git revert        | Update `canary-config.json` in Git (synced by Flux)               |
| **Why?**            | Robust, automated, metric-driven canary releases. Reduces risk for critical updates. Integrates deeply with Kubernetes networking. | Simpler for frontend-only changes if Flagger setup is too complex. Flux still provides GitOps benefits for deploying versions and config. |

**Conclusion**:
Flux, when combined with Flagger, provides a powerful GitOps-driven solution for server-side canary deployments in Kubernetes. Flagger handles the complexities of traffic shifting and metric-based analysis, while Flux ensures the cluster reflects the desired state from Git. For a client-side canary strategy, Flux can still be valuable for managing the deployment of frontend versions and the `canary-config.json` (as a ConfigMap) via GitOps, but the canary logic itself remains separate and client-driven.
