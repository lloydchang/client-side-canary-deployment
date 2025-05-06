#!/bin/bash
# filepath: /Users/lloyd/github/client-side-canary-deployment/local-deploy.sh

echo "Generating Canary History Data..."
node .github/scripts/generate-canary-history.js

echo "Running any other steps from workflow..."
# Add other processing steps from the workflow here

echo "Serving the frontend files..."
cd frontend
python -m http.server 8080  # Or your preferred local server
