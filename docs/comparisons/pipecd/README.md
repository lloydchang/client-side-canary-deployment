# Canary Deployments with PipeCD

This document explores how PipeCD, a continuous delivery platform, typically handles canary deployments through its built-in progressive delivery features, and contrasts this with a client-side canary strategy.

## Core Concepts of PipeCD Canary Deployments (Server-Side)

PipeCD provides native support for server-side canary deployments for several platforms. The core idea is that PipeCD automates the gradual rollout of a new version, shifting traffic and often analyzing metrics before full promotion.

*   **GitOps-centric CD**: Manages deployments based on configurations in Git.
*   **Progressive Delivery**:
    *   **Kubernetes**: PipeCD can directly manage traffic shifting (e.g., by updating Service weights or working with Service Mesh custom resources) and analyze metrics from providers like Prometheus.
    *   **Cloud Run**: Similar capabilities for traffic splitting between revisions.
    *   **AWS Lambda**: Manages weighted aliases for traffic shifting.
    *   **Amazon ECS**: Leverages AWS CodeDeploy for Blue/Green deployments, which PipeCD orchestrates. This provides a controlled, server-side progressive rollout that can serve as a canary mechanism by gradually shifting traffic to the new version and allowing for testing before full cutover.
*   **Automated Analysis**: For supported platforms (primarily Kubernetes), PipeCD can query metrics during the canary phase and automatically promote or rollback based on predefined criteria.

## How PipeCD Supports Server-Side Canary

The specifics vary by application kind:

### 1. Kubernetes (Native Canary)
1.  **Git Repository**: Contains Kubernetes manifests and a PipeCD application manifest (`app.pipecd.yaml`) defining the canary strategy (e.g., steps, percentages, analysis).
2.  **PipeCD Workflow**:
    *   Detects changes (e.g., new image version).
    *   Deploys the canary version alongside the stable one.
    *   Gradually shifts traffic according to the defined steps (e.g., 10%, 25%, 50%).
    *   (Optional) Performs automated analysis using metrics.
    *   Promotes to 100% or rolls back based on analysis or manual approval.

### 2. Static Frontend on Cloud Storage (e.g., S3, GCS)
While PipeCD doesn't have a dedicated "static site" application kind for server-side canary with traffic splitting out-of-the-box, it can deploy different versions of assets to distinct paths (e.g., `/stable`, `/canary`). A client-side canary approach would then be used, or a CDN in front could be configured manually or via IaC tools (which PipeCD could apply) to perform server-side traffic splitting. For a pure server-side canary managed by PipeCD for static sites, custom scripting or integration with a CDN's API for traffic management would be needed within PipeCD's deployment pipeline.

### 3. Frontend on Amazon ECS (Managed by PipeCD for Server-Side Progressive Rollout)

PipeCD supports deploying and managing Amazon ECS services using a GitOps workflow. It leverages ECS's native capabilities, particularly AWS CodeDeploy with the `EXTERNAL` deployment controller type, to enable server-side progressive delivery strategies like Blue/Green. This Blue/Green process inherently includes a phase where the new ("green") version is live and testable with a portion of (or all, in a test environment) traffic before the old ("blue") version is decommissioned, acting as a canary period.

**How PipeCD interacts with ECS for progressive rollouts:**

1.  **Git Repository**:
    *   Contains ECS task definition files (e.g., `taskdef.json`) and service definition files (e.g., `servicedef.yaml`).
    *   PipeCD application manifest (`app.pipecd.yaml`) defines the ECS application, pointing to these definitions, and specifies the `BLUE_GREEN_SYNC` deployment strategy. This includes configuration for `primaryTargetGroupArn`, `canaryTargetGroupArn` (representing the new "green" version), and `listenerArn`.

2.  **PipeCD Workflow (for `BLUE_GREEN_SYNC` on ECS)**:
    *   When ECS task/service definitions or image versions are updated in Git:
        *   PipeCD detects the change and plans a deployment.
        *   It orchestrates AWS CodeDeploy to:
            *   Provision a new task set (the "green" deployment) with the updated application version.
            *   Shift traffic from the "blue" (current stable) target group to the "green" (new canary/pending stable) target group. This shift can be configured within CodeDeploy (e.g., linear, all-at-once) and may include bake times for testing.
            *   After successful testing and optional approval steps in PipeCD, CodeDeploy completes the traffic shift, and the old task set is terminated.
    *   This process allows the new version to be validated under load (canary phase) before it takes all production traffic.

**Client-Side Canary Considerations with ECS & PipeCD:**
If a *client-side* canary strategy is desired (where the browser makes the decision), PipeCD's role would be to deploy the different frontend application versions (e.g., `myapp:stable` and `myapp:canary` images to ECS). It could also manage a `canary-config.json` if it were, for example, part of a container image or a ConfigMap (if ECS tasks could consume it, less common for static configs than S3). However, PipeCD's ECS application kind does not directly manage S3 file uploads for `canary-config.json`. That would require a separate mechanism or a custom PipeCD application.

**Supported Features in ECS with PipeCD (for Server-Side Progressive Delivery):**
- GitOps-based management of ECS service and task definitions.
- Automated deployment of new ECS task definitions and service updates.
- Supports both EC2 and Fargate launch types.
- **Blue/Green deployments**: Leverages AWS CodeDeploy, task sets, and ALB target groups. Requires `deploymentStrategy: BLUE_GREEN_SYNC` and configuration of target groups/listeners in `app.pipecd.yaml`.
- **Canary Deployments**: Yes (via Blue/Green with canary phase, or by managing distinct canary services and ALB rules). Leverages AWS CodeDeploy's traffic shifting capabilities. PipeCD orchestrates. Fine-grained percentage control is managed by CodeDeploy settings or ALB weights.
- Support for the `EXTERNAL` deployment controller type, allowing PipeCD to manage complex rollout processes.
- Rollback and diff features for ECS service and task definitions.

**Unsupported or Limited Features in ECS for Client-Side Canary (when PipeCD is the primary tool):**
- **No direct S3 asset/config file management**: PipeCD's ECS application kind focuses on deploying the ECS service itself. It does not natively upload/manage static assets or individual configuration files (like `canary-config.json`) in S3 as part of an ECS deployment. This needs a separate mechanism.
- **S3 `canary-config.json` Management**: No         | Not directly managed by ECS application kind for *client-side* canary.
- **Automated analysis for ECS Canary/BlueGreen**: Metrics-based analysis and automated promotion/rollback for ECS deployments are less mature compared to Kubernetes within PipeCD.

**References:**
- [PipeCD ECS Application Configuration](https://pipecd.dev/docs/user-guide/managing-application/defining-app-configuration/ecs/)
- [PipeCD ECS Blue/Green Example](https://pipecd.dev/docs/user-guide/examples/#ecs-bluegreen-sync)
- [GitHub Discussion on ECS Blue/Green](https://github.com/pipe-cd/pipecd/discussions/4709)
- [GitHub Issue: ECS Canary Deployment](https://github.com/pipe-cd/pipecd/issues/4387)
- [GitHub Issue: ECS Blue/Green with EXTERNAL controller](https://github.com/pipe-cd/pipecd/issues/4467)
- [Understanding ECS External Deployment Tasksets](https://dev.to/t-kikuc/ecs-external-deployment-taskset-complete-guide-21dl)

---

## Comparison: PipeCD Server-Side Canary vs. Client-Side Canary

### PipeCD Server-Side Canary
*   **Mechanism**: PipeCD (or an underlying platform service like CodeDeploy orchestrated by PipeCD) manages traffic splitting at the infrastructure level.
*   **Decision Logic**: Defined in PipeCD's application configuration (`app.pipecd.yaml`) or the underlying platform's deployment configuration.
*   **Scope**: Affects entire requests/sessions routed to the canary version. Suitable for full-stack changes.
*   **PipeCD Role**: Actively manages the progressive rollout, traffic shifting, and potentially metric analysis (especially for Kubernetes).

### Client-Side Canary
*   **Mechanism**: JavaScript in the browser fetches a `canary-config.json` and decides which version of assets/features to load.
*   **Decision Logic**: Resides in client-side JavaScript.
*   **Scope**: Granular control over frontend elements.
*   **PipeCD Role**: Deploys different versions of frontend assets and potentially the `canary-config.json` (e.g., as a Kubernetes ConfigMap or to S3 via custom scripts). It does not directly manage the canary decision itself for a client-side strategy.

### Key Differences & Considerations

| Feature             | PipeCD Server-Side Canary                                     | Client-Side Canary (PipeCD for Deployments)                      |
|---------------------|---------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | PipeCD / Infrastructure (Server)                              | User's Browser (Client)                                           |
| **Granularity**     | Application version (e.g., pods, revisions, ECS task sets)    | Per-feature, per-user attribute, specific assets                  |
| **Automation**      | High (traffic shifting, metric analysis, promotion/rollback for K8s; CodeDeploy orchestration for ECS)  | PipeCD automates asset/config deployment; canary logic is separate|
| **Use Cases**       | Full-stack changes, backend APIs, critical services           | UI/UX changes, frontend A/B testing                               |
| **Rollback**        | Automated by PipeCD or via Git revert triggering PipeCD       | Update `canary-config.json` (potentially via PipeCD/GitOps)       |
| **Why?**            | Robust, automated, metric-driven rollouts for critical services (especially K8s). Consistent user experience per version. Handles backend changes. Controlled environment for testing new ECS versions via CodeDeploy. | Simpler for frontend-focused experiments if full progressive delivery is not needed. PipeCD can still manage the GitOps of assets/config. More dynamic targeting possible at the client. |

**Conclusion**:
PipeCD excels at orchestrating server-side canary deployments and progressive delivery, offering automated, GitOps-driven rollouts. For Kubernetes, Cloud Run, and Lambda, it provides fine-grained control and metric analysis. For ECS, it leverages AWS CodeDeploy to achieve robust server-side progressive rollouts that include a canary/testing phase. This approach is ideal for validating entire application versions. A client-side canary strategy can be supported by PipeCD through its deployment capabilities for assets and configuration files, but the canary logic itself remains external to PipeCD's core progressive delivery mechanisms.
