#!/bin/bash
# Script to manually adjust canary percentage

# Update version
./.github/scripts/update-version.sh

# Set up git config
git config --local user.name "$GIT_USER_NAME"
git config --local user.email "$GIT_USER_EMAIL"

# Get latest main branch
git fetch origin
git reset --hard origin/main

# Update version again after reset
./.github/scripts/update-version.sh

# Run canary analyzer with manual percentage
chmod +x ./.github/scripts/canary-analyzer.js
node ./.github/scripts/canary-analyzer.js --percentage=$CANARY_PERCENTAGE

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
  git commit -m "Manual update of canary percentage to $CANARY_PERCENTAGE% [skip ci]"
  
  # Retry logic for pushing
  MAX_RETRIES=3
  RETRY_COUNT=0
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    git pull --rebase origin main || {
      git rebase --abort
      git reset --hard origin/main
      ./.github/scripts/update-version.sh
      node ./.github/scripts/canary-analyzer.js --percentage=$CANARY_PERCENTAGE
      git add frontend/version.json frontend/assets/config/canary-config.json
      
      if ! git diff --staged --quiet; then
        if git diff --staged | grep -E '[+-].*"canaryPercentage"' > /dev/null; then
          git commit -m "Manual update of canary percentage to $CANARY_PERCENTAGE% (conflict resolution) [skip ci]"
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

echo "Canary percentage adjusted to $CANARY_PERCENTAGE%"
