import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { prisma } from "../lib/prisma";

test("Database Seed Replacement and Deduplication Test Suite", async (t) => {
  await t.test("1. Seed execution replaces existing data and eliminates duplicates", async () => {
    // Intentionally inject extraneous duplicate button records with random UUIDs
    await prisma.dashboardButton.create({
      data: {
        label: "Content Assessment",
        mediaUrl: "https://example.com/test1",
        mediaType: "video",
        subtitle: "Duplicate item test 1",
        category: "Products & Services",
      },
    });

    await prisma.dashboardButton.create({
      data: {
        label: "Survey Define IT",
        mediaUrl: "https://example.com/test2",
        mediaType: "video",
        subtitle: "Duplicate item test 2",
        category: "Products & Services",
      },
    });

    // Verify database currently has more than 18 buttons
    const countBefore = await prisma.dashboardButton.count();
    assert.ok(countBefore > 18, `Expected count before seed to exceed 18, got ${countBefore}`);

    // Run the seed script to replace the database
    execSync("npm run seed", { stdio: "pipe" });

    // Verify database buttons are cleaned and exactly 18 exist
    const countAfter = await prisma.dashboardButton.count();
    assert.equal(countAfter, 18, "DashboardButton count should be exactly 18 after seeding");

    // Verify 9 Products & Services and 9 Research Imperatives
    const services = await prisma.dashboardButton.findMany({
      where: { category: "Products & Services" },
      orderBy: { id: "asc" },
    });
    const tl = await prisma.dashboardButton.findMany({
      where: { category: "Research Imperatives" },
      orderBy: { id: "asc" },
    });

    assert.equal(services.length, 9, "Expected exactly 9 Products & Services buttons");
    assert.equal(tl.length, 9, "Expected exactly 9 Research Imperatives buttons");

    // Verify zero duplicate labels in Products & Services
    const serviceLabels = services.map((b) => b.label);
    const uniqueServiceLabels = new Set(serviceLabels);
    assert.equal(
      uniqueServiceLabels.size,
      serviceLabels.length,
      "Every Products & Services button must have a unique label without duplicates"
    );

    // Verify zero duplicate labels in Research Imperatives
    const tlLabels = tl.map((b) => b.label);
    const uniqueTlLabels = new Set(tlLabels);
    assert.equal(
      uniqueTlLabels.size,
      tlLabels.length,
      "Every Research Imperatives button must have a unique label without duplicates"
    );
  });

  await t.test("2. Seed idempotency: running seed multiple times never creates duplicates", async () => {
    // Run seed twice consecutively
    execSync("npm run seed", { stdio: "pipe" });
    execSync("npm run seed", { stdio: "pipe" });

    const totalButtons = await prisma.dashboardButton.count();
    assert.equal(totalButtons, 18, "Repeated seeding must retain exactly 18 buttons");

    const totalTasks = await prisma.cubiconTask.count();
    assert.equal(totalTasks, 6, "Repeated seeding must retain exactly 6 cubicon tasks (3 per sequence)");

    const totalSequences = await prisma.cubiconSequence.count();
    assert.equal(totalSequences, 2, "Repeated seeding must retain exactly 2 cubicon sequences");

    const totalAssets = await prisma.mediaAsset.count();
    assert.equal(totalAssets, 3, "Repeated seeding must retain exactly 3 media assets");

    const totalUsers = await prisma.user.count();
    assert.equal(totalUsers, 2, "Repeated seeding must retain exactly 2 admin users");
  });

  await t.test("3. Button slot IDs and canonical sequence are preserved", async () => {
    const services = await prisma.dashboardButton.findMany({
      where: { category: "Products & Services" },
      orderBy: { id: "asc" },
    });

    const expectedServiceLabels = [
      "Survey Define IT",
      "Survey Refine IT",
      "Survey Build IT",
      "Survey Field IT",
      "Recognize IT",
      "Validate IT",
      "Respondent Validation",
      "Story-Based Surveys",
      "Content Assessment",
    ];

    for (let i = 0; i < expectedServiceLabels.length; i++) {
      const expectedId = `btn-srv-${String(i + 1).padStart(3, "0")}`;
      assert.equal(services[i].id, expectedId, `Button at index ${i} must have id ${expectedId}`);
      assert.equal(
        services[i].label,
        expectedServiceLabels[i],
        `Button at index ${i} must have label ${expectedServiceLabels[i]}`
      );
    }
  });

  await t.test("4. Cubicon tasks are correctly linked to sequences without orphan records", async () => {
    const defaultSeq = await prisma.cubiconSequence.findUnique({
      where: { slug: "default" },
      include: { tasks: true },
    });
    const contactSeq = await prisma.cubiconSequence.findUnique({
      where: { slug: "contact_form" },
      include: { tasks: true },
    });

    assert.ok(defaultSeq, "default sequence must exist");
    assert.equal(defaultSeq.tasks.length, 3, "default sequence must have exactly 3 tasks");

    assert.ok(contactSeq, "contact_form sequence must exist");
    assert.equal(contactSeq.tasks.length, 3, "contact_form sequence must have exactly 3 tasks");
  });
});
