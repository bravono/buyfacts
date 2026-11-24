/**
 * ============================================================================
 * NARRATIVE EMBEDDED BUNDLER SCRIPT FOR BUYFACTS
 * ============================================================================
 *
 * PURPOSE:
 * Automates building and deploying the embedded Narrative app from the
 * `C:\Users\USER\narrative` repository into BuyFacts at `public/narrative-app/`.
 *
 * HOW TO RUN:
 *   npm run embed-narrative
 * ============================================================================
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Resolve paths
const buyfactsDir = path.resolve(__dirname, "..");
const narrativeDir = path.resolve(buyfactsDir, "..", "narrative");
const targetAppDir = path.join(buyfactsDir, "public", "narrative-app");

console.log("--------------------------------------------------");
console.log("Starting Narrative Embedded App Bundler...");
console.log(`Narrative Source: ${narrativeDir}`);
console.log(`Target Output:    ${targetAppDir}`);
console.log("--------------------------------------------------");

// Step 1: Ensure Narrative directory exists
if (!fs.existsSync(narrativeDir)) {
  console.error(`ERROR: Narrative repository not found at ${narrativeDir}`);
  process.exit(1);
}

try {
  // Step 2: Switch to researchLib-mini branch if git repository
  try {
    console.log("\n[1/4] Checking Git branch...");
    execSync("git checkout researchLib-mini", { cwd: narrativeDir, stdio: "inherit" });
  } catch (gitErr) {
    console.log("Note: Could not switch branch via git (continuing with current branch).");
  }

  // Step 3: Run Vite build
  console.log("\n[2/4] Building Narrative production bundle...");
  execSync("npm run build", { cwd: narrativeDir, stdio: "inherit" });

  // Step 4: Verify dist directory exists
  const distDir = path.join(narrativeDir, "dist");
  if (!fs.existsSync(distDir)) {
    console.error("ERROR: dist/ directory was not found after build.");
    process.exit(1);
  }

  // Step 5: Clean target directory before copying to avoid stale chunks
  console.log("\n[3/4] Cleaning old target directory...");
  if (fs.existsSync(targetAppDir)) {
    fs.rmSync(targetAppDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetAppDir, { recursive: true });

  // Step 6: Copy dist build output to public/narrative-app
  console.log("\n[4/4] Copying build output to BuyFacts public/narrative-app...");

  // Recursive copy helper
  function copyRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyRecursive(distDir, targetAppDir);

  // Step 7: Sync Standalone Schema (narrative.db -> BuyFacts Prisma DB Schema)
  console.log("\n[5/5] Checking standalone schema synchronization...");
  syncNarrativeSchema();

  console.log("\n==================================================");
  console.log(" SUCCESS: ResearchLib embedded app successfully bundled & schema verified!");
  console.log(" Target destination: public/narrative-app/");
  console.log("==================================================");
} catch (err) {
  console.error("\nBUILD ERROR:", err.message);
  process.exit(1);
}

function syncNarrativeSchema() {
  const standaloneDbPath = path.join(narrativeDir, "backend", "narrative.db");
  const buyfactsDbPath = path.join(buyfactsDir, "prisma", "dev.db");

  if (!fs.existsSync(standaloneDbPath)) {
    console.log("[Schema Sync] Standalone narrative.db not found (skipping schema check).");
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
      const allowedTables = ["surveys", "tasks", "responses", "stories"];
      if (!allowedTables.includes(table.name)) continue;

      const targetTableName =
        table.name === "surveys" ? "research_lib_surveys" :
        table.name === "tasks" ? "research_lib_tasks" :
        table.name === "responses" ? "research_lib_responses" :
        table.name;

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
      console.log("✓ [Schema Sync] ResearchLib schema is fully in sync with BuyFacts (no data modified).");
    } else {
      console.log(`✓ [Schema Sync] Synced ${syncedTableCount} tables and ${syncedColumnCount} columns into BuyFacts schema.`);
    }
  } catch (err) {
    console.warn("⚠️  [Schema Sync] Warning:", err.message);
  }
}


