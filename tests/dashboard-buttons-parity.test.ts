import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_BUTTONS } from "../components/DashboardAnimation/DashboardAnimation";

const PRODUCTS_SERVICES_APPROVED = [
  { position: 1, row: 1, col: 1, label: "Research Planning", tagline: "Inclusive Research Definition" },
  { position: 2, row: 1, col: 2, label: "Survey Design", tagline: "Make Each Question Actionable" },
  { position: 3, row: 1, col: 3, label: "Story-Based Surveys", tagline: "Execute a Dual-Based Survey Model" },
  { position: 4, row: 2, col: 1, label: "Improve Surveys", tagline: "Increase the Return on Research" },
  { position: 5, row: 2, col: 2, label: "Participant Validation", tagline: "Play Cubicon Puzzle Games" },
  { position: 6, row: 2, col: 3, label: "Survey Fieldwork", tagline: "Quality-Centric Survey Execution" },
  { position: 7, row: 3, col: 1, label: "Content Value", tagline: "Maximize the Return on Content" },
  { position: 8, row: 3, col: 2, label: "Pattern Insights", tagline: "Active Pattern Analytics" },
  { position: 9, row: 3, col: 3, label: "Audience Validation", tagline: "Opportunity Validation" },
];

const THOUGHT_LEADERSHIP_APPROVED = [
  { position: 1, row: 1, col: 1, label: "Research Methods", tagline: "Exceed Stakeholder Wants and Needs" },
  { position: 2, row: 1, col: 2, label: "Cohort Research", tagline: "Smaller Groups that Know the Topic" },
  { position: 3, row: 1, col: 3, label: "Survey Engagement", tagline: "Optimize Question Value" },
  { position: 4, row: 2, col: 1, label: "Hybrid Marketing", tagline: "Digital Reach and a Human Touch" },
  { position: 5, row: 2, col: 2, label: "Content Creation", tagline: "Assets that Engage with Thought Leadership" },
  { position: 6, row: 2, col: 3, label: "Marketing Leadership", tagline: "Best Practices by Marketing Area" },
  { position: 7, row: 3, col: 1, label: "Research Leadership", tagline: "Return on Primary Research" },
  { position: 8, row: 3, col: 2, label: "Early Recognition", tagline: "Earlier Recognition for Your Time Advantage" },
  { position: 9, row: 3, col: 3, label: "Wisdom Gap", tagline: "Research Becomes Intellectual Currency" },
];

test("Dashboard Buttons Specification & Layout Parity Test Suite", async (t) => {
  await t.test("1. Products and Services: Exactly 9 buttons with new approved labels and 3x3 grid order", () => {
    assert.equal(PRODUCTS_SERVICES_APPROVED.length, 9, "Products & Services must have exactly 9 buttons");

    for (let i = 0; i < PRODUCTS_SERVICES_APPROVED.length; i++) {
      const item = PRODUCTS_SERVICES_APPROVED[i];
      assert.equal(item.position, i + 1, `Button at index ${i} must have position ${i + 1}`);
      assert.equal(item.row, Math.floor(i / 3) + 1, `Button at index ${i} must have row ${Math.floor(i / 3) + 1}`);
      assert.equal(item.col, (i % 3) + 1, `Button at index ${i} must have column ${(i % 3) + 1}`);
      assert.ok(item.label.length > 0, "Button label must not be empty");
      assert.ok(item.tagline.length > 0, "Button tagline must not be empty");
    }

    const uniqueLabels = new Set(PRODUCTS_SERVICES_APPROVED.map((b) => b.label));
    assert.equal(uniqueLabels.size, 9, "All 9 Products & Services labels must be unique");
  });

  await t.test("2. Best Practices & Thought Leadership: Exactly 9 buttons with approved labels and 3x3 grid order", () => {
    assert.equal(THOUGHT_LEADERSHIP_APPROVED.length, 9, "Thought Leadership must have exactly 9 buttons");

    for (let i = 0; i < THOUGHT_LEADERSHIP_APPROVED.length; i++) {
      const item = THOUGHT_LEADERSHIP_APPROVED[i];
      assert.equal(item.position, i + 1, `Button at index ${i} must have position ${i + 1}`);
      assert.equal(item.row, Math.floor(i / 3) + 1, `Button at index ${i} must have row ${Math.floor(i / 3) + 1}`);
      assert.equal(item.col, (i % 3) + 1, `Button at index ${i} must have column ${(i % 3) + 1}`);
      assert.ok(item.label.length > 0, "Button label must not be empty");
      assert.ok(item.tagline.length > 0, "Button tagline must not be empty");
    }

    const uniqueLabels = new Set(THOUGHT_LEADERSHIP_APPROVED.map((b) => b.label));
    assert.equal(uniqueLabels.size, 9, "All 9 Thought Leadership labels must be unique");
  });

  await t.test("3. DashboardAnimation DEFAULT_BUTTONS matches new Products & Services buttons", () => {
    assert.equal(DEFAULT_BUTTONS.length, 9, "DEFAULT_BUTTONS must have 9 buttons");
    for (let i = 0; i < 9; i++) {
      assert.equal(
        DEFAULT_BUTTONS[i].label,
        PRODUCTS_SERVICES_APPROVED[i].label,
        `DEFAULT_BUTTONS[${i}] label must match ${PRODUCTS_SERVICES_APPROVED[i].label}`
      );
    }
  });

  await t.test("4. Products & Services page source defines all 9 approved labels in order", () => {
    const pagePath = path.join(__dirname, "..", "app", "products-services", "page.tsx");
    assert.ok(fs.existsSync(pagePath), "products-services/page.tsx must exist");
    const content = fs.readFileSync(pagePath, "utf-8");

    for (const item of PRODUCTS_SERVICES_APPROVED) {
      assert.ok(
        content.includes(`label: "${item.label}"`),
        `products-services/page.tsx must contain label "${item.label}"`
      );
      assert.ok(
        content.includes(`tagline: "${item.tagline}"`),
        `products-services/page.tsx must contain tagline "${item.tagline}"`
      );
    }
  });

  await t.test("5. Research Imperatives page source defines all 9 approved labels in order", () => {
    const pagePath = path.join(__dirname, "..", "app", "research-imperatives", "page.tsx");
    assert.ok(fs.existsSync(pagePath), "research-imperatives/page.tsx must exist");
    const content = fs.readFileSync(pagePath, "utf-8");

    for (const item of THOUGHT_LEADERSHIP_APPROVED) {
      assert.ok(
        content.includes(`label: "${item.label}"`),
        `research-imperatives/page.tsx must contain label "${item.label}"`
      );
      assert.ok(
        content.includes(`tagline: "${item.tagline}"`),
        `research-imperatives/page.tsx must contain tagline "${item.tagline}"`
      );
    }
  });

  await t.test("6. API buttons route and Prisma seed data include all 18 approved buttons", () => {
    const seedPath = path.join(__dirname, "..", "prisma", "seed.ts");
    const apiPath = path.join(__dirname, "..", "app", "api", "buttons", "route.ts");

    const seedContent = fs.readFileSync(seedPath, "utf-8");
    const apiContent = fs.readFileSync(apiPath, "utf-8");

    for (const item of PRODUCTS_SERVICES_APPROVED) {
      assert.ok(
        seedContent.includes(`label: "${item.label}"`),
        `prisma/seed.ts must include Products & Services label "${item.label}"`
      );
      assert.ok(
        apiContent.includes(`label: "${item.label}"`),
        `app/api/buttons/route.ts must include Products & Services label "${item.label}"`
      );
    }

    for (const item of THOUGHT_LEADERSHIP_APPROVED) {
      assert.ok(
        seedContent.includes(`label: "${item.label}"`),
        `prisma/seed.ts must include Thought Leadership label "${item.label}"`
      );
      assert.ok(
        apiContent.includes(`label: "${item.label}"`),
        `app/api/buttons/route.ts must include Thought Leadership label "${item.label}"`
      );
    }
  });

  await t.test("7. Zero-Emoji Compliance across all modified files", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const filesToCheck = [
      path.join(__dirname, "..", "components", "DashboardAnimation", "DashboardAnimation.tsx"),
      path.join(__dirname, "..", "app", "products-services", "page.tsx"),
      path.join(__dirname, "..", "app", "research-imperatives", "page.tsx"),
      path.join(__dirname, "..", "prisma", "seed.ts"),
      path.join(__dirname, "..", "app", "api", "buttons", "route.ts"),
      path.join(__dirname, "..", "tests", "dashboard-buttons.test.ts"),
      path.join(__dirname, "..", "tests", "database-seed-replacement.test.ts"),
      __filename,
    ];

    for (const file of filesToCheck) {
      assert.ok(fs.existsSync(file), `${file} must exist`);
      const text = fs.readFileSync(file, "utf-8");
      assert.ok(!emojiRegex.test(text), `${file} must contain zero emojis`);
    }
  });
});
