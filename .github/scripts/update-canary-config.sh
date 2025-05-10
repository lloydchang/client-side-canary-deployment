#!/bin/bash
# Script to update canary configuration based on analysis

# Update version
./.github/scripts/update-version.sh

# Setup git config
git config --local user.name "$GIT_USER_NAME"
git config --local user.email "$GIT_USER_EMAIL"

# Get latest main branch
git fetch origin main
git checkout main
git reset --hard origin/main

# Update version again on fresh branch
./.github/scripts/update-version.sh

# Run analyzer with the recommended percentage
chmod +x ./.github/scripts/canary-analyzer.js
CANARY_PERCENTAGE=$(jq -r '.recommendation.percentage' canary-analysis.json)
# Add --skip-report-file to prevent overwriting the original analysis JSON
node ./.github/scripts/canary-analyzer.js --percentage=$CANARY_PERCENTAGE --skip-report-file

# Add modified files
git add frontend/version.json frontend/assets/config/canary-config.json

# Check if we have meaningful changes to commit
COMMIT_CHANGES=false
if ! git diff --staged --quiet; then
  if git diff --staged | grep -E '[+-].*"canaryPercentage"' > /dev/null; then
    COMMIT_CHANGES=true
  elif git diff --staged | grep -E '^\+' | grep -v '^\+\+\+' | grep -v '"lastUpdated"'; then
    COMMIT_CHANGES=true
  fi
fi

# Commit and push changes if needed
if [ "$COMMIT_CHANGES" = "true" ]; then
  git commit -m "Update canary percentage to $CANARY_PERCENTAGE% and version.json based on analytics [skip ci]"
  
  # Retry logic for pushing
  MAX_RETRIES=3
  RETRY_COUNT=0
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    git pull --rebase origin main || {
      git rebase --abort
      git reset --hard origin/main
      ./.github/scripts/update-version.sh
      # Add --skip-report-file here as well for consistency during conflict resolution
      node ./.github/scripts/canary-analyzer.js --percentage=$CANARY_PERCENTAGE --skip-report-file
      git add frontend/version.json frontend/assets/config/canary-config.json
      
      if ! git diff --staged --quiet; then
        if git diff --staged | grep -E '[+-].*"canaryPercentage"' > /dev/null; then
          git commit -m "Update canary percentage to $CANARY_PERCENTAGE% and version.json based on analytics (conflict resolution) [skip ci]"
        fi
      fi
    }
    
    if git push origin main; then
      break
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))
      [ $RETRY_COUNT -lt $MAX_RETRIES ] && sleep 5
    fi
  done
fi

# Generate canary history data
git pull origin main --rebase || true
chmod +x .github/scripts/generate-canary-history.js
node .github/scripts/generate-canary-history.js

# Commit history data
git add frontend/assets/data/canary-history.json
if ! git diff --staged --quiet frontend/assets/data/canary-history.json; then
  git commit -m "Update canary history data [skip ci]"
  
  # Retry logic for pushing history
  MAX_RETRIES=3
  RETRY_COUNT=0
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    git pull --rebase origin main || git rebase --abort
    
    if git push origin main; then
      break
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))
      [ $RETRY_COUNT -lt $MAX_RETRIES ] && sleep 5
    fi
  done
fi

echo "Configuration and history updated successfully"
