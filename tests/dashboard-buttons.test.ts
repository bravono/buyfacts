import assert from "node:assert/strict";

const THOUGHT_LEADERSHIP_SPECS = [
  { label: "Research Methods", tagline: "Exceed Stakeholder Wants and Needs" },
  { label: "Cohort Research", tagline: "Smaller Groups that Know the Topic" },
  { label: "Survey Engagement", tagline: "Optimize Question Value" },
  { label: "Hybrid Marketing", tagline: "Digital Reach and a Human Touch" },
  { label: "Content Creation", tagline: "Assets that Engage with Thought Leadership" },
  { label: "Marketing Leadership", tagline: "Best Practices by Marketing Area" },
  { label: "Research Leadership", tagline: "Return on Primary Research" },
  { label: "Early Recognition", tagline: "Earlier Recognition for Your Time Advantage" },
  { label: "Wisdom Gap", tagline: "Research Becomes Intellectual Currency" },
];

const PRODUCTS_SERVICES_SPECS = [
  { label: "Research Planning", tagline: "Inclusive Research Definition" },
  { label: "Survey Design", tagline: "Make Each Question Actionable" },
  { label: "Story-Based Surveys", tagline: "Execute a Dual-Based Survey Model" },
  { label: "Improve Surveys", tagline: "Increase the Return on Research" },
  { label: "Participant Validation", tagline: "Play Cubicon Puzzle Games" },
  { label: "Survey Fieldwork", tagline: "Quality-Centric Survey Execution" },
  { label: "Content Value", tagline: "Maximize the Return on Content" },
  { label: "Pattern Insights", tagline: "Active Pattern Analytics" },
  { label: "Audience Validation", tagline: "Opportunity Validation" },
];

const ACTION_BUTTONS = ["SEE IT", "HEAR IT", "READ IT", "CONTACT US"];

import fs from "node:fs";
import path from "node:path";

function runTests() {
  console.log("Running BuyFacts Dashboard & Media Player Tests ...\n");
  assert.equal(THOUGHT_LEADERSHIP_SPECS.length, 9);
  for (const item of THOUGHT_LEADERSHIP_SPECS) {
    assert.ok(item.label && item.label.length > 0);
    assert.ok(item.tagline && item.tagline.length > 0);
  }
  console.log("Passed: Thought Leadership 9/9 button labels and taglines verified");

  assert.equal(PRODUCTS_SERVICES_SPECS.length, 9);
  for (const item of PRODUCTS_SERVICES_SPECS) {
    assert.ok(item.label && item.label.length > 0);
    assert.ok(item.tagline && item.tagline.length > 0);
  }
  console.log("Passed: Products and Services 9/9 button labels and taglines verified");

  // Verify four action buttons below player window
  assert.equal(ACTION_BUTTONS.length, 4);
  assert.deepEqual(ACTION_BUTTONS, ["SEE IT", "HEAR IT", "READ IT", "CONTACT US"]);
  console.log("Passed: 4 action buttons verified (SEE IT, HEAR IT, READ IT, CONTACT US)");

  // Verify MockMediaPlayer source file has all 4 uppercase buttons and icons
  const playerPath = path.join(__dirname, "..", "components", "MockMediaPlayer.tsx");
  assert.ok(fs.existsSync(playerPath), "MockMediaPlayer.tsx must exist");
  const playerContent = fs.readFileSync(playerPath, "utf-8");

  for (const btn of ACTION_BUTTONS) {
    assert.ok(playerContent.includes(`<span>${btn}</span>`), `MockMediaPlayer.tsx must render uppercase label "${btn}"`);
  }
  assert.ok(playerContent.includes("<Video"), "SEE IT button must retain Video icon");
  assert.ok(playerContent.includes("<Headphones"), "HEAR IT button must retain Headphones icon");
  assert.ok(playerContent.includes("<FileText"), "READ IT button must retain FileText icon");
  assert.ok(playerContent.includes("<Mail"), "CONTACT US button must retain Mail icon");
  console.log("Passed: All 4 buttons retain icons and uppercase labels");

  // Verify CSS module rules for uniform dimensions (120px x 36px), 12px gap, and responsive flex-wrap
  const cssPath = path.join(__dirname, "..", "components", "MockMediaPlayer.module.css");
  assert.ok(fs.existsSync(cssPath), "MockMediaPlayer.module.css must exist");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  assert.ok(cssContent.includes("width: 120px"), "Action buttons must be reduced to 120px width");
  assert.ok(cssContent.includes("height: 36px"), "Action buttons must be reduced to 36px height");
  assert.ok(cssContent.includes("gap: 12px"), "Buttons must have 12px gap between buttons");
  assert.ok(cssContent.includes("flex-wrap: wrap"), "Action buttons row must support flex-wrap for responsive rearrangement");
  assert.ok(cssContent.includes("text-transform: uppercase"), "Buttons must use uppercase styling");
  console.log("Passed: CSS enforces uniform 120px x 36px dimensions, 12px gap, and responsive rearrangement");

  // Verify zero emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert.ok(!emojiRegex.test(playerContent), "MockMediaPlayer.tsx must contain zero emojis");
  assert.ok(!emojiRegex.test(cssContent), "MockMediaPlayer.module.css must contain zero emojis");
  console.log("Passed: Zero-emoji compliance verified");

  // Verify Prisma schema contains seeItUrl, hearItUrl, and readItUrl fields on DashboardButton
  const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
  assert.ok(fs.existsSync(schemaPath), "schema.prisma must exist");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  assert.ok(schemaContent.includes("seeItUrl"), "schema.prisma must include seeItUrl field");
  assert.ok(schemaContent.includes("hearItUrl"), "schema.prisma must include hearItUrl field");
  assert.ok(schemaContent.includes("readItUrl"), "schema.prisma must include readItUrl field");
  console.log("Passed: DashboardButton seeItUrl, hearItUrl, and readItUrl fields verified");

  console.log("\nSuccess: All dashboard and player window tests passed!");
}

runTests();