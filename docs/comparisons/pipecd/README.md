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
    *   If deploying static sites to cloud storage, PipeCD can manage the upload of the `canary-config.json` file alongside other assets.
    *   If deploying to ECS, `canary-config.json` can be included as part of the container image or served from a storage bucket, but PipeCD does not natively manage static asset uploads to S3 as part of ECS deployments.
*   **Progressive Delivery Features**: PipeCD has built-in support for canary, blue/green, and metrics-based analysis for supported application kinds (primarily Kubernetes, Cloud Run, Lambda, and partially ECS).

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

PipeCD supports deploying and managing ECS services using a GitOps workflow. However, its ECS support is focused on service deployments and does not natively handle static asset uploads to S3 or direct management of files like `canary-config.json` outside the ECS service itself.

**How PipeCD interacts with ECS:**

1.  **Git Repository**:
    *   Contains ECS service definitions (in JSON or YAML), including task definitions for stable and canary versions.
    *   PipeCD application manifest (`app.pipecd.yaml`) defines the ECS application and points to these definitions.

2.  **PipeCD Workflow**:
    *   When ECS task/service definitions are updated in Git:
        *   PipeCD detects the change and deploys the new ECS service/task definition.
        *   Supports updating container images, environment variables, and other ECS service parameters.
    *   **Supported ECS deployment strategies:**
        *   Standard ECS rolling update.
        *   [External deployment type](https://dev.to/t-kikuc/ecs-external-deployment-taskset-complete-guide-21dl) (for advanced use cases).
        *   Partial support for blue/green and canary deployments via ECS task sets (see limitations below).

3.  **Client-Side Logic**:
    *   If your frontend is served from ECS (e.g., via an NGINX container), you can deploy both stable and canary versions as separate ECS services or task sets.
    *   The `canary-config.json` can be served by the ECS service, but PipeCD does **not** manage S3 asset uploads or S3-based config updates as part of ECS deployments.
    *   For S3-hosted assets, you must manage asset uploads outside of PipeCD's ECS integration.

**Supported Features in ECS with PipeCD:**

- GitOps-based ECS service and task definition management.
- Automated deployment of new ECS task definitions.
- Supports both EC2 and Fargate launch types.
- Supports [external deployment type](https://dev.to/t-kikuc/ecs-external-deployment-taskset-complete-guide-21dl) for advanced deployment flows.
- Partial support for blue/green and canary via ECS task sets (see [#4387](https://github.com/pipe-cd/pipecd/issues/4387), [#4467](https://github.com/pipe-cd/pipecd/issues/4467)).
- Rollback and diff features for ECS service definitions.

**Unsupported or Limited Features in ECS:**

- **No native static asset upload to S3**: PipeCD does not manage S3 uploads as part of ECS deployments. You must use a separate process or CI/CD step for static assets and `canary-config.json` if they are stored in S3.
- **Limited progressive delivery**: Full blue/green and canary deployment support is not as mature as in Kubernetes. Traffic shifting and automated analysis are limited ([see discussion](https://github.com/pipe-cd/pipecd/discussions/4709)).
- **No direct management of S3-hosted config files**: Updating `canary-config.json` in S3 is not handled by PipeCD's ECS integration.
- **No built-in support for ECS Service Connect or App Mesh**: Advanced traffic routing features are not natively integrated.

**Summary Table: PipeCD ECS Support**

| Feature                                 | Supported? | Notes                                                                 |
|------------------------------------------|------------|-----------------------------------------------------------------------|
| ECS Service/Task Definition Management   | Yes        | GitOps-driven, supports EC2/Fargate                                   |
| Rolling Update Deployments               | Yes        | Standard ECS rolling update                                           |
| Blue/Green Deployments                   | Partial    | Via external deployment type/task sets, manual steps may be required  |
| Canary Deployments                       | Partial    | Limited, see [#4387](https://github.com/pipe-cd/pipecd/issues/4387)   |
| S3 Asset Uploads                         | No         | Must be handled outside PipeCD                                        |
| S3 `canary-config.json` Management       | No         | Not managed as part of ECS deployment                                 |
| Automated Traffic Shifting/Analysis      | No         | Not natively supported for ECS                                        |

**References:**
- [PipeCD ECS Application Guide](https://pipecd.dev/docs-v0.50.x/user-guide/managing-application/defining-app-configuration/ecs/)
- [PipeCD ECS Issues and Discussions](https://github.com/pipe-cd/pipecd/issues/4387), [#4467](https://github.com/pipe-cd/pipecd/issues/4467), [Discussion #4709](https://github.com/pipe-cd/pipecd/discussions/4709)
- [ECS External Deployment Type Guide](https://dev.to/t-kikuc/ecs-external-deployment-taskset-complete-guide-21dl)

---

## Updating Canary Percentage with PipeCD

1.  **Modify Config in Git**: Update the `canary-config.json` content (whether as a raw file for static sites, as data in a `ConfigMap` manifest for Kubernetes, or as part of your ECS container image or service).
2.  **Commit and Push**: Push the changes to Git.
3.  **PipeCD Sync**: PipeCD detects the commit and plans a new deployment.
    *   For Kubernetes, it applies the updated `ConfigMap`.
    *   For static sites (conceptual), it re-uploads the modified `canary-config.json`.
    *   For ECS, it redeploys the ECS service/task definition, but does **not** update S3 assets/configs.
4.  **Client Impact**: Clients fetching the `canary-config.json` will get the new percentages (if served by the application), or you must separately update S3 if using S3-hosted configs.

## Considerations

*   **PipeCD's Progressive Delivery**: PipeCD's built-in canary and analysis features are primarily for server-side traffic shifting and health checks of application instances (Kubernetes, Cloud Run, Lambda). ECS support is more limited.
    *   If you use PipeCD's canary for your frontend *service* on Kubernetes, it's a server-side canary.
    *   For ECS, blue/green/canary is possible but less automated and may require manual steps.
    *   For client-side canary, PipeCD's role is more about deploying the *assets* and the *config file* that the client uses.
*   **Customization**: PipeCD's design allows for custom deployment logic, which could be leveraged for managing static site deployments if not directly supported.
*   **Focus on GitOps**: PipeCD strongly adheres to GitOps principles, making Git the source of truth for deployment configurations.
*   **Piped**: The control plane component of PipeCD, `piped`, runs in your environment (e.g., Kubernetes cluster, ECS host) and executes deployments.

PipeCD can support client-side canary deployments by managing the deployment of different frontend versions and the crucial `canary-config.json` file through a GitOps workflow. While its advanced progressive delivery features are more aligned with server-side canaries (especially in Kubernetes), its core GitOps capabilities are valuable for maintaining the infrastructure needed by a client-side strategy. For ECS, PipeCD is best used for service/task definition management, with static asset and S3 config management handled externally.
