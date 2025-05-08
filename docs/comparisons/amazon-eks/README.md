# Canary Deployments with Amazon EKS (Server-Side)

This document outlines how Amazon Elastic Kubernetes Service (EKS) typically supports server-side canary deployments using various Kubernetes-native and AWS-integrated traffic management solutions. It then contrasts this with a client-side canary approach.

## Core Concepts of EKS Canary Deployments (Server-Side)

Server-side canary deployments on EKS involve routing a percentage of traffic to a new application version at the infrastructure level. EKS, as a managed Kubernetes service, supports several mechanisms:

*   **AWS Load Balancer Controller**:
    *   **Ingress Traffic Splitting**: Allows weighted distribution of traffic across multiple backend services (representing stable and canary versions) when using an Application Load Balancer (ALB) as the Ingress. This is configured via Ingress annotations or by defining multiple backend targets with weights.
*   **Service Mesh (e.g., Istio, Linkerd, AWS App Mesh)**:
    *   Installing a service mesh on EKS provides fine-grained traffic control, enabling weighted routing, header-based routing, and other advanced canary strategies between services within the cluster.
*   **Progressive Delivery Tools (e.g., Argo Rollouts, Flagger)**:
    *   These Kubernetes-native tools can be deployed on EKS to automate canary rollouts. They integrate with service meshes or Ingress controllers (like AWS Load Balancer Controller) to manage traffic, analyze metrics (from CloudWatch, Prometheus, etc.), and automate promotion/rollback.
*   **Standard Kubernetes Resources**: `Deployments` and `Services` are used to run the stable and canary application versions, which are then targeted by the traffic management solutions.

## How EKS Facilitates Server-Side Canary

1.  **Deploy Application Versions**:
    *   Package stable and canary application versions as Docker images (e.g., stored in Amazon ECR).
    *   Create separate Kubernetes `Deployment` resources for `app-stable` and `app-canary`.
    *   Expose each Deployment with a distinct Kubernetes `Service`.

2.  **Configure Traffic Shifting**:
    *   **Using AWS Load Balancer Controller**:
        *   Define an `Ingress` resource. Use annotations to specify multiple backend services with weights (e.g., `alb.ingress.kubernetes.io/actions.<action-name>` to define forward rules with weighted target groups).
    *   **Using a Service Mesh (e.g., Istio on EKS)**:
        *   Define Istio `VirtualService` and `DestinationRule` resources to split traffic between stable and canary services based on weights or other criteria.
    *   **Using Progressive Delivery Tools (e.g., Flagger on EKS)**:
        *   Deploy Flagger and define a `Canary` custom resource. Flagger will then manage the canary `Deployment`, create primary and canary services, and interact with the chosen Ingress controller or service mesh to shift traffic and analyze metrics.

3.  **Monitor and Promote/Rollback**:
    *   Monitor metrics for the canary version (e.g., using Amazon CloudWatch Container Insights, Prometheus).
    *   If healthy, gradually increase traffic to the canary version.
    *   If issues arise, shift traffic back to the stable version or rely on automated rollback features of tools like Flagger or Argo Rollouts.

## Comparison: EKS Server-Side Canary vs. Client-Side Canary

### EKS Server-Side Canary
*   **Mechanism**: Traffic is split at the Ingress/Load Balancer level (e.g., ALB via AWS Load Balancer Controller) or within a service mesh. The Kubernetes infrastructure, potentially managed by tools like Flagger/Argo Rollouts, decides which version a user request hits.
*   **Decision Logic**: Resides in Ingress controller configurations, service mesh rules, or progressive delivery tool configurations (e.g., Flagger `Canary` CRD).
*   **Scope**: Affects entire user requests routed to the canary. Suitable for testing full-stack changes.
*   **EKS Role**: Provides the managed Kubernetes platform, integrates with AWS services like ALB, and supports the deployment of service meshes and progressive delivery tools.

### Client-Side Canary
*   **Mechanism**: JavaScript in the browser fetches a `canary-config.json` and decides which version of assets/features to load.
*   **Decision Logic**: Resides in client-side JavaScript.
*   **Scope**: Granular control over frontend elements, features, or user segments.
*   **EKS Role**: Hosts the different versions of frontend application pods and potentially serves the `canary-config.json` (e.g., via a ConfigMap mounted into a pod). EKS is not directly involved in the canary decision traffic splitting for this approach.

### Key Differences & Considerations

| Feature             | EKS Server-Side Canary                                       | Client-Side Canary (EKS for Hosting)                          |
|---------------------|--------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Ingress / Service Mesh / Progressive Delivery Tool (Server)  | User's Browser (Client)                                           |
| **Granularity**     | Per-request, entire application version/service instance     | Per-feature, per-user attribute, specific assets                  |
| **Complexity**      | Higher (Ingress rules, service mesh setup, tool configuration)| Lower infrastructure complexity for the canary logic itself       |
| **Use Cases**       | Full-stack changes, backend API canaries, microservices      | UI/UX changes, frontend A/B testing, feature flagging             |
| **Rollback**        | Reconfigure Ingress/service mesh, or automated by tools      | Update `canary-config.json`                                       |
| **Monitoring**      | CloudWatch, Prometheus for service health                    | Client-side analytics, error tracking for canary users            |
| **Why?**            | Robust for any workload. Centralized traffic control. Integrates with Kubernetes ecosystem tools (Flagger, Argo Rollouts) and AWS services (ALB, CloudWatch) for automation and analysis. | Simpler for frontend-specific experiments. Dynamic targeting based on client-side info. Less reliance on complex EKS networking features if those are not already in use for other purposes. |

**Conclusion**:
Amazon EKS provides a versatile and powerful platform for implementing server-side canary deployments. By leveraging the AWS Load Balancer Controller, service meshes, and progressive delivery tools like Flagger or Argo Rollouts, teams can perform robust, automated, and metric-driven canary releases for applications running on EKS. Client-side canary offers a different paradigm, focusing on frontend changes with browser-based decision logic. For this, EKS serves as a reliable host for application versions and configuration files. The choice between them depends on the specific application, the nature of the changes being deployed, and the desired level of infrastructure involvement in the canary process.
