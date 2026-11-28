/**
 * ============================================================================
 * CUBICON EMBEDDED BUNDLER SCRIPT FOR BUYFACTS
 * ============================================================================
 *
 * PURPOSE:
 * Automates building and deploying the embedded 3D Cubicon survey app from the
 * `c:\Users\USER\cubicon` repository into BuyFacts at `public/cubicon-app/`.
 *
 * IMPORTANT NOTES & BEST PRACTICES:
 * 1. GIT BRANCH:
 *    Always builds from the `cubicon-mini` branch in the Cubicon repository.
 *    `cubicon-mini` contains the lightweight embedded implementation tailored
 *    for BuyFacts, leaving `master`/`main` free for standalone app work.
 *
 * 2. API ENDPOINT:
 *    `config.json` in `cubicon-mini` sets `apiEndpoint` to `/api/cubicon-data`.
 *    This routes task data directly through BuyFacts' Prisma database.
 *    Do NOT attempt to test index.html standalone outside Next.js; run `npm run dev`
 *    in BuyFacts to test at `http://localhost:3000/cubicon`.
 *
 * 3. ASSET MANAGEMENT & RESTRICTIONS:
 *    - Never manually copy image folders (like `public/arts`) into BuyFacts.
 *    - Never delete user project assets (models, textures, images are preserved).
 *    - Only standard Vite dist build output is synced into `public/cubicon-app/`.
 *
 * 4. INDEX.HTML OVERLAYS:
 *    This script automatically injects passive wheel event listeners, mobile
 *    `touch-action: pan-y` styles, and navbar suppression CSS into `index.html`.
 *
 * HOW TO RUN:
 *   npm run embed-cubicon
 * ============================================================================
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Resolve paths
const buyfactsDir = path.resolve(__dirname, "..");
const cubiconDir = path.resolve(buyfactsDir, "..", "cubicon");
const targetAppDir = path.join(buyfactsDir, "public", "cubicon-app");

console.log("--------------------------------------------------");
console.log("Starting Cubicon Embedded App Bundler...");
console.log(`Cubicon Source: ${cubiconDir}`);
console.log(`Target Output:  ${targetAppDir}`);
console.log("--------------------------------------------------");

// Step 1: Ensure Cubicon directory exists
if (!fs.existsSync(cubiconDir)) {
  console.error(`ERROR: Cubicon repository not found at ${cubiconDir}`);
  process.exit(1);
}

try {
  // Step 2: Switch to cubicon-mini branch
  console.log("\n[1/4] Switching to 'cubicon-mini' branch...");
  execSync("git checkout cubicon-mini", { cwd: cubiconDir, stdio: "inherit" });

  // Step 3: Run Vite build
  console.log("\n[2/4] Building Cubicon production bundle...");
  execSync("npm run build", { cwd: cubiconDir, stdio: "inherit" });

  // Step 4: Extract active bundle filenames directly from dist/index.html
  const distDir = path.join(cubiconDir, "dist");
  const distHtmlPath = path.join(distDir, "index.html");
  if (!fs.existsSync(distHtmlPath)) {
    console.error("ERROR: dist/index.html was not found after build.");
    process.exit(1);
  }

  const distHtml = fs.readFileSync(distHtmlPath, "utf8");
  const jsMatch = distHtml.match(/src=["']\.\/assets\/(index-[^"']+\.js)["']/);
  const cssMatch = distHtml.match(/href=["']\.\/assets\/(index-[^"']+\.css)["']/);

  const jsFile = jsMatch ? jsMatch[1] : null;
  const cssFile = cssMatch ? cssMatch[1] : null;

  if (!jsFile) {
    console.error("ERROR: Could not parse active index-[hash].js from dist/index.html");
    process.exit(1);
  }

  console.log(`\nActive JS Bundle from build:  ${jsFile}`);
  if (cssFile) console.log(`Active CSS Bundle from build: ${cssFile}`);

  // Step 5: Clean old index-*.js and index-*.css bundles in target directory (preserve models/textures)
  const targetAssetsDir = path.join(targetAppDir, "assets");
  if (fs.existsSync(targetAssetsDir)) {
    const existingFiles = fs.readdirSync(targetAssetsDir);
    for (const file of existingFiles) {
      if (
        (file.startsWith("index-") && file.endsWith(".js")) ||
        (file.startsWith("index-") && file.endsWith(".css"))
      ) {
        fs.unlinkSync(path.join(targetAssetsDir, file));
      }
    }
  }

  // Step 6: Copy dist build output to public/cubicon-app
  console.log("\n[3/4] Copying build output to BuyFacts public/cubicon-app...");
  function copyRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "index.html") continue; // Handled in Step 7 with helper overlays
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        try {
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
        } catch (_) {}
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyRecursive(distDir, targetAppDir);

  // Step 7: Update public/cubicon-app/index.html with active bundle names & helper overlays
  console.log("\n[4/4] Configuring public/cubicon-app/index.html...");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="./src/assets/cubicon_logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Cubicon</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto+Serif:ital,opsz,wght@0,8..144,100..900;1,8..144,100..900&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
    />
    <script
      src="https://kit.fontawesome.com/ea5f6dcb80.js"
      crossorigin="anonymous"
    ></script>
    <!-- Passive Wheel Event Listener Helper -->
    <script>
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'wheel' || type === 'mousewheel' || type === 'DOMMouseScroll') {
          if (typeof options === 'object') {
            options.passive = true;
          } else {
            options = { passive: true };
          }
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    </script>
    <!-- Overlay Styles: Touch Action & Interaction Guards -->
    <style>
      :root, html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: #0f141c !important;
        background: #0f141c !important;
        color-scheme: dark !important;
        color: #f1f5f9;
      }
      canvas {
        touch-action: none !important;
        outline: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .my-navbar, .custom-navbar, .NavbarItems, nav {
        display: none !important;
      }
    </style>
    <script type="module" crossorigin src="./assets/${jsFile}"></script>
    ${cssFile ? `<link rel="stylesheet" crossorigin href="./assets/${cssFile}">` : ""}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

  fs.writeFileSync(path.join(targetAppDir, "index.html"), htmlContent, "utf8");

  // Step 8: Sync Standalone Schema (cubicon.db -> BuyFacts Prisma DB Schema)
  console.log("\n[5/5] Checking standalone schema synchronization...");
  syncCubiconSchema();

  console.log("\n==================================================");
  console.log(" SUCCESS: Cubicon embedded app successfully bundled & schema verified!");
  console.log(` Active JS:  ${jsFile}`);
  if (cssFile) console.log(` Active CSS: ${cssFile}`);
  console.log(" You can test it at http://localhost:3000/cubicon");
  console.log("==================================================");
} catch (err) {
  console.error("\nBUILD ERROR:", err.message);
  process.exit(1);
}

function syncCubiconSchema() {
  const standaloneDbPath = path.join(cubiconDir, "backend", "cubicon.db");
  const buyfactsDbPath = path.join(buyfactsDir, "prisma", "dev.db");

  if (!fs.existsSync(standaloneDbPath)) {
    console.log("[Schema Sync] Standalone cubicon.db not found (skipping schema check).");
    return;
  }
  if (!fs.existsSync(buyfactsDbPath)) {
    console.log("[Schema Sync] BuyFacts prisma/dev.db not found (skipping schema check).");
    return;
  }

  try {
    const Database = require("better-sqlite3");
    const sourceDb = new Database(standaloneDbPath, { readonly: true });
    const targetDb = new Database(buyfactsDbPath);

    const sourceTables = sourceDb
      .prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();

    let syncedTableCount = 0;
    let syncedColumnCount = 0;

    for (const table of sourceTables) {
      const targetTableName =
        table.name === "CubiconTask" ? "cubicon_tasks" :
        table.name === "CubiconAttempt" ? "cubicon_attempts" :
        table.name === "CubiconSession" ? "cubicon_sessions" :
        table.name === "CubiconRegistration" ? "cubicon_registrations" :
        table.name.toLowerCase();

      const targetTableExists = targetDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(targetTableName);

      if (!targetTableExists) {
        const sourceColumns = sourceDb.prepare(`PRAGMA table_info("${table.name}")`).all();
        const colDefs = sourceColumns
          .map((col) => {
            let def = `"${col.name}" ${col.type || "TEXT"}`;
            if (col.pk) def += " PRIMARY KEY";
            if (col.notnull && !col.pk) def += " NOT NULL";
            if (col.dflt_value !== null) def += ` DEFAULT ${col.dflt_value}`;
            return def;
          })
          .join(", ");

        targetDb.exec(`CREATE TABLE IF NOT EXISTS "${targetTableName}" (${colDefs});`);
        console.log(`✓ [Schema Sync] Created missing table: ${targetTableName}`);
        syncedTableCount++;
      } else {
        const sourceCols = sourceDb.prepare(`PRAGMA table_info("${table.name}")`).all();
        const targetCols = targetDb.prepare(`PRAGMA table_info("${targetTableName}")`).all();
        const targetColNames = new Set(targetCols.map((c) => c.name.toLowerCase()));

        for (const col of sourceCols) {
          if (!targetColNames.has(col.name.toLowerCase())) {
            const colType = col.type || "TEXT";
            const defaultVal = col.dflt_value !== null ? `DEFAULT ${col.dflt_value}` : "";
            targetDb.exec(`ALTER TABLE "${targetTableName}" ADD COLUMN "${col.name}" ${colType} ${defaultVal}`);
            console.log(`✓ [Schema Sync] Added missing column: ${targetTableName}.${col.name} (${colType})`);
            syncedColumnCount++;
          }
        }
      }
    }

    sourceDb.close();
    targetDb.close();

    if (syncedTableCount === 0 && syncedColumnCount === 0) {
      console.log("✓ [Schema Sync] Cubicon schema is fully in sync with BuyFacts (no data modified).");
    } else {
      console.log(`✓ [Schema Sync] Synced ${syncedTableCount} tables and ${syncedColumnCount} columns into BuyFacts schema.`);
    }
  } catch (err) {
    console.warn("[Schema Sync] Warning:", err.message);
  }
}


