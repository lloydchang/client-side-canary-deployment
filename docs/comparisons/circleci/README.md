# Canary Deployments with CircleCI

This document outlines how CircleCI, a CI/CD platform, typically orchestrates server-side canary deployments by integrating with platform-specific tools and services. It then contrasts this with using CircleCI to support a client-side canary strategy.

## Core Concepts of CircleCI for Server-Side Canary Orchestration

CircleCI itself doesn't perform traffic shifting but acts as the automation engine to trigger and manage canary deployments on target platforms.

*   **Workflow Automation**: CircleCI workflows define the sequence of jobs to build, test, and deploy applications.
*   **Integration with Deployment Platforms**:
    *   **Kubernetes**: CircleCI can run `kubectl` commands, or use tools like Helm, Kustomize to apply configurations that include canary definitions for tools like Flagger or Argo Rollouts.
    *   **AWS (ECS, Lambda)**: CircleCI can use the AWS CLI or SDKs to initiate deployments via AWS CodeDeploy (for ECS/EC2), update Lambda weighted aliases, or adjust ALB target group weights.
    *   **Serverless Platforms**: Deploy new versions and configure traffic splitting rules via platform CLIs.
*   **Parameterization and Approvals**: Workflows can be parameterized (e.g., canary percentage, duration) and include manual approval steps before promoting a canary.

## How CircleCI Orchestrates Server-Side Canary

A CircleCI `config.yml` would define jobs and workflows:

1.  **Build & Test Job**:
    *   Builds the application (e.g., Docker image, serverless package).
    *   Runs tests.

2.  **Deploy Canary Job**:
    *   This job uses CLI tools or orbs specific to the target platform:
        *   **Kubernetes (with Flagger/Argo Rollouts)**: Update the image tag in a Git repository (if using GitOps with Flux/Argo CD) or directly apply updated manifests that trigger Flagger/Argo Rollouts.
        *   **AWS ECS (with CodeDeploy)**: Start a new CodeDeploy deployment specifying a canary configuration (e.g., `CodeDeployDefault.ECSLinear10PercentEvery1Minute`).
        *   **AWS ALB**: Use AWS CLI to deploy the new version to a separate target group and then adjust listener rule weights.
        *   **AWS Lambda**: Deploy a new Lambda version and update alias weights.
    *   The job might pass parameters like initial canary traffic percentage.

3.  **Monitor/Verify Job (Optional but Recommended)**:
    *   A job that runs integration tests against the canary endpoint or queries monitoring systems for health.
    *   Could be automated or trigger notifications for manual verification.

4.  **Promote/Rollback Job**:
    *   **Promote**: If the canary is healthy (based on automated checks or manual approval in CircleCI), this job increases traffic to 100% for the canary version or finalizes the CodeDeploy deployment.
    *   **Rollback**: If issues occur, this job shifts traffic back to the stable version or triggers a rollback on the deployment platform.

## Comparison: CircleCI-Orchestrated Server-Side Canary vs. Client-Side Canary (with CircleCI)

### CircleCI-Orchestrated Server-Side Canary
*   **Mechanism**: CircleCI jobs trigger actions on a deployment platform (Kubernetes, AWS, etc.) that performs the actual server-side traffic shifting.
*   **Decision Logic**: Resides in the deployment platform's configuration (e.g., Flagger CRD, CodeDeploy settings, ALB rules), potentially influenced by parameters or logic within CircleCI jobs.
*   **Scope**: Affects entire user requests routed to the canary. Suitable for full-stack testing.
*   **CircleCI Role**: Orchestrates the build, deployment, and potentially promotion/rollback steps by interacting with external tools and platforms.

### Client-Side Canary (with CircleCI for Deployments)
*   **Mechanism**: JavaScript in the browser fetches a `canary-config.json` and decides which version of assets/features to load.
*   **Decision Logic**: Resides in client-side JavaScript.
*   **Scope**: Granular control over frontend elements.
*   **CircleCI Role**: Automates the build and deployment of stable/canary frontend assets (e.g., to S3, Netlify) and the `canary-config.json` file.

### Key Differences & Considerations

| Feature             | CircleCI Server-Side Canary Orchestration                   | Client-Side Canary (CircleCI for Deployments)                 |
|---------------------|-------------------------------------------------------------|-------------------------------------------------------------------|
| **Decision Point**  | Deployment Platform (Server), orchestrated by CircleCI      | User's Browser (Client)                                           |
| **Granularity**     | Application version (instance, service)                     | Per-feature, per-user attribute, specific assets                  |
| **Complexity**      | Higher (integration with platform-specific canary tools)    | Simpler deployment jobs in CircleCI for assets/config             |
| **Use Cases**       | Full-stack changes, backend APIs, critical service updates  | UI/UX changes, frontend A/B testing                               |
| **Rollback**        | Trigger rollback on deployment platform via CircleCI job    | Deploy updated `canary-config.json` (e.g., percentage to 0) via CircleCI |
| **Why?**            | Leverages robust, platform-native canary capabilities. Centralized control and monitoring via the chosen platform. CircleCI provides the CI/CD pipeline. | Simpler CI/CD for frontend experiments if server-side tools are not needed. CircleCI efficiently handles asset and config file deployments. |

**Conclusion**:
CircleCI is a versatile CI/CD platform that can effectively orchestrate server-side canary deployments by integrating with various cloud platforms and Kubernetes tools that handle the actual traffic shifting and analysis. This allows teams to leverage powerful canary features within their automated pipelines. For client-side canary strategies, CircleCI excels at building and deploying the necessary frontend assets and the `canary-config.json` to their respective hosting locations, while the canary decision logic remains in the browser.
