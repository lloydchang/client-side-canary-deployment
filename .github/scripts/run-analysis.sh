#!/bin/bash -x
# Script to run canary analysis

chmod +x ./.github/scripts/canary-analyzer.js
# node ./.github/scripts/canary-analyzer.js --simulate-errors
node ./.github/scripts/canary-analyzer.js

# Export percentage to GitHub env
CANARY_PERCENTAGE=$(jq -r '.recommendation.percentage' canary-analysis.json)
echo "CANARY_PERCENTAGE=$CANARY_PERCENTAGE" >> $GITHUB_ENV

echo "Analysis completed, recommended percentage: $CANARY_PERCENTAGE%"
