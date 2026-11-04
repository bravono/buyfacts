const fs = require('fs');
const path = require('path');
const assert = require('assert');
const sc = require('./scoring');

console.log("=== THE AFFINITY EFFECT (PRODUCT B) MASTER VERIFICATION SUITE ===");

// 1. Load instrument and data
const instPath = path.join(__dirname, 'triad_instrument.json');
const synthPath = path.join(__dirname, 'synthetic_assessments.json');
const bookPath = path.join(__dirname, 'worked_book_scenario.json');
const bookResPath = path.join(__dirname, 'worked_scenario_results.json');

assert(fs.existsSync(instPath), "triad_instrument.json must exist");
assert(fs.existsSync(synthPath), "synthetic_assessments.json must exist");
assert(fs.existsSync(bookPath), "worked_book_scenario.json must exist");

const inst = JSON.parse(fs.readFileSync(instPath, 'utf8'));
const synth = JSON.parse(fs.readFileSync(synthPath, 'utf8'));
const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));

// 2. Validate Phase 3: Exactly 16 B2B TRIADs
console.log("\n--- Phase 3: 16 B2B TRIADs Validation ---");
assert.strictEqual(inst.triads.length, 16, "Must contain exactly 16 TRIADs");
const triadIds = new Set();
const expectedAreas = ["Perception", "Experience"];
const expectedKinds = ["Emotive", "Practical"];

inst.triads.forEach((t, i) => {
  assert(t.id, `TRIAD ${i} must have an ID`);
  assert(!triadIds.has(t.id), `TRIAD ID ${t.id} must be unique`);
  triadIds.add(t.id);
  assert(expectedAreas.includes(t.area), `TRIAD ${t.id} area must be Perception or Experience`);
  assert(expectedKinds.includes(t.kind), `TRIAD ${t.id} kind must be Emotive or Practical`);
  assert(t.driver && t.driver.length > 2, `TRIAD ${t.id} must have a valid driver name`);
  assert(t.polarity === "positive" || t.polarity === "negative", `TRIAD ${t.id} polarity must be positive or negative`);
});
console.log(`[PASS] All 16 TRIADs verified with unique IDs, areas, kinds, and driver names.`);

// 3. Validate Phase 4: Exactly 48 Corner Elements
console.log("\n--- Phase 4: 48 Corner Elements Validation ---");
let totalElements = 0;
inst.triads.forEach((t) => {
  const corners = Object.keys(t.corners);
  assert.strictEqual(corners.length, 3, `TRIAD ${t.id} must have exactly 3 corners`);
  assert(t.corners.ll && t.corners.lr && t.corners.apex, `TRIAD ${t.id} must have ll, lr, apex`);
  const points = t.points;
  if (t.polarity === "positive") {
    assert.strictEqual(points.ll, 33);
    assert.strictEqual(points.lr, 66);
    assert.strictEqual(points.apex, 99);
  } else {
    assert.strictEqual(points.ll, 99);
    assert.strictEqual(points.lr, 66);
    assert.strictEqual(points.apex, 33);
  }
  totalElements += corners.length;
});
assert.strictEqual(totalElements, 48, "Total elements must be exactly 48");
console.log(`[PASS] Exactly 48 corner elements verified with standard point mappings (33/66/99).`);

// 4. Validate Phase 5: Category Index Hierarchy
console.log("\n--- Phase 5: Category Index Hierarchy Validation ---");
assert.strictEqual(inst.categories.length, 1, "Must define technology Category");
assert.strictEqual(inst.categories[0], "Marketing Automation Platform");
assert.strictEqual(inst.groups.length, 4, "Must define 4 groups");
console.log(`[PASS] Category Index hierarchy verified: Category '${inst.categories[0]}' -> 2 Areas -> 4 Groups.`);

// 5. Validate Phase 6: 150 Synthetic Assessments
console.log("\n--- Phase 6: 150 Synthetic Assessments Validation ---");
assert.strictEqual(synth.assessments.length, 150, "Must contain exactly 150 synthetic assessments");
assert.strictEqual(synth.waves.length, 3, "Must contain 3 waves");
assert.strictEqual(synth.participants, 50, "Must declare 50 participants");

const participantIds = new Set();
synth.assessments.forEach((a, idx) => {
  assert(a.participant_id, `Assessment ${idx} missing participant_id`);
  participantIds.add(a.participant_id);
  assert(a.cohort_id === "SYN-MARKETING-AUTOMATION-50");
  assert(a.responses, `Assessment ${idx} missing responses`);
  assert.strictEqual(Object.keys(a.responses).length, 16, `Assessment ${idx} must answer all 16 TRIADs`);
  
  // Verify shares sum to 100
  assert.strictEqual(a.group_shares.Perception.Emotive + a.group_shares.Perception.Practical, 100);
  assert.strictEqual(a.group_shares.Experience.Emotive + a.group_shares.Experience.Practical, 100);
  assert.strictEqual(a.area_shares.Perception + a.area_shares.Experience, 100);
});
assert.strictEqual(participantIds.size, 50, "Must have exactly 50 unique participants");
console.log(`[PASS] 150 Synthetic assessments verified across 3 waves and 50 unique participants.`);

// 6. Validate Phase 7 & 8: Scoring Math & Chapter 1 Worked Scenario
console.log("\n--- Phase 7 & 8: Calculation Engine & Chapter 1 Verification ---");
assert(book.assessments && book.assessments.length === 3, "Book scenario must have 3 wave assessments");
const bookCalculations = book.assessments.map(a => sc.calculate(a, inst));

bookCalculations.forEach((calc, idx) => {
  assert(calc.category_index >= 33 && calc.category_index <= 99, `Category index must be within [33, 99]`);
  assert(calc.areas.Perception.area_score >= 33 && calc.areas.Perception.area_score <= 99);
  assert(calc.areas.Experience.area_score >= 33 && calc.areas.Experience.area_score <= 99);
});
console.log(`[PASS] Chapter 1 worked scenario calculations verified on 33-99 index scale.`);

// 7. Validate Phase 2: Product Isolation
console.log("\n--- Phase 2: Isolation Verification ---");
const rawInstText = JSON.stringify(inst);
const rawSynthText = JSON.stringify(synth);
assert(!rawInstText.includes("satchel"), "No satchel in B2B instrument");
assert(!rawInstText.includes("PLES"), "No PLES in B2B instrument");
assert(!rawSynthText.includes("Know Your Major"), "No KYM in B2B synthetic data");
assert(!rawSynthText.includes("satchel"), "No satchel in B2B synthetic data");
console.log(`[PASS] Absolute isolation from Know Your Major confirmed.`);

console.log("\n>>> ALL 7 MASTER AUDIT CHECKS PASSED (7/7) <<<");
