# Client-Side Canary Deployments with Amazon ECS

This document outlines how Amazon Elastic Container Service (ECS) can be used to support a client-side canary deployment strategy. In a client-side canary approach, the browser's JavaScript makes the decision to show a stable or canary version based on a configuration, while ECS helps serve the necessary application versions and configuration files.

## Core Concepts

Client-side canary deployment relies on JavaScript running in the user's browser to:
1. Fetch a configuration file (e.g., `canary-config.json`) that specifies the canary percentage.
2. Assign the user to a "stable" or "canary" group based on this percentage.
3. Load the appropriate version of the application assets (JS, CSS, HTML).

Amazon ECS can support this by:

*   **Hosting Application Versions**: Deploying multiple versions (stable and canary) of your containerized frontend application. Each version can be a separate ECS service or task definition.
*   **Serving Static Assets**: ECS tasks, typically running a web server like Nginx or Apache, serve the static HTML, CSS, JavaScript files for both stable and canary versions. These could be served from different paths or be part of different container images.
*   **Serving Configuration Files**: The `canary-config.json` file, which dictates the canary rollout percentage, can be:
    *   Baked into a specific version of the frontend application container (less flexible for dynamic updates).
    *   Stored in Amazon S3 and fetched by the client. ECS tasks might need IAM roles to allow an auxiliary process to update this file in S3, or it could be updated by a CI/CD pipeline.
    *   Served via a small API endpoint also hosted on ECS.
*   **Load Balancing (Optional for Asset Serving)**: An Application Load Balancer (ALB) can sit in front of your ECS services. While client-side canary doesn't strictly need ALB traffic shifting for the *canary decision itself*, ALB can be used to route to different ECS services that serve distinct versions of assets if needed, or simply to provide a stable endpoint for your frontend application.

## How ECS Facilitates Client-Side Canary

1.  **Deployment of Versions**:
    *   You maintain two (or more) versions of your frontend application, packaged as Docker images (e.g., `myapp:stable`, `myapp:canary`).
    *   Deploy these as separate ECS services or update existing services with new task definitions pointing to these images.
    *   The key is that both versions' assets are accessible. For example, `https://myapp.com/stable-assets/` and `https://myapp.com/canary-assets/`, or the client-side logic dynamically constructs asset paths based on the assigned version.

2.  **Managing `canary-config.json`**:
    *   This configuration file is central to the client-side logic.
    *   **CI/CD Pipeline (e.g., AWS CodePipeline, Jenkins, GitHub Actions)**: When you want to adjust the canary percentage (e.g., from 5% to 10%), your CI/CD pipeline updates `canary-config.json`.
    *   This updated file is then deployed to a location accessible by all clients (e.g., a specific S3 bucket and path).
    *   The client-side JavaScript in *all* versions of your application (stable and canary) fetches this *same* `canary-config.json` to determine user assignment.

3.  **Client-Side Logic**:
    *   The JavaScript in `index.html` (served by ECS) fetches `canary-config.json`.
    *   Based on the percentage in the config and potentially a user ID or random assignment, it decides if the user is "stable" or "canary".
    *   It then dynamically loads the appropriate CSS/JS bundles or redirects to the correct version-specific HTML page (all served by ECS).

## Example Workflow

1.  **Initial Setup**:
    *   ECS Service A runs `myapp:stable`.
    *   ECS Service B runs `myapp:canary` (or Service A is updated to serve both, distinguishable by path).
    *   `canary-config.json` is in S3, initially set to `{"CANARY_PERCENTAGE": 0}`.

2.  **Starting Canary**:
    *   CI/CD pipeline updates `canary-config.json` in S3 to `{"CANARY_PERCENTAGE": 5}`.

3.  **User Visit**:
    *   User's browser loads `index.html` from the main application URL (served by ECS).
    *   JavaScript fetches `s3://your-bucket/canary-config.json`.
    *   JavaScript assigns the user (e.g., 5% to canary).
    *   If canary, it loads assets from the canary path/version (served by ECS). Otherwise, stable assets.

4.  **Rollout/Rollback**:
    *   To increase rollout, CI/CD updates `CANARY_PERCENTAGE` in S3.
    *   To rollback, CI/CD sets `CANARY_PERCENTAGE` to 0 in S3.

## Considerations

*   **Stateless Frontend**: This approach works best for stateless frontend applications where assets can be switched easily.
*   **Configuration Accessibility**: Ensure `canary-config.json` is highly available and has appropriate caching/CDN settings (e.g., using Amazon CloudFront in front of S3).
*   **CI/CD Integration**: A robust CI/CD pipeline is crucial for managing the deployment of application versions and updating the `canary-config.json`.
*   **Server-Side vs. Client-Side**: ECS with ALBs can also perform server-side canary deployments using weighted target groups. This is a different pattern where the load balancer, not the client, makes the routing decision. The client-side approach discussed here gives more control to the frontend application logic itself.

By using ECS to serve the different application asset versions and ensuring the `canary-config.json` is accessible and updatable, you can effectively implement a client-side canary deployment strategy.
