# Canary Deployments with AWS CodePipeline

This document describes how AWS CodePipeline typically orchestrates server-side canary deployments by integrating with other AWS services like CodeDeploy, and contrasts this with using CodePipeline to support a client-side canary strategy.

## Core Concepts of CodePipeline for Server-Side Canary Orchestration

AWS CodePipeline automates the software release process. For server-side canary deployments, it acts as an orchestrator, leveraging other AWS services for traffic shifting and deployment management.

*   **Workflow Automation**: Defines stages (Source, Build, Deploy, Test) for application delivery.
*   **Integration with AWS Deployment Services**:
    *   **AWS CodeDeploy**: CodePipeline's primary integration for sophisticated deployments to EC2, ECS, and Lambda. CodeDeploy handles the actual traffic shifting (e.g., linear, all-at-once with baking) and can manage canary releases.
    *   **AWS Lambda**: Can deploy new Lambda versions and update weighted aliases for canary releases.
    *   **Amazon S3/CloudFront with ALB/API Gateway**: For applications fronted by ALB or API Gateway, CodePipeline can trigger updates to target group weights or stage deployments, often via AWS CLI, SDK actions in CodeBuild, or Lambda functions.
*   **Manual Approvals**: CodePipeline supports manual approval actions, allowing human intervention before promoting a canary.

## How CodePipeline Orchestrates Server-Side Canary

A typical CodePipeline setup for server-side canary:

1.  **Source Stage**: Monitors a repository (CodeCommit, GitHub, S3).
2.  **Build Stage**: AWS CodeBuild compiles code, builds artifacts (e.g., Docker images, deployment packages).
3.  **Deploy Canary Stage**:
    *   **Using AWS CodeDeploy (for ECS/EC2/Lambda)**:
        *   CodePipeline action invokes CodeDeploy.
        *   CodeDeploy deploys the new version to a segment of the fleet or traffic (e.g., `CodeDeployDefault.ECSLinear10PercentEvery3Minutes`).
        *   CodeDeploy can run validation tests via lifecycle hooks.
    *   **Using AWS Lambda Weighted Aliases**:
        *   A CodePipeline action (often CodeBuild running CLI commands or a Lambda function) deploys a new Lambda version and updates an alias to send a percentage of traffic to it.
    *   **Using ALB Weighted Target Groups**:
        *   A CodePipeline action (CodeBuild/Lambda) deploys the new version to a new target group and then updates ALB listener rule weights.

4.  **Test/Validation Stage (Optional)**:
    *   Run automated tests against the canary endpoint.
    *   Could involve third-party testing tools integrated via CodeBuild or Lambda.

5.  **Promote/Approval Stage**:
    *   If tests pass or after a baking period, a manual approval action can be inserted.
    *   Upon approval, another CodePipeline action (again, often CodeDeploy or a script) shifts remaining traffic to the new version or finalizes the CodeDeploy deployment.

6.  **Rollback**: If issues occur, CodeDeploy can automatically roll back. For other methods, a rollback pipeline or manual steps might be triggered.

## Comparison: CodePipeline-Orchestrated Server-Side Canary vs. Client-Side Canary (with CodePipeline)

### CodePipeline-Orchestrated Server-Side Canary
*   **Mechanism**: CodePipeline triggers AWS services (like CodeDeploy, Lambda) or custom scripts that perform server-side traffic shifting.
*   **Decision Logic**: Resides in the configuration of the AWS service handling the deployment (e.g., CodeDeploy deployment configuration, Lambda alias weights, ALB listener rules).
*   **Scope**: Affects entire user requests routed to the canary. Suitable for full-stack testing.
*   **CodePipeline Role**: Orchestrates the end-to-end release process, including triggering the canary deployment, managing approvals, and promoting to production.

### Client-Side Canary (with CodePipeline for Deployments)
*   **Mechanism**: JavaScript in the browser fetches a `canary-config.json` (e.g., from S3) and decides which version of assets/features to load.
*   **Decision Logic**: Resides in client-side JavaScript.
*   **Scope**: Granular control over frontend elements.
*   **CodePipeline Role**: Automates the build and deployment of stable/canary frontend assets and the `canary-config.json` file, typically to S3 (often with CloudFront).

### Key Differences & Considerations

| Feature             | CodePipeline Server-Side Canary Orchestration               | Client-Side Canary (CodePipeline for Deployments)             |
|---------------------|-------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | AWS Deployment Service (Server), orchestrated by CodePipeline | User's Browser (Client)                                           |
| **Granularity**     | Application version (instance, service, Lambda alias)       | Per-feature, per-user attribute, specific assets                  |
| **Complexity**      | Higher (integration with CodeDeploy, ALB/Lambda configurations)| Simpler CodePipeline setup for S3 asset/config deployment       |
| **Use Cases**       | Full-stack changes, backend APIs, critical service updates  | UI/UX changes, frontend A/B testing on static sites             |
| **Rollback**        | Handled by CodeDeploy; or manual/scripted traffic reversal  | Deploy updated `canary-config.json` (e.g., percentage to 0) via CodePipeline |
| **Why?**            | Leverages robust, AWS-native deployment services for controlled rollouts. Centralized management and monitoring within AWS. | Simpler CI/CD for frontend experiments if server-side tools are not needed. CodePipeline efficiently handles S3 deployments. |

**Conclusion**:
AWS CodePipeline is a powerful orchestrator for server-side canary deployments within the AWS ecosystem, primarily by integrating with AWS CodeDeploy for EC2/ECS/Lambda, or by managing Lambda alias weights and ALB configurations. This provides a structured, automated way to perform controlled rollouts. For client-side canary strategies, CodePipeline is effective in automating the deployment of frontend assets and the `canary-config.json` to S3, allowing the browser to manage the canary logic.
