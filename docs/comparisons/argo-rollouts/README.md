# Canary Deployments with Argo Rollouts (Server-Side)

This document explains Argo Rollouts, a Kubernetes controller designed for server-side progressive delivery, including advanced canary deployments. It then contrasts this with a client-side canary strategy.

## Argo Rollouts: Server-Side Progressive Delivery

Argo Rollouts is a Kubernetes controller that provides advanced deployment strategies like canary and blue-green. It is specifically designed for **server-side** progressive delivery.

Key features include:

*   **Advanced Traffic Shaping**: Argo Rollouts precisely controls the percentage of traffic sent to a new (canary) version of an application. It integrates with various service meshes (e.g., Istio, Linkerd, AWS App Mesh) and Ingress controllers (e.g., NGINX, Traefik, AWS ALB Ingress Controller) to manage traffic.
*   **Automated Analysis & Promotion/Rollback**: It can query metrics from providers (like Prometheus, Datadog, New Relic, CloudWatch) during a rollout. Based on the analysis of these metrics against predefined success criteria, Argo Rollouts can automatically promote the canary to production or roll it back.
*   **Declarative Configuration**: Rollout strategies are defined via a custom Kubernetes resource called `Rollout`. This CRD replaces the standard `Deployment` object for applications managed by Argo Rollouts.
*   **Blue/Green Deployments**: Besides canary, it also supports blue/green deployments with similar traffic management and analysis capabilities.

## How Argo Rollouts Facilitates Server-Side Canary

1.  **Define `Rollout` Resource**:
    *   Replace your Kubernetes `Deployment` with an Argo Rollouts `Rollout` resource.
    *   In the `Rollout` spec, define the canary strategy:
        *   `steps`: A list of actions, such as setting traffic weights (e.g., send 10% to canary), pausing for analysis, or pausing for manual approval.
        *   `analysis`: Configuration for querying metrics from providers and defining success/failure conditions.
        *   Integration with a service mesh or Ingress controller for traffic management.

2.  **Triggering a Rollout**:
    *   Updating the pod template in the `Rollout` resource (e.g., changing the container image tag) triggers a new rollout.

3.  **Execution by Argo Rollouts Controller**:
    *   The controller creates a new ReplicaSet for the canary version.
    *   It executes the defined steps:
        *   Adjusts traffic weights via the configured service mesh or Ingress controller.
        *   Pauses for analysis, querying metrics.
        *   If analysis passes (or manual approval is given), proceeds to the next step or promotes the canary.
        *   If analysis fails, it rolls back the canary version and aborts the rollout.

## Comparison: Argo Rollouts (Server-Side) vs. Client-Side Canary

### Argo Rollouts (Server-Side Canary)
*   **Mechanism**: Argo Rollouts controller manipulates underlying Kubernetes resources (ReplicaSets, Services) and integrates with service meshes/Ingress controllers to shift traffic at the server/infrastructure level.
*   **Decision Logic**: Defined declaratively in the `Rollout` CRD, driven by metric analysis and predefined steps.
*   **Scope**: Affects entire user requests routed to the canary version. Ideal for testing full-stack changes, backend services, and critical frontend applications.
*   **Argo Rollouts Role**: Actively manages the entire lifecycle of the progressive delivery, including traffic shaping, metric analysis, and automated promotion or rollback.

### Client-Side Canary
*   **Mechanism**: JavaScript in the user's browser fetches a configuration file (e.g., `canary-config.json`) and decides whether to load stable or canary assets/features.
*   **Decision Logic**: Resides in the client-side JavaScript.
*   **Scope**: Can be more granular (e.g., specific features, UI components, user segments). Primarily for frontend changes.
*   **Argo Rollouts Role (Indirect)**: Argo Rollouts would not directly manage the client-side canary logic. However, it could be used to deploy the Kubernetes `Deployments` that serve the different frontend asset versions and the `ConfigMap` for `canary-config.json`, if a `Rollout` object was used instead of a standard `Deployment` for these frontend servers. But this is not its primary use case for client-side canary.

### Key Differences & Considerations

| Feature             | Argo Rollouts (Server-Side)                                  | Client-Side Canary                                                |
|---------------------|--------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Argo Rollouts Controller / Service Mesh / Ingress (Server)   | User's Browser (Client)                                           |
| **Granularity**     | Application version (pods, ReplicaSets)                      | Per-feature, per-user attribute, specific assets                  |
| **Automation**      | High (automated traffic shifting, metric analysis, promotion/rollback) | Canary logic is custom; deployment of assets/config can be automated |
| **Complexity**      | Higher (requires understanding Rollouts CRD, service mesh/Ingress integration, metric setup) | Simpler for the canary logic itself; infrastructure for assets/config can be simple (e.g., S3) or complex (Kubernetes) |
| **Use Cases**       | Critical services, backend APIs, full-stack applications requiring robust, automated, metric-driven rollouts | UI/UX changes, frontend A/B testing, feature flagging, especially on static sites or when fine-grained client control is needed |
| **Rollback**        | Automated by Argo Rollouts based on metrics or manual trigger| Update `canary-config.json` (e.g., set canary percentage to 0)    |
| **Why?**            | Provides very robust, automated, and safe deployments for critical applications on Kubernetes. Reduces risk through metric-driven decisions. Standardizes complex deployment strategies. | Offers flexibility for frontend experiments directly controlled by frontend teams. Can be simpler to implement for UI changes if advanced server-side infrastructure is not already in place or desired. |

**Conclusion**:
Argo Rollouts is a powerful, specialized tool for **server-side** progressive delivery in Kubernetes, offering sophisticated canary and blue-green deployment strategies with automated traffic shaping and metric-driven analysis. It is ideal for reducing the risk of deploying new versions of critical applications.

Client-side canary is a distinct approach where the canary logic resides in the browser. While Argo Rollouts *could* deploy the Kubernetes resources that serve assets for a client-side canary, its strengths lie in managing server-side traffic and automated rollouts. The two strategies address different layers of the deployment process and can be chosen based on whether control and analysis need to be server-side and infrastructure-managed, or client-side and application-managed.
