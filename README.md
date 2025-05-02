# Client-Side Canary Deployment

Deploy new features to a percentage of your users with a single line of code.

```html
<script src="canary.min.js"></script>
```

## Usage

### Basic Feature Flags

```html
<!-- Check if a feature should be enabled for this user -->
<script>
  if (canary.isEnabled('newDesign')) {
    // Show the new design
    document.body.classList.add('new-design');
  }
</script>
```

### Define Multiple Features

```html
<script>
  // Features defined with sensible defaults (5% of users initially)
  const features = {
    'newHeader': { description: 'Updated navigation header' },
    'betaCheckout': { description: 'Streamlined checkout process', initialPercentage: 2 }
  };
  
  canary.defineFeatures(features);
</script>
```

## How It Works

1. Assigns users to either stable or canary groups based on configurable percentages
2. Tracks errors, performance, and user engagement
3. Gradually increases canary percentage when metrics look good
4. Rolls back features if error rates increase
5. Persists user assignments in localStorage

```mermaid
graph LR
    A[User Visits Site] --> B{First Visit?}
    B -->|Yes| C{Assign Version}
    B -->|No| D[Load Saved Assignment]
    C -->|95%| E[Stable Experience]
    C -->|5%| F[Canary Experience]
    D --> G[Consistent Experience]
    E --> H[Collect Metrics]
    F --> H
    H --> I[Auto-Adjust Percentage]
```

## Enhanced Analytics (Optional)

Add PostHog analytics with one extra line:

```html
<script>
  canary.analytics('ph_YOUR_KEY_HERE');
</script>
```

## Configuration (Optional)

```html
<script>
  // All configuration is optional with sensible defaults
  canary.config({
    initialCanaryPercentage: 5, // Start with 5% of users
    maxCanaryPercentage: 50,    // Never go above 50% without manual review
    safetyThreshold: 2,         // Keep at least 2% even on rollback
    storageKey: 'my_app_canary' // Custom storage key
  });
</script>
```

## Viewing Results

Results are automatically collected and stored. View them anytime:

```html
<button onclick="console.table(canary.getResults())">Show Canary Results</button>
```

## Want More Control?

The one-line approach works for most cases, but you can [view advanced options](ADVANCED.md) if needed.
