# Client-Side Canary Deployments with AWS CodePipeline

This document describes how AWS CodePipeline can automate the deployment process supporting a client-side canary strategy. The core client-side canary logic (JavaScript in the browser deciding based on a configuration) remains the same, while CodePipeline helps manage the delivery of application versions and the crucial `canary-config.json`.

## Core Concepts

In a client-side canary deployment:
1. Client-side JavaScript fetches a `canary-config.json` file.
2. This config dictates the percentage of users directed to the canary version.
3. The script then loads assets for either the stable or canary version.

AWS CodePipeline facilitates this by:

*   **Automating Builds**: Building your frontend application (e.g., running `npm install` and `npm run build`).
*   **Deploying Static Assets**: Deploying the stable and canary versions of your static assets (HTML, CSS, JS) to a hosting solution like Amazon S3 (often with Amazon CloudFront for distribution).
    *   Example: `s3://my-bucket/app/stable/` and `s3://my-bucket/app/canary/`.
*   **Managing `canary-config.json`**: Automating the update and deployment of the `canary-config.json` file to a known, accessible location (e.g., `s3://my-bucket/config/canary-config.json`).
*   **Orchestrating Stages**: Defining a pipeline with stages for source control, build, test, and deployment of both application assets and the configuration file.

## How CodePipeline Supports Client-Side Canary

1.  **Source Stage**:
    *   CodePipeline monitors your source repository (e.g., AWS CodeCommit, GitHub, Bitbucket).
    *   A commit to the main branch (or a specific release branch) can trigger the pipeline.

2.  **Build Stage**:
    *   AWS CodeBuild (or Jenkins, etc., integrated with CodePipeline) builds your frontend application.
    *   This stage can produce two sets of assets: one for stable and one for canary if they differ, or a single build that can be configured.
    *   It can also prepare or update the `canary-config.json` based on parameters or a file in the repository.

3.  **Deployment Stage(s)**:
    *   **Application Assets**:
        *   Deploy the built static assets for the stable version to its S3 path.
        *   Deploy the built static assets for the canary version to its S3 path.
    *   **Configuration File**:
        *   A separate action in CodePipeline (or a step in CodeBuild) updates `canary-config.json` in its designated S3 location. This update is key to controlling the canary rollout percentage.
        *   This step could involve:
            *   Taking a `canary-config.json` from the repository.
            *   Using an AWS Lambda function invoked by CodePipeline to dynamically generate or update the JSON file based on external inputs (e.g., analytics results, manual approval).
            *   Using AWS CLI commands within CodeBuild to upload the file.

4.  **Client-Side Logic**:
    *   The client application (served from S3 via CloudFront) fetches `canary-config.json`.
    *   Based on the percentage, it loads assets from either the `/stable/` or `/canary/` path.

## Example Pipeline Flow for Updating Canary Percentage

1.  **Trigger**: A developer manually triggers the pipeline with a new canary percentage (e.g., as a parameter) or an automated system (monitoring analytics) triggers it.
2.  **Source**: (Optional if only config changes) CodePipeline might fetch the latest source if other app changes are bundled.
3.  **Config Update Action**:
    *   A CodeBuild project or Lambda function:
        *   Receives the new percentage.
        *   Modifies the `canary-config.json` file.
        *   Uploads the updated `canary-config.json` to S3.
    *   This action could also update a `version.json` file to trigger client-side refreshes if your application polls for it.
4.  **Deployment to S3**: The updated `canary-config.json` is now live.
5.  **CloudFront Invalidation (Optional but Recommended)**: Invalidate the CloudFront cache for `canary-config.json` to ensure clients fetch the latest version quickly.

## Considerations

*   **Granular Control**: CodePipeline allows for fine-grained control over each step of the deployment.
*   **Integration**: It integrates well with other AWS services like S3, CodeBuild, Lambda, CloudFormation, and IAM.
*   **`canary-config.json` Management**: The strategy for updating `canary-config.json` is crucial. It should be easy to modify and deploy this file independently of full application deployments if only the percentage needs to change.
*   **Atomic Updates**: Ensure that if you're updating both application assets and the config, they are consistent. Client-side logic should be resilient to temporary mismatches if asset deployment takes time.
*   **Rollback**: Define a rollback strategy. For client-side canary, this often means quickly updating `canary-config.json` to set the canary percentage to 0. CodePipeline can have a separate pipeline or manual action for this.

AWS CodePipeline provides the automation backbone to reliably deploy the different frontend asset versions and, most importantly, the `canary-config.json` that drives the client-side canary decision-making process.
