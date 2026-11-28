/**
 * ============================================================================
 * RULE OF THREE (R3) EMBEDDED BUNDLER SCRIPT FOR BUYFACTS
 * ============================================================================
 *
 * PURPOSE:
 * Automates building and deploying the embedded Rule of Three (R3) application
 * from the `C:\Users\USER\R3` repository into BuyFacts at `public/rule-of-three-app/`.
 *
 * HOW TO RUN:
 *   npm run embed-r3
 * ============================================================================
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Resolve paths
const buyfactsDir = path.resolve(__dirname, "..");
const r3Dir = path.resolve(buyfactsDir, "..", "R3");
const targetAppDir = path.join(buyfactsDir, "public", "rule-of-three-app");

console.log("--------------------------------------------------");
console.log("Starting Rule of Three (R3) Embedded App Bundler...");
console.log(`R3 Source:     ${r3Dir}`);
console.log(`Target Output: ${targetAppDir}`);
console.log("--------------------------------------------------");

// Step 1: Ensure R3 directory exists
if (!fs.existsSync(r3Dir)) {
  console.error(`ERROR: R3 repository not found at ${r3Dir}`);
  process.exit(1);
}

try {
  // Step 2: Run Vite build with base /rule-of-three-app/
  console.log("\n[1/3] Building Rule of Three production bundle...");
  execSync("npm run build", { cwd: r3Dir, stdio: "inherit" });

  // Step 3: Verify dist directory exists
  const distDir = path.join(r3Dir, "dist");
  if (!fs.existsSync(distDir)) {
    console.error(`ERROR: Build output dist directory not found at ${distDir}`);
    process.exit(1);
  }

  // Step 4: Ensure target directory exists and sync build output
  console.log("\n[2/3] Syncing dist output to public/rule-of-three-app/...");
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
    console.error("ERROR: index.html missing from public/rule-of-three-app/");
    process.exit(1);
  }

  console.log("--------------------------------------------------");
  console.log("Rule of Three embedded bundle successfully synced to public/rule-of-three-app/");
  console.log("Embedded route active at: /rule-of-three and /r3");
  console.log("Direct static access at:  /rule-of-three-app/index.html");
  console.log("--------------------------------------------------");
} catch (error) {
  console.error("FATAL: Rule of Three bundler encountered an error:", error.message);
  process.exit(1);
}
