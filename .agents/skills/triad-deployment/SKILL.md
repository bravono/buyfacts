---
name: triad-deployment
description: Guide for deploying the TRIAD interactive sentiment and reflection platform into BuyFacts. Covers Vite build configuration, React Router hash routing for embedded iframes, asset path normalization, static data packaging, fullscreen embedding, and Next.js integration.
license: MIT
metadata:
  author: buyfacts
  version: "1.0.0"
---

# TRIAD Deployment Guide

This skill documents how to build and deploy the embedded version of the **TRIAD** platform (`C:\Users\USER\TRIAD`) into the **BuyFacts** Next.js platform (`public/triad-app/` and `/triad`).

---

## 1. Architecture Overview

- **Source Repository**: `C:\Users\USER\TRIAD` (Vite + React + Konva + React-Router-DOM + Ant Design)
- **Deployment Target**: `c:\Users\USER\BuyFacts\public\triad-app\` (Embedded via Next.js `<iframe>` at `/triad` and direct static URL `/triad-app/index.html`)
- **Embedded Route**: `c:\Users\USER\BuyFacts\app\triad\page.tsx` using `TriadInteractiveViewer` component (`components/triad/TriadInteractiveViewer.tsx`)
- **Core Datasets**:
  - `public/triad-app/KYM_TRIAD_DATA.json`: 20-Question Know Your Major dataset
  - `public/triad-app/MAJORS_DATA.json`: Academic majors discovery and comparison dataset
  - `public/triad-app/TRIAD_DATA.json`: Sentiment engine query definitions

---

## 2. Configuration Requirements

### A. Asset Path Normalization (`vite.config.js`)
- **Setting**: Set `base: "./"` in `vite.config.js` so Vite outputs relative paths for all scripts, CSS, and assets.
- **Reason**: When mounted inside an iframe at `/triad-app/index.html`, leading slashes (`/assets/...`) attempt to resolve from domain root (`/`), causing 404s. Relative paths (`./assets/...`) resolve correctly under `/triad-app/`.

### B. React Router Embedded Hash Routing (`src/main.jsx`)
- **Setting**: Use `createHashRouter` in `src/main.jsx`.
- **Reason**: In embedded iframes, HTML5 browser history (`createBrowserRouter`) attempts to alter the parent pathname and triggers Next.js App Router 404s on refresh. `createHashRouter` keeps all sub-routes (`#/`, `#/student`, `#/triad`, `#/quiz`, `#/browse`) contained cleanly within the iframe.

### C. Zero-Emoji Compliance
- Per global development standards, ensure all source code, comments, documentation, and error boundaries contain zero emojis.

---

## 3. Step-by-Step Deployment Workflow

### Step 1: Rebuild the TRIAD Bundle
In `C:\Users\USER\TRIAD`:
```bash
npm run build
```

### Step 2: Sync Build Output
Copy the build output from `C:\Users\USER\TRIAD\dist\*` to `c:\Users\USER\BuyFacts\public\triad-app\`:
```powershell
Copy-Item -Path "C:\Users\USER\TRIAD\dist\*" -Destination "c:\Users\USER\BuyFacts\public\triad-app\" -Recurse -Force
```

### Step 3: Verify Next.js Build
In `c:\Users\USER\BuyFacts`:
```bash
npm run build
```
Verify zero build errors and clean route generation for `/triad`.

### Step 4: Run Tests
Run the integration test suite:
```bash
npx tsx --test tests/triad-embed-integration.test.ts
```
