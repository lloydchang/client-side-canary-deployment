# Canary Deployments with Flagger (Server-Side)

This document explains Flagger, a progressive delivery operator for Kubernetes, focusing on its capabilities for server-side canary deployments. It then contrasts this with a client-side canary strategy.

## Core Concepts of Flagger Canary Deployments (Server-Side)

Flagger is a Kubernetes operator that automates the release process for applications running on Kubernetes. It specializes in server-side progressive delivery, reducing the risk of introducing a new software version in production by gradually shifting traffic to the new version while measuring metrics and running conformance tests.

Key features include:

*   **Progressive Delivery Operator**: Flagger works by managing a `Canary` custom resource in Kubernetes. This resource defines the target workload (e.g., a `Deployment`), the canary analysis parameters, and the traffic routing configuration.
*   **Integration with Service Meshes and Ingress Controllers**:
    *   **Service Meshes**: Istio, Linkerd, AWS App Mesh, Kuma, Open Service Mesh (OSM).
    *   **Ingress Controllers**: NGINX, Traefik, Gloo Edge, Contour, Skipper, AWS Application Load Balancer (ALB) Ingress Controller.
    Flagger uses these integrations to control traffic shifting between stable (primary) and canary versions.
*   **Automated Canary Analysis**: Flagger can query metrics from various providers (e.g., Prometheus, Datadog, Amazon CloudWatch, Google Cloud Monitoring, New Relic) to analyze the health of the canary version.
*   **Automated Promotion or Rollback**: Based on the success of the canary analysis (metrics thresholds, webhook checks), Flagger automatically promotes the canary to replace the primary version or rolls it back if issues are detected.
*   **Extensible Webhooks**: Flagger can be configured to call out to webhooks for running load tests, acceptance tests, or any other custom validation during the canary process.

## How Flagger Facilitates Server-Side Canary

1.  **Define `Canary` Resource**:
    *   A user defines a `Canary` custom resource in Kubernetes. This manifest specifies:
        *   The target `Deployment` or `DaemonSet` to manage.
        *   The service mesh or Ingress provider to use for traffic routing.
        *   The canary analysis strategy:
            *   `stepWeights` or `stepPercentages`: How much traffic to shift at each step.
            *   `interval`: How long to wait between steps.
            *   `threshold`: The maximum number of failed canary analyses before rollback.
            *   `metrics`: Queries and thresholds for key performance indicators (KPIs).
            *   `webhooks`: For running conformance tests, load tests, or other custom checks.

2.  **Flagger Initialization**:
    *   Flagger detects the `Canary` resource.
    *   It creates corresponding primary and canary `Deployments` (e.g., `app-primary`, `app-canary`) and services.
    *   It configures the service mesh or Ingress controller to route traffic initially to the primary version.

3.  **Triggering a Canary Release**:
    *   When a change is made to the target `Deployment` (e.g., updating the container image tag), Flagger detects this change.

4.  **Flagger Orchestration**:
    *   Flagger scales up the canary `Deployment` with the new version.
    *   It starts the canary analysis process according to the defined steps:
        *   Gradually shifts a percentage of traffic to the canary version.
        *   Runs conformance tests via webhooks (if configured).
        *   Queries metrics from the configured provider.
        *   Evaluates metrics against defined thresholds.
    *   **Promotion**: If all analysis steps pass (metrics are healthy, webhooks succeed), Flagger gradually shifts 100% of traffic to the canary version and then promotes the canary `Deployment` to become the new primary. The old primary is scaled down.
    *   **Rollback**: If any analysis step fails (metrics exceed thresholds, webhooks fail, or the number of failed iterations exceeds the threshold), Flagger aborts the canary release, shifts all traffic back to the primary version, and scales down the canary `Deployment`.

## Comparison: Flagger Server-Side Canary vs. Client-Side Canary

### Flagger Server-Side Canary
*   **Mechanism**: Flagger controller directly manipulates Kubernetes resources (Deployments, Services) and configures service meshes or Ingress controllers to manage traffic routing at the infrastructure level.
*   **Decision Logic**: Defined declaratively in the `Canary` CRD, driven by automated metric analysis, webhook test results, and predefined rollout steps.
*   **Scope**: Affects entire user requests/sessions routed to the canary version. Ideal for testing full-stack changes, including backend services and critical frontend applications.
*   **Flagger Role**: Actively orchestrates the entire progressive delivery lifecycle: traffic shaping, metric analysis, conformance testing, and automated promotion or rollback.

### Client-Side Canary
*   **Mechanism**: JavaScript running in the user's browser fetches a configuration file (e.g., `canary-config.json`) and decides locally whether to load stable or canary assets/features.
*   **Decision Logic**: Resides in the client-side JavaScript code.
*   **Scope**: Can be highly granular, targeting specific UI components, features, or user segments. Primarily suited for frontend changes.
*   **Flagger Role (Indirect/None)**: Flagger is not designed for client-side canary decision-making. While Kubernetes (which Flagger runs on) would host the Deployments serving the different frontend asset versions and potentially a ConfigMap for `canary-config.json`, Flagger itself would not be involved in the client-side logic or the distribution of the `canary-config.json`.

### Key Differences & Considerations

| Feature             | Flagger Server-Side Canary                                   | Client-Side Canary                                                |
|---------------------|--------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Flagger Controller / Service Mesh / Ingress (Server)         | User's Browser (Client)                                           |
| **Granularity**     | Application version (pods, ReplicaSets)                      | Per-feature, per-user attribute, specific assets                  |
| **Automation**      | High (automated traffic shifting, metric analysis, conformance testing, promotion/rollback) | Canary logic is custom; deployment of assets/config can be automated by other CI/CD tools |
| **Complexity**      | Higher (requires Kubernetes, service mesh/Ingress, `Canary` CRD understanding, metric/webhook setup) | Simpler for the canary logic itself; infrastructure for assets/config can be simpler (e.g., static hosting) or Kubernetes-based |
| **Use Cases**       | Critical services, backend APIs, microservices, full-stack applications requiring robust, automated, metric-driven rollouts | UI/UX changes, frontend A/B testing, feature flagging, especially when fine-grained client-side control or static hosting is preferred |
| **Rollback**        | Automated by Flagger based on metrics/tests or manual trigger via GitOps | Update `canary-config.json` (e.g., set canary percentage to 0), potentially deployed via CI/CD |
| **Why Flagger Server-Side?** | Provides extremely robust, automated, and safe deployments for applications on Kubernetes. Reduces risk significantly through comprehensive metric analysis and conformance testing. Standardizes complex deployment strategies. Deep integration with Kubernetes ecosystem. |
| **Why Client-Side?** | Offers greater flexibility for frontend experiments directly controlled by frontend teams or product managers. Can be simpler to implement for UI-specific changes if advanced server-side infrastructure (like a service mesh) is not already in place or desired. Allows for dynamic targeting based on client-side attributes. |

**Conclusion**:
Flagger is a powerful and specialized tool for **server-side** progressive delivery in Kubernetes. It excels at automating canary releases (and other strategies like A/B testing and blue/green) by leveraging service meshes and Ingress controllers for traffic management, and by performing automated analysis of metrics and conformance tests. This makes it ideal for reducing the risk of deploying new versions of critical applications and microservices.

Client-side canary is a distinct approach where the canary logic and decision-making reside in the browser. While the Kubernetes cluster (where Flagger operates) might host the backend services or even the static assets for a client-side canary, Flagger itself is not involved in managing the client-side canary logic. The two strategies address different aspects of deployment and can be chosen based on whether the control, traffic shifting, and analysis need to be server-side and infrastructure-managed (Flagger) or client-side and application-managed.
