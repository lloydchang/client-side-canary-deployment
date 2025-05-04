#!/bin/bash

# Get current date and time in ISO format
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Read current version and increment it
VERSION_FILE="version.json"
if [ -f "$VERSION_FILE" ]; then
  CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$VERSION_FILE" | cut -d'"' -f4)
  
  # Split version into parts
  IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
  
  # Increment patch version
  PATCH=$((VERSION_PARTS[2] + 1))
  
  # Create new version string
  NEW_VERSION="${VERSION_PARTS[0]}.${VERSION_PARTS[1]}.$PATCH"
else
  # Default to 1.0.0 if file doesn't exist
  NEW_VERSION="1.0.0"
fi

# Write updated version.json
cat > "$VERSION_FILE" << EOF
{
  "version": "$NEW_VERSION",
  "lastUpdated": "$TIMESTAMP"
}
EOF

echo "Updated version.json to version $NEW_VERSION"
