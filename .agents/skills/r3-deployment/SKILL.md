---
name: r3-deployment
description: Guide for deploying the Rule of Three (R3) strategy, messaging, and survey platform into BuyFacts. Covers Vite build configuration with sub-path base, Next.js rewrite configuration, Redux and React Router DOM integration, iframe viewer embedding, and deployment verification.
license: MIT
metadata:
  author: buyfacts
  version: "1.0.0"
---

# Rule of Three (R3) Deployment Guide

This skill documents how to build and deploy the embedded version of the **Rule of Three (R3)** platform (`C:\Users\USER\R3`) into the **BuyFacts** Next.js platform (`public/rule-of-three-app/` and `/rule-of-three`).

---

## 1. Architecture Overview

- **Source Repository**: `C:\Users\USER\R3` (Vite + React + Redux + React-Router-DOM v7)
- **Deployment Target**: `c:\Users\USER\BuyFacts\public\rule-of-three-app\` (Embedded via Next.js `<iframe>` at `/rule-of-three` or `/r3`, and direct static route `/rule-of-three-app/index.html`)
- **Embedded Route**: `c:\Users\USER\BuyFacts\app\rule-of-three\page.tsx` using `RuleOfThreeViewer` component (`components/r3/RuleOfThreeViewer.tsx`)
- **Sub-Route Pathways**:
  - `/welcome`: Welcome orientation and framework introduction
  - `/activemode`: Active respondent surveying mode
  - `/push-marketing`: Push marketing outbound message evaluation
  - `/social-media`: Multi-channel social media feedback testing
  - `/top-level`: Executive synthesis and decision rule summary

---

## 2. Configuration Requirements

### A. Sub-Path Base Configuration (`vite.config.js`)
- **Setting**: Set `base: process.env.VITE_BASE || '/rule-of-three-app/'` in `C:\Users\USER\R3\vite.config.js`.
- **Reason**: R3 is served from the `/rule-of-three-app/` sub-path. Setting the base ensures assets and internal links resolve correctly to `/rule-of-three-app/assets/...`.

### B. React Router DOM Routing Architecture (`src/main.jsx`)
- **Setting**: R3 uses `BrowserRouter` with `basename` set dynamically:
  ```js
  const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/+$/, "") || undefined;
  ```
- **Next.js Rewrite Requirement**: Because R3 uses HTML5 history routing (`BrowserRouter`) rather than hash routing, Next.js must rewrite all sub-paths under `/rule-of-three-app/` back to `/rule-of-three-app/index.html`:
  ```ts
  {
    source: "/rule-of-three-app/:path*",
    destination: "/rule-of-three-app/index.html",
  }
  ```

### C. Zero-Emoji Compliance
- Ensure all source code, variable names, comments, docstrings, and documentation contain zero emojis.

---

## 3. Build & Deployment Procedure

### Automated Bundling Command
From the BuyFacts root directory:
```bash
npm run embed-r3
```

This runs `scripts/bundle-r3.js`, which:
1. Validates the source repository at `C:\Users\USER\R3`.
2. Runs `npm run build` in the R3 directory with `VITE_BASE=/rule-of-three-app/`.
3. Verifies generated build artifacts in `dist/`.
4. Copies the output files cleanly into `c:\Users\USER\BuyFacts\public\rule-of-three-app/`.
5. Verifies `index.html` and bundled assets exist.

### Unified All-Tools Build
To build all four embedded tools in sequence:
```bash
npm run embed-tools
```
(Runs `embed-cubicon`, `embed-research-lib`, `embed-triad`, and `embed-r3`).

---

## 4. Verification Checklist

1. **Verify Asset Presence**:
   - `public/rule-of-three-app/index.html` exists and references `/rule-of-three-app/assets/`.
   - `public/rule-of-three-app/assets/` contains bundle JS, CSS, and SVG logos.

2. **Verify Next.js Rewrites**:
   - Direct requests to `/rule-of-three-app` or `/rule-of-three-app/activemode` resolve to `index.html`.
   - Aliases `/r3-app` and `/r3` resolve to `/rule-of-three-app/index.html` and `/rule-of-three`.

3. **Verify Component & Page**:
   - `components/r3/RuleOfThreeViewer.tsx` provides route tabs, reload, fullscreen, and iframe loading preloader.
   - `app/rule-of-three/page.tsx` renders Navbar, RuleOfThreeViewer, value pillars, CTA, and Footer.

4. **Verify Automated Tests**:
   ```bash
   npx tsx --test tests/rule-of-three-embed-integration.test.ts
   ```
