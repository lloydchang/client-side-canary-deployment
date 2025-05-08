# Canary Deployments with Azure Kubernetes Service (AKS)

This document describes how Azure Kubernetes Service (AKS) typically supports canary deployments using server-side traffic management, and contrasts this with a client-side canary approach.

## Core Concepts of AKS Canary Deployments (Server-Side)

Server-side canary deployments on AKS involve routing a portion of user traffic to a new application version at the infrastructure level. AKS facilitates this through:

*   **Azure Application Gateway Ingress Controller (AGIC)**: AGIC allows Azure Application Gateway to be used as an Ingress for AKS. Application Gateway supports backend pools with weighted traffic distribution, enabling canary releases by splitting traffic between services representing stable and canary versions.
*   **Service Mesh (e.g., Istio, Linkerd, Open Service Mesh)**: Installing a service mesh on AKS provides advanced traffic management capabilities, including fine-grained weighted routing, header-based routing, and traffic mirroring, which are essential for sophisticated canary strategies.
*   **NGINX Ingress Controller (or other Ingress controllers)**: Many Ingress controllers deployed on AKS offer canary features, often through annotations or custom resources, to manage traffic splitting (e.g., `nginx.ingress.kubernetes.io/canary-*` annotations).
*   **Kubernetes Deployments and Services**: Standard Kubernetes resources deploy stable and canary application versions, targeted by Ingress or service mesh routing rules.
*   **Progressive Delivery Tools (e.g., Argo Rollouts, Flagger)**: These tools can be deployed on AKS to automate canary rollouts, including traffic shifting, metric analysis (e.g., from Azure Monitor or Prometheus), and automated promotion/rollback.

## How AKS Facilitates Server-Side Canary

1.  **Deploy Versions**:
    *   Package stable and canary application versions as Docker images (e.g., stored in Azure Container Registry - ACR).
    *   Create separate Kubernetes `Deployment` resources for `app-stable` and `app-canary`.
    *   Expose each Deployment with a distinct Kubernetes `Service` (e.g., `app-stable-svc`, `app-canary-svc`).

2.  **Configure Traffic Shifting**:
    *   **Using AGIC**: Configure backend pools in Azure Application Gateway corresponding to stable and canary services, and adjust traffic weights.
    *   **Using a Service Mesh (e.g., Istio)**: Define Istio `VirtualService` and `DestinationRule` resources to split traffic between stable and canary services.
    *   **Using NGINX Ingress**: Use canary annotations on the Ingress resource to specify the canary service, traffic weight, or header-based routing.
    *   **Using Progressive Delivery Tools**: Define a `Rollout` (Argo Rollouts) or `Canary` (Flagger) CRD. These tools then manage the underlying traffic shifting mechanisms.

3.  **Monitor and Promote/Rollback**:
    *   Monitor metrics for the canary version (e.g., Azure Monitor for containers, Prometheus).
    *   If healthy, gradually increase traffic to the canary.
    *   If issues arise, shift traffic back to the stable version or trigger an automated rollback.

## Comparison: AKS Server-Side Canary vs. Client-Side Canary

### AKS Server-Side Canary
*   **Mechanism**: Traffic is split at the Ingress/Load Balancer (e.g., Application Gateway) or within a service mesh. The infrastructure decides which version a user request hits.
*   **Decision Logic**: Resides in Ingress controller configuration (AGIC, NGINX), service mesh rules, or progressive delivery tool configurations.
*   **Scope**: Affects entire user requests routed to the canary. Suitable for testing full-stack changes.
*   **AKS Role**: Provides the Kubernetes platform, integrates with Azure networking services (like Application Gateway via AGIC), and supports service meshes and progressive delivery tools.

### Client-Side Canary
*   **Mechanism**: JavaScript in the browser fetches a `canary-config.json` and decides which version of assets/features to load.
*   **Decision Logic**: Resides in client-side JavaScript.
*   **Scope**: Granular control over frontend elements, features, or user segments.
*   **AKS Role**: Hosts the different versions of frontend application pods and potentially serves the `canary-config.json` (e.g., via a ConfigMap mounted into a pod). It's not directly involved in the canary decision traffic splitting.

### Key Differences & Considerations

| Feature             | AKS Server-Side Canary                                       | Client-Side Canary (AKS for Hosting)                          |
|---------------------|--------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Ingress / Service Mesh / Progressive Delivery Tool (Server)  | User's Browser (Client)                                           |
| **Granularity**     | Per-request, entire application version/service instance     | Per-feature, per-user attribute, specific assets                  |
| **Complexity**      | Higher (Ingress rules, service mesh setup, tool configuration)| Lower infrastructure complexity for canary logic itself           |
| **Use Cases**       | Full-stack changes, backend API canaries, microservices      | UI/UX changes, frontend A/B testing, feature flagging             |
| **Rollback**        | Reconfigure Ingress/service mesh, or automated by tools      | Update `canary-config.json`                                       |
| **Monitoring**      | Azure Monitor, Prometheus for service health                 | Client-side analytics, error tracking for canary users            |
| **Why?**            | Robust for any workload. Centralized traffic control. Integrates with Azure ecosystem tools for automation and analysis. Leverages Kubernetes strengths. | Simpler for frontend-specific experiments. Dynamic targeting based on client-side info. Less reliance on complex AKS networking features if not already used. |

**Conclusion**:
AKS provides a strong platform for server-side canary deployments through integration with Azure Application Gateway (via AGIC), support for various service meshes, and compatibility with progressive delivery tools like Argo Rollouts and Flagger. This approach offers robust, infrastructure-level traffic management for testing entire application versions. Client-side canary is a distinct strategy, mainly for frontend changes, where AKS would host application versions and configuration, with the browser handling canary logic. The best approach depends on specific requirements and existing infrastructure.
