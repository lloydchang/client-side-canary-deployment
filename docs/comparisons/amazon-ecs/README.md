# Canary Deployments with Amazon ECS

This document outlines how Amazon Elastic Container Service (ECS) is typically used for canary deployments, primarily through server-side traffic shifting mechanisms, and contrasts this with a client-side canary approach.

## Core Concepts of ECS Canary Deployments (Server-Side)

Server-side canary deployments with ECS involve routing a small percentage of user traffic to a new version of an application. The decision is made by the infrastructure. ECS facilitates this using:

*   **AWS Application Load Balancer (ALB)**: ALBs support weighted target groups, allowing you to distribute traffic between two versions of your application (e.g., 95% to stable, 5% to canary). ECS services register tasks with these target groups.
*   **AWS CodeDeploy**: For more sophisticated deployment strategies like blue/green, CodeDeploy can manage traffic shifting to new task sets in ECS. While primarily blue/green, it can be used for canary-style testing by controlling traffic shift percentages and potentially integrating with testing and rollback hooks.
*   **Multiple ECS Services/Task Definitions**: You deploy the stable and canary versions of your application as separate ECS services or as different task definitions within the same service (managed by CodeDeploy).

## How ECS Facilitates Server-Side Canary

1.  **Deploy New Version**:
    *   Package your new application version as a Docker image.
    *   Create a new ECS task definition pointing to this image.
    *   Deploy this new task definition. This could be:
        *   A new ECS service pointing to a "canary" target group.
        *   A new task set within an existing service managed by CodeDeploy.

2.  **Traffic Shifting**:
    *   **Using ALB Weighted Target Groups**:
        *   Configure two target groups: one for the stable version, one for the canary version.
        *   Adjust the weights on the ALB listener rule to send a small percentage of traffic (e.g., 5%) to the canary target group and the rest to the stable.
        *   Monitor the canary version. Gradually increase the weight to the canary target group.
    *   **Using AWS CodeDeploy**:
        *   Define a CodeDeploy application and deployment group for your ECS service.
        *   Specify a deployment configuration (e.g., `CodeDeployDefault.ECSLinear10PercentEvery1Minute` or a custom one).
        *   CodeDeploy creates a new task set for the canary version, shifts a portion of traffic, runs validation tests (via lifecycle hooks), and then incrementally shifts more traffic or rolls back.

3.  **Monitoring and Rollout/Rollback**:
    *   Monitor key metrics (errors, latency, business KPIs) for the canary version.
    *   If the canary is healthy, gradually increase traffic.
    *   If issues arise, shift traffic back to the stable version (by adjusting ALB weights to 0% for canary or initiating a CodeDeploy rollback).

## Comparison: ECS Server-Side Canary vs. Client-Side Canary

### ECS Server-Side Canary
*   **Mechanism**: Traffic is split at the load balancer (ALB) or orchestrated by CodeDeploy. The server infrastructure decides which version a user sees.
*   **Decision Logic**: Resides in ALB listener rules (weights) or CodeDeploy configurations.
*   **Scope**: Affects the entire user session/request for users routed to the canary. Can test backend and frontend changes together.
*   **ECS Role**: Hosts both application versions and integrates with ALB/CodeDeploy for traffic management.

### Client-Side Canary
*   **Mechanism**: JavaScript in the user's browser fetches a configuration file (e.g., `canary-config.json`) and decides whether to load stable or canary assets/features.
*   **Decision Logic**: Resides in the client-side JavaScript.
*   **Scope**: Can be more granular (e.g., specific features, UI components). Primarily for frontend changes.
*   **ECS Role**: Serves the different versions of frontend assets and potentially the `canary-config.json` file. No direct involvement in traffic splitting for the canary decision itself.

### Key Differences & Considerations

| Feature             | ECS Server-Side Canary                                       | Client-Side Canary                                                |
|---------------------|--------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Load Balancer / CodeDeploy (Server)                          | User's Browser (Client)                                           |
| **Granularity**     | Per-request/session, entire application version              | Per-feature, per-user attribute, specific assets                  |
| **Complexity**      | Higher (ALB/CodeDeploy setup, IAM roles)                     | Lower infrastructure complexity if config is external (e.g., S3)  |
| **Use Cases**       | Full-stack changes, backend dependencies, infrastructure tests | UI/UX changes, frontend-specific features, A/B testing            |
| **Rollback**        | Shift traffic via ALB/CodeDeploy                             | Update `canary-config.json` (e.g., set canary percentage to 0)    |
| **Monitoring**      | Infrastructure metrics, application logs from canary instances | Client-side analytics, error tracking for canary users            |
| **Why?**| Robust for any application type. Tests entire new version. Centralized control. Automated promotion/rollback with CodeDeploy. | Simpler for frontend teams to manage UI experiments. More dynamic targeting. Less direct infra changes for config updates. |

**Conclusion**:
ECS excels at server-side canary deployments using ALB weighted target groups or AWS CodeDeploy, providing robust, infrastructure-level traffic management. This is suitable for testing entire application versions. Client-side canary offers a different approach, giving control to the browser for frontend-specific changes, where ECS's role is to serve the necessary assets and configuration. The choice depends on the specific needs, the scope of changes, and team expertise.
