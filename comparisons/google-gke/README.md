# Client-Side Canary Deployments with Google Kubernetes Engine (GKE)

This document outlines how Google Kubernetes Engine (GKE) can support a client-side canary deployment strategy. Similar to other Kubernetes platforms, GKE can host the necessary application versions and configuration files, while the actual canary decision logic resides in the client's browser.

## Core Concepts

Client-side canary deployment relies on:
1. JavaScript in the browser fetching a configuration file (e.g., `canary-config.json`).
2. This file specifying the percentage of users to receive the canary version.
3. The script dynamically loading assets for either the stable or canary version.

GKE can facilitate this by:

*   **Hosting Frontend Applications**: Running containerized frontend web servers (e.g., Nginx) as Kubernetes Deployments on GKE.
*   **Serving Multiple Versions**:
    *   Deploying distinct Kubernetes Deployments for stable (`frontend-stable`) and canary (`frontend-canary`) application versions.
    *   Each deployment uses a specific Docker image (e.g., `gcr.io/my-project/frontend-app:stable-v1`, `gcr.io/my-project/frontend-app:canary-v2`).
*   **Serving `canary-config.json`**:
    *   **ConfigMap**: Storing the `canary-config.json` content within a Kubernetes ConfigMap. This can be mounted into frontend server pods or served via a dedicated microservice.
    *   **External Storage**: Clients fetch `canary-config.json` from an external source like Google Cloud Storage (GCS), managed by CI/CD pipelines.
*   **Ingress for Access**: Using Kubernetes Ingress (e.g., GKE Ingress backed by Google Cloud Load Balancing) to expose frontend applications.

## How GKE Facilitates Client-Side Canary

1.  **Deployment of Application Versions**:
    *   Define Kubernetes `Deployment` manifests for stable and canary frontend versions, similar to how it's done on EKS or other Kubernetes platforms.
    *   Use distinct Docker images stored in Google Container Registry (GCR) or Artifact Registry.
    *   Expose these Deployments via Kubernetes `Service` resources.

2.  **Managing and Serving `canary-config.json`**:
    *   **Option A: ConfigMap on GKE**:
        *   Create a `ConfigMap` with `canary-config.json` data.
        *   Mount this ConfigMap into frontend server pods (e.g., Nginx) to serve the file (e.g., at `/config/canary.json`).
        *   Updates to the ConfigMap (e.g., changing `CANARY_PERCENTAGE`) are applied to the GKE cluster. Pods might need a rolling update to pick up changes if the web server doesn't auto-reload.
    *   **Option B: Google Cloud Storage (GCS)**:
        *   Store `canary-config.json` in a GCS bucket.
        *   Client-side JavaScript fetches the config directly from GCS (ensure appropriate CORS and cache settings).
        *   CI/CD pipelines (e.g., Google Cloud Build) update this GCS object.

3.  **Client-Side Logic**:
    *   The `index.html` (served by GKE-hosted pods) contains JavaScript.
    *   This script fetches `canary-config.json` (from GKE via ConfigMap path, or from GCS).
    *   Based on the config, it decides to load stable or canary assets, which are also served by GKE.

4.  **CI/CD Integration (e.g., Google Cloud Build, Jenkins, GitLab CI, Argo CD, Flux)**:
    *   To change `CANARY_PERCENTAGE`:
        *   The CI/CD pipeline updates the `ConfigMap` manifest (if using GitOps) and applies it to GKE.
        *   Or, it uses `gcloud` or `kubectl` commands to update the ConfigMap.
        *   Or, it updates the `canary-config.json` in GCS.
    *   The pipeline also manages deployments of new stable/canary frontend images to GKE.

## Considerations for GKE

*   **GKE Ingress**: While GKE Ingress can perform server-side traffic splitting for canary releases (a different pattern), for client-side canary, its primary role is to provide a stable endpoint to the frontend application(s).
*   **ConfigMap Updates**: As with other Kubernetes systems, be aware of how applications consume ConfigMap updates.
*   **Identity and Access**: Use Workload Identity for GKE pods to securely access other Google Cloud services like GCS if needed, without managing service account keys.
*   **Alternative: Server-Side Canary**: GKE, combined with tools like Istio (available as an add-on) or native Ingress features, excels at server-side canary deployments. It's important to distinguish this from the client-side approach where GKE's role is primarily hosting.
*   **GitOps**: Tools like Argo CD or Flux, integrated with GKE, provide robust declarative management for your frontend Deployments and `canary-config` ConfigMaps.

Using GKE for client-side canary deployments means leveraging its container orchestration capabilities to serve different application versions and potentially the configuration file. The core decision logic remains firmly within the client's browser, driven by the fetched `canary-config.json`.
