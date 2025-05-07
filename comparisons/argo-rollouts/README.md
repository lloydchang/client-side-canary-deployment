# Client-Side Canary Deployments and Argo Rollouts

This document clarifies the relationship between a client-side canary deployment strategy and Argo Rollouts, a Kubernetes controller for progressive delivery. While they can coexist, they address canary deployments at different layers.

## Argo Rollouts: Server-Side Progressive Delivery

Argo Rollouts provides advanced deployment capabilities like canary, blue-green, and automated analysis directly within Kubernetes. Key features include:

*   **Fine-grained Traffic Shaping**: Argo Rollouts can precisely control the percentage of traffic sent to a new (canary) version of an application at the Kubernetes service or Ingress level, often integrating with service meshes (like Istio, Linkerd) or Ingress controllers (like NGINX, ALB Ingress Controller).
*   **Automated Analysis**: It can query metrics from providers (like Prometheus, Datadog, New Relic) during a rollout to automatically promote or rollback the canary based on its performance.
*   **Declarative Configuration**: Rollout strategies are defined via a custom Kubernetes resource (`Rollout`).

**Argo Rollouts primarily implements *server-side* canary deployments.** The decision of which version a user sees is made by the infrastructure (service mesh, load balancer) based on the Rollout strategy, before the request even reaches the application pod in many cases, or by routing to different backend pods.

## Client-Side Canary Deployments

As detailed in this repository, client-side canary deployment involves:
1. JavaScript in the user's browser fetching a `canary-config.json` file.
2. This configuration (e.g., `{"CANARY_PERCENTAGE": 10}`) dictates the assignment.
3. The client-side script then decides whether to load stable or canary assets/features.

**The decision logic is entirely within the client's browser.**

## How They Can Coexist or Relate

1.  **Serving Different Frontend Asset Versions**:
    *   You might have two distinct versions of your frontend application (e.g., `frontend-v1` for stable, `frontend-v2` for canary) packaged as Docker images.
    *   Argo Rollouts *could* be used to manage the deployment of the pods serving these static assets. For instance, you could have a `Rollout` resource that gradually introduces pods running `frontend-v2`.
    *   However, for purely static frontends where the client makes the choice, a simpler Kubernetes `Deployment` for each version (stable and canary) might suffice. The client-side logic would then fetch assets from `/stable/bundle.js` or `/canary/bundle.js` based on its own decision.

2.  **Managing `canary-config.json`**:
    *   The `canary-config.json` file, which drives the client-side decision, would typically be managed as a Kubernetes `ConfigMap`.
    *   This ConfigMap can be deployed and updated using standard Kubernetes practices, potentially via GitOps tools like Argo CD (which is often used alongside Argo Rollouts).
    *   Argo Rollouts itself doesn't directly manage this client-specific configuration file, but the CI/CD process that triggers an Argo Rollout for a backend might also update this `canary-config.json` for the frontend.

3.  **Complementary Strategies**:
    *   **Backend Canaries with Argo Rollouts, Frontend Canaries Client-Side**: You could use Argo Rollouts for canaries of your backend APIs, while the frontend uses a client-side canary strategy to test new UI features that consume these (or older) backend APIs. The `canary-config.json` for the frontend could enable features that specifically target a canary version of a backend API endpoint.
    *   **Informing Client-Side Config**: The success or failure of a backend canary managed by Argo Rollouts could inform the decision to increase the percentage in the client-side `canary-config.json`.

4.  **Different Use Cases**:
    *   **Argo Rollouts**: Ideal for microservices, backend APIs, or when infrastructure-level traffic control is desired for any application component. It offers robust automated analysis and rollback based on metrics.
    *   **Client-Side Canary**: Particularly useful for static frontends, testing UI changes, or when fine-grained control within the client (based on user attributes, etc.) is needed without complex infrastructure changes. It's simpler for purely static sites hosted on CDNs or basic storage.

## When to Choose Which (or Both)

*   **If you need infrastructure-level traffic splitting, automated metric analysis for promotion/rollback for any service (frontend or backend) running on Kubernetes**: Use Argo Rollouts.
*   **If you want to test frontend changes (UI, UX) with decisions made in the browser, especially for static sites, and want to manage rollout percentages via a simple JSON config**: Use client-side canary.
*   **If your frontend (served via Kubernetes) needs to interact with backend services that are being canaried using Argo Rollouts**: The client-side logic can be made aware of different backend endpoints, or the `canary-config.json` can toggle features that use these canary backends.

**Key Distinction**: Argo Rollouts shifts *server-side traffic* to different application *instances/versions*. Client-side canary shifts *user experience within the browser* by loading different *assets or enabling features* based on a client-fetched configuration.

While Argo Rollouts is a powerful tool for server-side progressive delivery, the client-side canary mechanism described in this repository operates independently at the browser level. They can be used in conjunction where Argo Rollouts manages backend services or even the deployment of different frontend server versions, while the client-side JavaScript still uses its `canary-config.json` to make the final rendering decision.
