#!/bin/bash
# Generate the analysis report for GitHub Actions summary

echo "# Canary Deployment Analysis" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "Analysis timestamp: $(date)" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "## Results" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "| Version | Pageviews | Errors | Error Rate |" >> $GITHUB_STEP_SUMMARY
echo "|---------|-----------|--------|------------|" >> $GITHUB_STEP_SUMMARY
echo "| Stable | $(jq -r '.analytics.stable.pageviews' canary-analysis.json) | $(jq -r '.analytics.stable.errors' canary-analysis.json) | $(jq -r '.analytics.stable.errorRate' canary-analysis.json) |" >> $GITHUB_STEP_SUMMARY
echo "| Canary | $(jq -r '.analytics.canary.pageviews' canary-analysis.json) | $(jq -r '.analytics.canary.errors' canary-analysis.json) | $(jq -r '.analytics.canary.errorRate' canary-analysis.json) |" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "## Analysis" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "- Relative error increase: $(jq -r '.analytics.analysis.relativeErrorIncrease' canary-analysis.json)" >> $GITHUB_STEP_SUMMARY
echo "- Exceeds threshold: $(jq -r '.analytics.analysis.exceedsThreshold' canary-analysis.json)" >> $GITHUB_STEP_SUMMARY
echo "- **Recommended action**: $(jq -r '.analytics.analysis.recommendedAction' canary-analysis.json)" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "## Canary Update" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

# Determine update message based on actions taken
if [ -n "$CANARY_PERCENTAGE" ]; then
  echo "- **Canary percentage updated to $CANARY_PERCENTAGE%**" >> $GITHUB_STEP_SUMMARY
else 
  echo "- **No changes to canary percentage were needed**" >> $GITHUB_STEP_SUMMARY
fi

echo "" >> $GITHUB_STEP_SUMMARY
echo "## Configuration Update" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "The following configuration files were updated:" >> $GITHUB_STEP_SUMMARY
echo "- version.json: $(jq -r .version frontend/version.json)" >> $GITHUB_STEP_SUMMARY
if [ -f "frontend/assets/config/canary-config.json" ]; then
  echo "- canary-config.json: Updated with percentage $(jq -r '.distribution.canaryPercentage' frontend/assets/config/canary-config.json)%" >> $GITHUB_STEP_SUMMARY
else
  echo "⚠️ canary-config.json was not created/updated" >> $GITHUB_STEP_SUMMARY
fi
