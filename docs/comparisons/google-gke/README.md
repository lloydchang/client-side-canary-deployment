# Canary Deployments with Google Kubernetes Engine (GKE)

This document outlines how Google Kubernetes Engine (GKE) typically supports canary deployments using server-side traffic management capabilities, and contrasts this with a client-side canary approach.

## Core Concepts of GKE Canary Deployments (Server-Side)

Server-side canary deployments on GKE involve routing a percentage of traffic to a new application version at the infrastructure level. GKE facilitates this through:

*   **GKE Ingress**:
    *   **Traffic Splitting (BackendConfig)**: GKE Ingress (especially when using Google Cloud Load Balancers) can distribute traffic between different backend services (representing stable and canary versions) based on weights. This is configured using `BackendConfig` CRDs.
    *   **Canary by Header/Cookie (Advanced)**: More advanced routing rules can be set up for canary deployments based on HTTP headers or cookies, often managed by the Ingress controller.
*   **Service Mesh (e.g., Istio, Anthos Service Mesh)**: A service mesh installed on GKE provides fine-grained traffic management capabilities, including weighted routing, request routing based on headers/paths, and features like fault injection and retry policies, all ideal for canary deployments.
*   **Kubernetes Deployments and Services**: Standard Kubernetes resources are used to deploy stable and canary application versions, which are then targeted by Ingress or service mesh routing rules.
*   **Progressive Delivery Tools (e.g., Argo Rollouts, Flagger)**: These tools can be deployed on GKE to automate canary rollouts, including traffic shifting, metric analysis (e.g., from Cloud Monitoring or Prometheus), and automated promotion/rollback.

## How GKE Facilitates Server-Side Canary

1.  **Deploy Versions**:
    *   Package stable and canary application versions as Docker images (e.g., stored in Artifact Registry).
    *   Create separate Kubernetes `Deployment` resources for `frontend-stable` and `frontend-canary`.
    *   Expose each Deployment with a distinct Kubernetes `Service` (e.g., `frontend-stable-svc`, `frontend-canary-svc`).

2.  **Configure Traffic Shifting**:
    *   **Using GKE Ingress with BackendConfig**:
        *   Define an `Ingress` resource.
        *   Create `BackendConfig` resources for your stable and canary services, specifying weights. The Ingress controller then configures the Cloud Load Balancer accordingly.
    *   **Using a Service Mesh (e.g., Istio)**:
        *   Define Istio `VirtualService` and `DestinationRule` resources to manage traffic splitting between stable and canary services based on weights or other criteria.
    *   **Using Progressive Delivery Tools**:
        *   Define a `Rollout` (Argo Rollouts) or `Canary` (Flagger) custom resource that specifies the canary strategy, including traffic splitting steps and metric analysis. These tools then manipulate underlying Deployments/Services or service mesh configurations.

3.  **Monitor and Promote/Rollback**:
    *   Monitor metrics for the canary version (e.g., from Google Cloud Monitoring, Prometheus).
    *   If healthy, gradually increase traffic to the canary.
    *   If issues arise, shift traffic back to the stable version or trigger an automated rollback.

## Comparison: GKE Server-Side Canary vs. Client-Side Canary

### GKE Server-Side Canary
*   **Mechanism**: Traffic is split at the Ingress/Load Balancer level or within a service mesh. The infrastructure decides which version a user request hits.
*   **Decision Logic**: Resides in GKE Ingress configuration, service mesh rules (e.g., Istio VirtualServices), or progressive delivery tool configurations.
*   **Scope**: Affects entire user requests routed to the canary. Suitable for testing full-stack changes.
*   **GKE Role**: Provides Ingress controllers, service mesh capabilities, and the platform for running progressive delivery tools that manage traffic.

### Client-Side Canary
*   **Mechanism**: JavaScript in the browser fetches a `canary-config.json` and decides which version of assets/features to load.
*   **Decision Logic**: Resides in client-side JavaScript.
*   **Scope**: Granular control over frontend elements, features, or user segments.
*   **GKE Role**: Hosts the different versions of frontend application pods and potentially serves the `canary-config.json` (e.g., via a ConfigMap mounted into a pod). It's not directly involved in the canary decision traffic splitting.

### Key Differences & Considerations

| Feature             | GKE Server-Side Canary                                       | Client-Side Canary (GKE for Hosting)                          |
|---------------------|--------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Ingress / Service Mesh / Progressive Delivery Tool (Server)  | User's Browser (Client)                                           |
| **Granularity**     | Per-request, entire application version/service instance     | Per-feature, per-user attribute, specific assets                  |
| **Complexity**      | Higher (Ingress rules, service mesh setup, tool configuration)| Lower infrastructure complexity for canary logic itself           |
| **Use Cases**       | Full-stack changes, backend API canaries, microservices      | UI/UX changes, frontend A/B testing, feature flagging             |
| **Rollback**        | Reconfigure Ingress/service mesh, or automated by tools      | Update `canary-config.json`                                       |
| **Monitoring**      | Cloud Monitoring, Prometheus for service health              | Client-side analytics, error tracking for canary users            |
| **Why?**            | Robust for any workload. Centralized traffic control. Integrates with Kubernetes ecosystem tools for automation and analysis. | Simpler for frontend-specific experiments. Dynamic targeting based on client-side info. Less reliance on complex GKE networking features if not already used. |

---

**Conclusion**:
GKE offers powerful server-side canary deployment capabilities through its Ingress controllers, integration with service meshes like Istio, and support for progressive delivery tools. This approach provides robust, infrastructure-level traffic management suitable for testing entire application versions and backend services. Client-side canary offers a complementary strategy, particularly for frontend changes, where GKE's role is to host the application versions and configuration, while the browser handles the canary logic. The choice depends on the deployment needs, the nature of the changes, and existing infrastructure.
