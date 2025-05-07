# Client-Side Canary Deployments with Amazon EKS

This document outlines how Amazon Elastic Kubernetes Service (EKS) can be used to support a client-side canary deployment strategy. While EKS and Kubernetes offer powerful server-side canary capabilities (e.g., via Ingress controllers or service meshes), this focuses on how EKS can serve the static assets and configuration for a *client-side* driven canary.

## Core Concepts

In a client-side canary deployment:
1. JavaScript in the user's browser fetches a `canary-config.json` file.
2. This configuration dictates the canary rollout percentage.
3. The script then loads assets for either the stable or canary version of the application.

Amazon EKS can support this by:

*   **Hosting Frontend Applications**: Running containerized frontend applications (e.g., Nginx serving static files) as Kubernetes Deployments.
*   **Serving Multiple Versions**:
    *   Deploying separate Kubernetes Deployments for the stable (`frontend-stable`) and canary (`frontend-canary`) versions of your application.
    *   Each deployment would use a different Docker image (e.g., `myapp:stable-v1.0`, `myapp:canary-v1.1`).
*   **Serving `canary-config.json`**:
    *   **ConfigMap**: Store `canary-config.json` content within a Kubernetes ConfigMap. This ConfigMap can be mounted into the frontend server pods or served via a small, dedicated service.
    *   **External Storage**: The client could fetch `canary-config.json` from an external source like Amazon S3, managed outside of EKS but updated by a CI/CD pipeline that also manages EKS deployments.
*   **Ingress for Access**: Using a Kubernetes Ingress resource (e.g., with AWS Load Balancer Controller) to expose your frontend application(s) to the internet. The Ingress can route to services pointing to your stable and canary deployments if they need distinct endpoints, or to a primary service if the client-side logic handles asset pathing.

## How EKS Facilitates Client-Side Canary

1.  **Deployment of Application Versions**:
    *   Define Kubernetes `Deployment` manifests for your stable and canary frontend versions.
        ```yaml
        # frontend-stable-deployment.yaml
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: frontend-stable
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: frontend
              version: stable
          template:
            metadata:
              labels:
                app: frontend
                version: stable
            spec:
              containers:
              - name: frontend
                image: your-repo/frontend-app:stable-1.2.0
                ports:
                - containerPort: 80
        ---
        # frontend-canary-deployment.yaml (similar, with canary image and labels)
        ```
    *   Expose these deployments via Kubernetes `Service` resources.

2.  **Managing and Serving `canary-config.json`**:
    *   **Option A: ConfigMap**:
        *   Create a `ConfigMap` with the `canary-config.json` data:
            ```yaml
            apiVersion: v1
            kind: ConfigMap
            metadata:
              name: canary-config
            data:
              config.json: |
                {
                  "CANARY_PERCENTAGE": 5,
                  "FEATURE_FLAGS": { "newFeatureX": "canary" }
                }
            ```
        *   Mount this ConfigMap into your frontend server pods (e.g., Nginx) so it can serve this file from a specific path (e.g., `/config/canary.json`).
        *   Updates to the ConfigMap (e.g., changing `CANARY_PERCENTAGE`) would require pods to be restarted/reloaded to pick up changes if serving directly from the mounted file, or the client fetches it from a service that reads the ConfigMap.
    *   **Option B: External (e.g., S3)**:
        *   The client-side JavaScript fetches `canary-config.json` directly from a pre-defined S3 URL.
        *   CI/CD pipelines update this S3 object. EKS's role is then primarily to serve the core application assets that *consume* this config.

3.  **Client-Side Logic**:
    *   The `index.html` (served by one of the EKS-hosted frontend pods) contains JavaScript.
    *   This script fetches `canary-config.json` (either from a path served by EKS via ConfigMap, or from S3).
    *   Based on the configuration, it decides whether to load stable or canary assets. These assets themselves are served by the respective stable/canary deployments on EKS.

4.  **CI/CD Integration (e.g., Jenkins, GitLab CI, Argo CD, Flux)**:
    *   When `CANARY_PERCENTAGE` needs to change:
        *   The CI/CD pipeline updates the `ConfigMap` manifest in Git (if using GitOps with Argo CD/Flux) and applies it to the EKS cluster.
        *   Or, the pipeline uses `kubectl apply -f new-configmap.yaml`.
        *   Or, it updates the `canary-config.json` file in S3.
    *   The pipeline also handles deploying new versions of `frontend-stable` or `frontend-canary` images.

## Considerations for EKS

*   **Complexity**: Kubernetes adds operational complexity. For purely static site hosting with client-side canary, simpler solutions like S3/CloudFront might be more straightforward unless Kubernetes is already in use for other backend services.
*   **ConfigMap Updates**: If using ConfigMaps for `canary-config.json`, be mindful of how applications consume these updates. Pods might need to be rolled (restarted) to pick up changes to mounted ConfigMaps unless the application is designed to watch for file changes or an intermediate service serves the config dynamically.
*   **Server-Side Canary as an Alternative**: EKS is well-suited for server-side canary deployments using Ingress controllers (like NGINX or AWS Load Balancer Controller with traffic splitting) or service meshes (like Istio, Linkerd). This is a different pattern where the infrastructure routes a percentage of traffic to a new version. For client-side canary, EKS's role is more about hosting the versions and the config that the *client* uses to decide.
*   **GitOps**: Tools like Argo CD or Flux are excellent for managing EKS deployments declaratively, including the frontend Deployments and the `canary-config` ConfigMap.

Using EKS for client-side canary deployments involves leveraging its robust container orchestration to serve different versions of your frontend application and potentially the `canary-config.json` itself. The primary decision logic, however, remains in the client's browser.
