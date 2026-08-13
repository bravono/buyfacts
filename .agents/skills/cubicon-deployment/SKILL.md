---
name: cubicon-deployment
description: Guide for deploying the Cubicon 3D survey application into BuyFacts. Covers Vite build configuration, React Router embedded iframe routing, asset path normalization, Prisma database API integration (/api/cubicon-data), 3D material settings, cubicon-mini branch usage, asset management restrictions, and deployment verification. Triggers on "deploy cubicon", "cubicon build", "embed cubicon", "cubicon white screen", "cubicon backend", "cubicon-mini".
license: MIT
metadata:
  author: buyfacts
  version: "1.2.0"
---

# Cubicon Deployment Guide

This skill documents how to successfully build and deploy the embedded version of the **Cubicon** 3D survey app into the **BuyFacts** Next.js platform (`public/cubicon-app/`).

---

## 1. Architecture & Git Branch Rules

- **Source Repository**: `c:\Users\USER\cubicon` (Vite + React + Three.js / React Three Fiber)
- **Git Branch for Bundling**: **`cubicon-mini`**
  - > [!IMPORTANT]
  - > Always switch to and build from the **`cubicon-mini`** branch in `c:\Users\USER\cubicon` when bundling for BuyFacts.
  - > The `cubicon-mini` branch contains the specific lightweight, embedded implementation for BuyFacts, separate from the full standalone application on `master` / `main`.
- **Deployment Target**: `c:\Users\USER\BuyFacts\public\cubicon-app\` (Embedded via Next.js `<iframe>` at `/cubicon`)
- **Backend Task API**: BuyFacts Next.js route `/api/cubicon-data` (backed by `prisma.cubiconTask`)

---

## 2. Asset Management & Deletion Constraints

> [!CAUTION]
> **Strict User Rules on Assets**:
> 1. **Do NOT manually copy asset files or image directories into BuyFacts** (e.g. `public/arts`). The user manages assets manually.
> 2. **Do NOT delete project assets or files on behalf of the user**.
> 3. Only copy standard Vite build output (`c:\Users\USER\cubicon\dist\*`) into `public/cubicon-app/` during deployment.

---

## 3. Critical Configuration Rules

### A. React Router Embedded Iframe Routing (`App.jsx`)
- **Issue**: Embedded iframes mount at paths like `/cubicon-app/index.html` or `/`. If routes are hardcoded to legacy prefixes (e.g. `/gotcha/truescreen/dist/task`) without fallbacks, React Router falls back to wildcard routes.
- **Rule**: If a wildcard fallback returns an empty React fragment (`<></>`) and attempts `navigate("/task")`, it creates an infinite loop resulting in a **solid blank white page**.
- **Fix**: Map root and relative paths (`/`, `/task`, `/welcome`) to `<ModelCanvas />` and ensure the wildcard route falls back to `<ModelCanvas />`:
  ```jsx
  <Routes>
    <Route path="/" element={<ModelCanvas />} />
    <Route path="/task" element={<ModelCanvas />} />
    <Route path="/welcome" element={<ModelCanvas />} />
    <Route path="*" element={<ModelCanvas />} />
  </Routes>
  ```

### B. Asset Path Normalization (`vite.config.js` & Components)
- **Vite Config**: Set `base: "./"` in `vite.config.js` so Vite outputs relative asset paths.
- **Double Slash Hazard**: Never concatenate `${import.meta.env.BASE_URL}/assets/studio.exr`. When `BASE_URL` is `"./"`, concatenation produces `.//assets/studio.exr`. Browsers interpret `//` as a scheme-relative external URL (`http://assets/studio.exr`), breaking GLB, EXR, and PNG asset downloads.
- **Fix**: Use direct static paths without `BASE_URL` concatenation:
  - Model GLB: `"assets/Cubicon10.glb"`
  - Environment EXR: `"assets/studio.exr"`
  - Textures: `"cubicon_logo.png"`

### C. 3D Model Materials (`TaskModel.jsx`)
- **White Model Hazard**: Do NOT forcefully override `metalness` (e.g. `metalness = 0.65`) or `roughness` (`0.15`) across all meshes during `scene.traverse()`. High metalness combined with studio lighting causes GLB materials to act like mirrors, reflecting white ambient light and rendering the model solid white.
- **Fix**: Allow embedded GLB materials and textures to render naturally without forced metalness/roughness property overrides.

### D. Backend API Integration (`config.json` & Services)
- **Config**: Set `"apiEndpoint": "/api/cubicon-data"` in `src/config.json`.
- **Services**: Send `POST` requests directly to `apiEndpoint` in `userServices.js` and `taskServices.js`. Access `window.sessionStart?.sessionId || "12345"` safely.

---

## 4. Step-by-Step Deployment Workflow

### Step 1: Switch to `cubicon-mini` Branch & Rebuild
In `c:\Users\USER\cubicon`:
```bash
git checkout cubicon-mini
npm run build
```

### Step 2: Sync Build Output
Copy contents of `c:\Users\USER\cubicon\dist\*` into `c:\Users\USER\BuyFacts\public\cubicon-app\`.

### Step 3: Configure `index.html` Overlay Helpers
Ensure `c:\Users\USER\BuyFacts\public\cubicon-app\index.html` contains:
- Single active JS script tag: `<script type="module" crossorigin src="./assets/index-[hash].js"></script>`
- Passive wheel event listener script to prevent console scroll warnings.
- `touch-action: pan-y !important;` CSS for smooth mobile touch interaction.
- Navbar suppression styles (`display: none !important;`) to hide embedded navbars when inside BuyFacts.

### Step 4: Verify Next.js Compilation
Run production build in `c:\Users\USER\BuyFacts`:
```bash
npm run build
```
Verify zero build errors and clean route generation for `/cubicon` and `/api/cubicon-data`.
