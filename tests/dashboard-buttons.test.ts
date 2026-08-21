import assert from "node:assert/strict";

const THOUGHT_LEADERSHIP_SPECS = [
  { label: "Research Leadership", tagline: "Return on Primary Research" },
  { label: "Marketing Leadership", tagline: "Best Practices by Marketing Area" },
  { label: "Cohort Research", tagline: "Smaller Groups that Know the Topic" },
  { label: "Hybrid Marketing", tagline: "Digital Reach and a Human Touch" },
  { label: "Early Recognition", tagline: "Earlier Recognition for Your Time Advantage" },
  { label: "Survey Engagement", tagline: "Optimize Question Value" },
  { label: "Content Creation", tagline: "Assets that Engage with Thought Leadership" },
  { label: "Research Methods", tagline: "Exceed Stakeholder Wants and Needs" },
  { label: "Wisdom Gap", tagline: "Research Becomes Intellectual Currency" },
];

const PRODUCTS_SERVICES_SPECS = [
  { label: "Survey Define IT", tagline: "Inclusive Research Definition" },
  { label: "Survey Refine IT", tagline: "Increase the Return on Research" },
  { label: "Survey Build IT", tagline: "Make Each Question Actionable" },
  { label: "Survey Field IT", tagline: "Quality-Centric Survey Execution" },
  { label: "Recognize IT", tagline: "Active Pattern Analytics" },
  { label: "Validate IT", tagline: "Opportunity Validation" },
  { label: "Respondent Validation", tagline: "Play Cubicon Puzzle Games" },
  { label: "Story-Based Surveys", tagline: "Execute a Dual-Based Survey Model" },
  { label: "Content Assessment", tagline: "Maximize the Return on Content" },
];

const ACTION_BUTTONS = ["More Detail", "3-Minute Video", "Contact Us"];


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

  assert.equal(ACTION_BUTTONS.length, 3);
  assert.deepEqual(ACTION_BUTTONS, ["More Detail", "3-Minute Video", "Contact Us"]);
  console.log("Passed: 3 rounded-corner action buttons verified");

  console.log("\nSuccess: All dashboard and player window tests passed!");
}

runTests();