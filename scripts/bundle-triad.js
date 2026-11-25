/**
 * ============================================================================
 * TRIAD EMBEDDED BUNDLER SCRIPT FOR BUYFACTS
 * ============================================================================
 *
 * PURPOSE:
 * Automates building and deploying the embedded TRIAD platform from the
 * `C:\Users\USER\TRIAD` repository into BuyFacts at `public/triad-app/`.
 *
 * HOW TO RUN:
 *   npm run embed-triad
 * ============================================================================
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Resolve paths
const buyfactsDir = path.resolve(__dirname, "..");
const triadDir = path.resolve(buyfactsDir, "..", "TRIAD");
const targetAppDir = path.join(buyfactsDir, "public", "triad-app");

console.log("--------------------------------------------------");
console.log("Starting TRIAD Embedded App Bundler...");
console.log(`TRIAD Source:  ${triadDir}`);
console.log(`Target Output: ${targetAppDir}`);
console.log("--------------------------------------------------");

// Step 1: Ensure TRIAD directory exists
if (!fs.existsSync(triadDir)) {
  console.error(`ERROR: TRIAD repository not found at ${triadDir}`);
  process.exit(1);
}

try {
  // Step 2: Run Vite build
  console.log("\n[1/3] Building TRIAD production bundle...");
  execSync("npm run build", { cwd: triadDir, stdio: "inherit" });

  // Step 3: Verify dist directory exists
  const distDir = path.join(triadDir, "dist");
  if (!fs.existsSync(distDir)) {
    console.error(`ERROR: Build output dist directory not found at ${distDir}`);
    process.exit(1);
  }

  // Step 4: Ensure target directory exists and sync build output
  console.log("\n[2/3] Syncing dist output to public/triad-app/...");
  if (!fs.existsSync(targetAppDir)) {
    fs.mkdirSync(targetAppDir, { recursive: true });
  }

  function copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyDirectoryRecursive(distDir, targetAppDir);

  // Step 5: Verification
  console.log("\n[3/3] Verifying embedded deployment...");
  const targetIndex = path.join(targetAppDir, "index.html");
  if (!fs.existsSync(targetIndex)) {
    console.error("ERROR: index.html missing from public/triad-app/");
    process.exit(1);
  }

  console.log("--------------------------------------------------");
  console.log("TRIAD embedded bundle successfully synced to public/triad-app/");
  console.log("Embedded route active at: /triad");
  console.log("Direct static access at:  /triad-app/index.html");
  console.log("--------------------------------------------------");
} catch (error) {
  console.error("FATAL: TRIAD bundler encountered an error:", error.message);
  process.exit(1);
}
