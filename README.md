# Retro Computer Personal Website

https://edh.dev/ (formerly edwardh.io)

This was a project I built for fun over one of my uni breaks, built in TypeScript and THREE.js, it contains a number of nifty features such as:
- 3D retro computer that you can interact with
- very simple UNIX shell implementation
- files system implementation
- markdown interpreter and renderer
- text layout engine

![Image of website](https://edh.dev/icon/og-img1.png)

## Build Instructions 
``` bash
# Install dependencies (only the first time)
npm install

# Run the local server at localhost:1234
npm run dev

# Build for production in the dist/ directory
npm run build
```

# My_Portfolio

## Live GitHub projects

The main page loads the public, non-fork repositories owned by `ayaan523` and displays each repository's README and images. README content is loaded as its card approaches the viewport. A clickable **Live Demo** link appears when a repository has a Website URL configured in its GitHub About settings.

In the retro computer terminal, run `projects` to list repositories or `projects <repository-name>` to view a README. New public repositories appear without a site rebuild. GitHub's unauthenticated API rate limits apply.
