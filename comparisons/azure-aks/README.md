# Client-Side Canary Deployments with Azure Kubernetes Service (AKS)

This document describes how Azure Kubernetes Service (AKS) can be utilized to support a client-side canary deployment strategy. In this model, AKS hosts the application versions and configuration, but the canary assignment logic is executed by JavaScript in the user's browser.

## Core Concepts

A client-side canary deployment involves:
1. Client-side JavaScript fetching a `canary-config.json` file.
2. This configuration file defining the canary rollout percentage.
3. The script then loading assets for either the stable or canary application version.

AKS can support this by:

*   **Hosting Frontend Applications**: Running containerized frontend web servers (e.g., Nginx) as Kubernetes Deployments on AKS.
*   **Serving Multiple Versions**:
    *   Deploying separate Kubernetes Deployments for the stable (`frontend-stable`) and canary (`frontend-canary`) versions.
    *   Each deployment uses a distinct Docker image (e.g., `myacr.azurecr.io/frontend:stable-v1`, `myacr.azurecr.io/frontend:canary-v2`) stored in Azure Container Registry (ACR).
*   **Serving `canary-config.json`**:
    *   **ConfigMap**: Storing `canary-config.json` content within a Kubernetes ConfigMap. This can be mounted into frontend server pods or exposed via a service.
    *   **External Storage**: Clients fetch `canary-config.json` from an external source like Azure Blob Storage, which is updated by CI/CD pipelines.
*   **Ingress for Access**: Using Kubernetes Ingress (e.g., with Azure Application Gateway Ingress Controller or NGINX Ingress) to expose frontend applications.

## How AKS Facilitates Client-Side Canary

1.  **Deployment of Application Versions**:
    *   Define Kubernetes `Deployment` manifests for stable and canary frontend versions.
    *   Store Docker images in Azure Container Registry (ACR).
    *   Expose these Deployments via Kubernetes `Service` resources.

2.  **Managing and Serving `canary-config.json`**:
    *   **Option A: ConfigMap on AKS**:
        *   Create a `ConfigMap` with `canary-config.json` data.
        *   Mount this ConfigMap into frontend server pods (e.g., Nginx) to serve the file (e.g., at `/config/canary.json`).
        *   Updates to the ConfigMap (e.g., changing `CANARY_PERCENTAGE`) are applied to the AKS cluster. Pods might need a rolling update to pick up changes.
    *   **Option B: Azure Blob Storage**:
        *   Store `canary-config.json` in an Azure Blob Storage container.
        *   Client-side JavaScript fetches the config directly from Blob Storage (ensure CORS and cache settings are appropriate).
        *   CI/CD pipelines (e.g., Azure Pipelines, GitHub Actions) update this blob.

3.  **Client-Side Logic**:
    *   The `index.html` (served by AKS-hosted pods) contains JavaScript.
    *   This script fetches `canary-config.json` (from AKS via ConfigMap path, or from Azure Blob Storage).
    *   Based on the config, it decides to load stable or canary assets, which are also served by AKS.

4.  **CI/CD Integration (e.g., Azure Pipelines, GitHub Actions, Jenkins, Argo CD, Flux)**:
    *   To change `CANARY_PERCENTAGE`:
        *   The CI/CD pipeline updates the `ConfigMap` manifest (if using GitOps) and applies it to AKS.
        *   Or, it uses `kubectl apply` with the updated ConfigMap definition.
        *   Or, it updates the `canary-config.json` in Azure Blob Storage using Azure CLI or SDKs.
    *   The pipeline also manages deployments of new stable/canary frontend images to AKS.

## Considerations for AKS

*   **AKS Ingress Controllers**: Azure Application Gateway Ingress Controller (AGIC) or other Ingress solutions like NGINX can perform server-side traffic splitting for canary releases. This is a distinct pattern from client-side canary, where AKS's role is primarily to host the assets and config that the *client* uses.
*   **ConfigMap Updates**: Be mindful of how applications consume ConfigMap updates on Kubernetes.
*   **Managed Identity**: Use Azure AD Pod Identity (or Workload Identity for AKS as it becomes more prevalent) for AKS pods to securely access other Azure resources like Blob Storage without managing secrets directly.
*   **Alternative: Server-Side Canary**: AKS, especially with service meshes like Istio or Linkerd, or advanced Ingress capabilities, is well-suited for server-side canary deployments.
*   **GitOps**: Tools like Flux or Argo CD can be integrated with AKS for declarative management of frontend Deployments and `canary-config` ConfigMaps.

Using AKS for client-side canary deployments involves leveraging its robust container orchestration to serve different versions of your frontend application and potentially the `canary-config.json` itself. The decision logic remains in the client's browser, driven by the fetched configuration.
