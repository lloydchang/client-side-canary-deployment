# Client-Side Canary Deployment

A lightweight implementation of client-side canary deployments using vanilla JavaScript and browser session storage.

## Overview

This project demonstrates how to implement canary deployments for static web applications entirely on the client side. It allows you to gradually roll out new features to a subset of users without requiring server-side configuration.

## How It Works

1. When a user visits the [index.html](index.html) page, the script checks if they have already been assigned to a version (stored in `sessionStorage`)
2. If no version is assigned, the user is randomly directed to either:
   - The default version (v1)
   - The canary version (v2)
3. The assignment persists in the user's session, ensuring a consistent experience during their visit
4. The user is automatically redirected to the appropriate version

## Files

- [index.html](index.html): Entry point that handles version assignment and redirection
- [canary.json](canary.json): Configuration file defining default and canary versions
- [v1/index.html](v1/index.html): The default version of the application
- [v2/index.html](v2/index.html): The canary (new) version of the application

## Customization

You can modify the [canary.json](canary.json) file to change the version names or update the probability distribution in the JavaScript code to control the percentage of users who receive the canary version.

## Benefits

- No server-side logic required
- Works with static hosting (GitHub Pages, Netlify, etc.)
- Easy to implement and maintain
- Session-based persistence prevents users from seeing version changes during a visit

## Deployment

Simply deploy all files to your static hosting provider. The system will automatically handle redirecting users to the appropriate version.

## Future Enhancements

Potential improvements could include:
- Adding analytics to track version performance
- Implementing feature flags for more granular control
- Adding A/B testing capabilities
- Supporting cookies for longer-term version assignment

## License

[GNU Affero General Public License v3.0](LICENSE)