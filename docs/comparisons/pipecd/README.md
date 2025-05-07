# Client-Side Canary Deployments with PipeCD

This document explores how PipeCD, a continuous delivery platform focused on GitOps for various application types, can support a client-side canary deployment strategy. PipeCD helps manage the deployment of application versions and configuration files, while the client-side JavaScript handles the canary assignment logic.

## Core Concepts

In a client-side canary deployment:
1. JavaScript in the user's browser fetches a `canary-config.json` file.
2. This configuration specifies the canary rollout percentage.
3. The script then loads assets for either the stable or canary version of the application.

PipeCD can facilitate this by:

*   **GitOps-centric CD**: Managing deployments based on configurations defined in a Git repository (the "App manifest").
*   **Multi-Platform Support**: Deploying various application types, including:
    *   Kubernetes applications.
    *   Cloud Run services.
    *   AWS Lambda functions.
    *   **Amazon ECS services.**
    *   Static sites to cloud storage (e.g., S3, GCS).
*   **Deploying Application Versions**: Managing the deployment of stable and canary versions of your frontend application assets.
*   **Managing `canary-config.json`**:
    *   If deploying to Kubernetes, `canary-config.json` can be a `ConfigMap` defined in Git and managed by PipeCD.
    *   If deploying static sites to cloud storage, PipeCD can manage the upload of the `canary-config.json` file alongside other assets (potentially via custom deployment logic).
    *   If deploying to ECS, `canary-config.json` would typically be part of the frontend application's container image or served from a separate S3 bucket. PipeCD manages the ECS service deployment (which serves the application), but not direct S3 asset uploads as part of its ECS application kind.
*   **Progressive Delivery Features**: PipeCD has built-in support for canary, blue/green, and metrics-based analysis for supported application kinds (Kubernetes, Cloud Run, Lambda). For ECS, it supports Blue/Green deployments (leveraging AWS CodeDeploy) and can facilitate Canary-style rollouts.

## How PipeCD Supports Client-Side Canary

The approach depends on where your frontend application and `canary-config.json` are hosted.

### 1. Frontend on Kubernetes (Managed by PipeCD)

1.  **Git Repository**:
    *   Contains Kubernetes manifests for:
        *   Stable frontend `Deployment`.
        *   Canary frontend `Deployment`.
        *   `ConfigMap` for `canary-config.json`.
    *   PipeCD application manifest (`app.pipecd.yaml`) defines the application, pointing to these manifests.

2.  **PipeCD Workflow**:
    *   When manifests (e.g., image version for canary, or data in `ConfigMap` for `canary-config.json`) are updated in Git:
        *   PipeCD detects the change.
        *   It plans and executes the deployment according to the strategy defined (e.g., simple sync, or a more advanced canary if PipeCD is managing traffic for the frontend service itself - though this leans towards server-side canary).
        *   For client-side canary, the key is that PipeCD updates the `ConfigMap` containing `canary-config.json` and deploys the pods serving stable/canary assets.

3.  **Client-Side Logic**: Consumes `canary-config.json` served by Kubernetes pods.

### 2. Static Frontend on Cloud Storage (e.g., S3, GCS - Managed by PipeCD)

PipeCD doesn't have a dedicated "static site" application kind out-of-the-box as of my last update, but custom deployment logic can be implemented, or it might be added in the future. Conceptually:

1.  **Git Repository**:
    *   Contains the static site assets (HTML, CSS, JS for stable and canary versions).
    *   Includes `canary-config.json`.
    *   PipeCD application manifest might define a custom deployment process.

2.  **PipeCD Workflow (Conceptual for Static Sites)**:
    *   A custom job/script executed by PipeCD:
        *   Builds the static site.
        *   Uploads stable assets to `s3://my-bucket/stable/`.
        *   Uploads canary assets to `s3://my-bucket/canary/`.
        *   Uploads `canary-config.json` to `s3://my-bucket/config/`.
    *   Changes to `canary-config.json` in Git would trigger PipeCD to re-upload this file.

3.  **Client-Side Logic**: Fetches `canary-config.json` from cloud storage.

---

### 3. Frontend on Amazon ECS (Managed by PipeCD)

PipeCD supports deploying and managing Amazon ECS services using a GitOps workflow. It leverages ECS's native capabilities, including the `EXTERNAL` deployment controller type and integration with AWS CodeDeploy, to enable progressive delivery strategies like Blue/Green.

**How PipeCD interacts with ECS:**

1.  **Git Repository**:
    *   Contains ECS task definition files (e.g., `taskdef.json`) and optionally service definition files (e.g., `servicedef.yaml`).
    *   PipeCD application manifest (`app.pipecd.yaml`) defines the ECS application, pointing to these definitions, and specifies deployment strategies.

2.  **PipeCD Workflow**:
    *   When ECS task/service definitions or image versions are updated in Git:
        *   PipeCD detects the change and plans a deployment.
        *   It updates ECS task definitions and services according to the strategy defined in `app.pipecd.yaml`.
    *   **Supported ECS deployment strategies:**
        *   **`QUICK_SYNC`**: Standard ECS rolling update. PipeCD updates the ECS service to use the new task definition.
        *   **`BLUE_GREEN_SYNC`**: PipeCD orchestrates a blue/green deployment using AWS CodeDeploy. This typically involves:
            *   Defining `primaryTargetGroupArn`, `canaryTargetGroupArn` (for the new version, often referred to as "canary" in this context), and `listenerArn` in `app.pipecd.yaml`.
            *   PipeCD creating a new task set (the "green" deployment) and using CodeDeploy to shift traffic from the "blue" (current) to the "green" (new) deployment. The ECS deployment controller type is often set to `EXTERNAL` to allow PipeCD (via CodeDeploy) to manage the traffic shifting lifecycle.
        *   **Canary-style rollouts**: While not a distinct "Canary" strategy with fine-grained percentage control directly managed by PipeCD's core logic like in Kubernetes, PipeCD can facilitate canary deployments on ECS by:
            *   Deploying a new version as a separate task set (similar to the initial phase of Blue/Green).
            *   Configuring Application Load Balancer (ALB) weighted target groups. The `canary-config.json` would then be served by containers in these task sets. The actual traffic splitting percentages are managed at the ALB level, potentially configured via Infrastructure as Code tools managed in Git and applied by PipeCD if the IaC tool is supported (e.g. Terraform).

3.  **Client-Side Logic**:
    *   Your frontend application (e.g., an NGINX container serving static files, or a Node.js app) is deployed as an ECS service.
    *   The `canary-config.json` can be:
        *   Baked into the container image of your frontend application.
        *   Served by the frontend application itself.
        *   Hosted on S3.
    *   PipeCD manages the deployment of the ECS service. If `canary-config.json` is part of the image or served by the app, deploying a new version of the app via PipeCD updates the config.
    *   If `canary-config.json` is on S3, its update must be managed by a separate process (e.g., a CI/CD pipeline step or a different PipeCD application for static sites), as PipeCD's ECS application kind does not directly manage S3 file uploads.

**Supported Features in ECS with PipeCD:**

- GitOps-based management of ECS service and task definitions.
- Automated deployment of new ECS task definitions and service updates.
- Supports both EC2 and Fargate launch types.
- **Blue/Green deployments**: Leverages AWS CodeDeploy, task sets, and ALB target groups. Requires `deploymentStrategy: BLUE_GREEN_SYNC` and configuration of target groups/listeners in `app.pipecd.yaml`. (See [PipeCD ECS Blue/Green Example](https://pipecd.dev/docs-v0.51.x/user-guide/examples/#ecs-bluegreen-sync)).
- **Canary-style rollouts**: Facilitated by deploying new task sets. Traffic shifting relies on ALB weighted target groups, which PipeCD can help configure if managed as part of the ECS service definition or related IaC.
- Support for the `EXTERNAL` deployment controller type, allowing PipeCD to manage complex rollout processes.
- Rollback and diff features for ECS service and task definitions.

**Unsupported or Limited Features in ECS for Client-Side Canary:**

- **No direct S3 asset/config file management**: PipeCD's ECS application kind focuses on deploying the ECS service itself. It does not natively upload/manage static assets or individual configuration files (like `canary-config.json`) in S3 as part of an ECS deployment. This needs a separate mechanism.
- **Fine-grained traffic splitting (like Kubernetes Canary)**: While PipeCD can set up environments for canary testing (e.g., new task sets), direct, percentage-based traffic splitting controlled by PipeCD's core progressive delivery (analyze, promote) is not as integrated as with Kubernetes. It relies more on AWS native features like ALB weighted routing, which PipeCD helps set up.
- **Automated analysis for ECS Canary/BlueGreen**: Metrics-based analysis and automated promotion/rollback for ECS deployments are less mature compared to Kubernetes.

**Summary Table: PipeCD ECS Support**

| Feature                                 | Supported? | Notes                                                                                                                               |
|------------------------------------------|------------|-------------------------------------------------------------------------------------------------------------------------------------|
| ECS Service/Task Definition Management   | Yes        | GitOps-driven, supports EC2/Fargate. Manages `taskdef.json`, `servicedef.yaml`.                                                      |
| Rolling Update Deployments (`QUICK_SYNC`)| Yes        | Standard ECS rolling update.                                                                                                        |
| Blue/Green Deployments (`BLUE_GREEN_SYNC`)| Yes        | Leverages AWS CodeDeploy, task sets, ALB target groups. Requires specific `app.pipecd.yaml` configuration.                           |
| Canary Deployments                       | Partial    | Facilitates by deploying new task sets. Traffic shifting via ALB weighted target groups, configured as part of service or external IaC. |
| S3 Asset Uploads for Frontend            | No         | Not part of ECS application kind. Must be handled by other means (e.g., custom script, separate PipeCD app for static sites).         |
| S3 `canary-config.json` Management       | No         | Not directly managed by ECS application kind.                                                                                       |
| Automated Traffic Shifting & Analysis    | Limited    | Relies on AWS CodeDeploy for Blue/Green traffic shifting. Advanced analysis/promotion less mature than Kubernetes.                    |

**References:**
- [PipeCD ECS Application Configuration](https://pipecd.dev/docs-v0.50.x/user-guide/managing-application/defining-app-configuration/ecs/)
- [PipeCD ECS Blue/Green Example](https://pipecd.dev/docs-v0.51.x/user-guide/examples/#ecs-bluegreen-sync)
- [GitHub Discussion on ECS Blue/Green](https://github.com/pipe-cd/pipecd/discussions/4709)
- [GitHub Issue: ECS Canary Deployment](https://github.com/pipe-cd/pipecd/issues/4387)
- [GitHub Issue: ECS Blue/Green with EXTERNAL controller](https://github.com/pipe-cd/pipecd/issues/4467)
- [Understanding ECS External Deployment Tasksets](https://dev.to/t-kikuc/ecs-external-deployment-taskset-complete-guide-21dl)

---

## Updating Canary Percentage with PipeCD

1.  **Modify Config in Git**:
    *   **For `canary-config.json` served by the application (Kubernetes/ECS):** Update the configuration within your application's source code or a ConfigMap/secret, then update the image tag or ConfigMap data in your Git repository.
    *   **For `canary-config.json` on S3 (Static Sites or ECS with S3 config):** Update the `canary-config.json` file in your Git repository.
2.  **Commit and Push**: Push the changes to Git.
3.  **PipeCD Sync**:
    *   **Kubernetes**: PipeCD applies the updated `ConfigMap` or deploys the new image.
    *   **Static Sites (conceptual or custom)**: PipeCD re-uploads the modified `canary-config.json` to S3.
    *   **ECS**: PipeCD redeploys the ECS service with the new task definition (containing the updated application/image). If `canary-config.json` is on S3, this step does **not** update it; a separate process is needed.
4.  **Client Impact**: Clients fetching `canary-config.json` will get the new percentages.

## Considerations

*   **PipeCD's Progressive Delivery Focus**:
    *   **Kubernetes, Cloud Run, Lambda**: Strong support for server-side canary with traffic shifting and analysis.
    *   **ECS**: Good support for Blue/Green deployments via AWS CodeDeploy. Canary-style rollouts are possible by managing task sets and ALB configurations, but direct percentage-based traffic control and analysis by PipeCD are less extensive.
    *   **Client-Side Canary**: PipeCD's primary role is deploying the application versions and, where applicable (Kubernetes ConfigMaps, or custom static site deployments), the `canary-config.json` file itself. For ECS, if the config file is on S3, its deployment is typically outside the scope of PipeCD's ECS application management.

PipeCD can support client-side canary deployments by managing the deployment of different frontend versions and the crucial `canary-config.json` file through a GitOps workflow. While its advanced progressive delivery features are more aligned with server-side canaries (especially in Kubernetes), its core GitOps capabilities are valuable for maintaining the infrastructure needed by a client-side strategy. For ECS, PipeCD excels at managing service and task definition deployments, including orchestrating Blue/Green updates, while management of static assets or S3-hosted configuration files for client-side logic often requires a complementary process.
