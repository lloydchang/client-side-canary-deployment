#!/bin/bash
# Script to update canary configuration with PostHog keys

mkdir -p frontend/assets/config
cp .github/config/canary-config-template.json frontend/assets/config/canary-config.json
cat > frontend/assets/config/canary-config.json << EOF
{
  "posthog": {
    "apiKey": "${POSTHOG_PUBLIC_KEY}",
    "projectId": "${POSTHOG_PROJECT_ID}",
    "host": "https://us.i.posthog.com"
  },
  "canary": {
    "initialPercentage": 5,
    "maxPercentage": 50,
    "incrementStep": 5
  }
}
EOF

# Configure Base Path
touch .nojekyll
mkdir -p config
echo '{ "baseUrl": "/client-side-canary-deployment" }' > config/gh-pages.json

echo "Config files updated successfully"
