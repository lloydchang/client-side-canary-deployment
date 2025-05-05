# Changelog

This document logs significant changes to the Client-Side Canary Deployment project.

## [1.1.0] - 2024-01-10

### Removed
- Feature flag functionality has been removed to simplify the codebase
- Removed `defineFeatures` and `defineFeature` methods from `canary.js`
- Removed `isEnabled` method from `canary.js`
- Removed `reloadFeatureFlags` method from `canary.js`
- Removed `_features` property from the canary object
- Removed `isFeatureFlagEnabled` function from `default-constants.js`
- Removed related PostHog feature flag functionality

### Changed
- Updated documentation to reflect the removal of feature flags
- Simplified assignment and storage logic in `canary.js`
- Reduced PostHog API integrations to focus only on analytics and metrics
- Updated GitHub workflow documentation to remove feature flag references

### Why this change?
The feature flag system added complexity that wasn't necessary for the core canary deployment functionality. By removing it, we've:
- Simplified the codebase and reduced potential points of failure
- Focused the library on its core purpose: managing stable vs. canary user assignments
- Made the system easier to understand and maintain
- Improved performance by removing unnecessary API calls and storage operations

If you need feature flags, we recommend using a dedicated solution like:
- LaunchDarkly
- Split.io
- Optimizely
- PostHog's native feature flag system
