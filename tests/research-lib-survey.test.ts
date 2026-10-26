import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SURVEYS, GET } from "../app/api/narrative-data/route";
import {
  VALID_COMBOS,
  VALID_QUESTION_TYPES,
  VALID_WIDGETS,
} from "../types/narrative-survey";
import { prisma } from "../lib/prisma";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

describe("ResearchLib AI Marketing Directional Measurement Survey", () => {
  it("should validate all approved Combo, QuestionType, and Widget enumerations", () => {
    assert.deepEqual(VALID_COMBOS, ["narWid", "tradWid", "narList", "tradList"]);
    assert.deepEqual(VALID_QUESTION_TYPES, [
      "scale",
      "multipleChoice",
      "checkbox",
      "rank",
      "singleChoice",
      "radio",
      "number",
      "text",
      "ring",
      "rate",
      "slider",
      "triad",
    ]);
    assert.deepEqual(VALID_WIDGETS, ["triad", "bar", "ring", "barrel"]);
  });

  it("should have exactly 6 sequential tasks under the survey", () => {
    assert.equal(DEFAULT_SURVEYS.length, 6);
  });

  it("should enforce top-level survey elements (timeCounter, pauseDuration, durationInMin, combo)", () => {
    for (const survey of DEFAULT_SURVEYS) {
      assert.equal(survey.combo, "narWid");
      assert.ok(VALID_COMBOS.includes(survey.combo as any));
      assert.equal(survey.timeCounter, "down");
      assert.equal(survey.pauseDuration, "3");
      assert.equal(survey.durationInMin, "30");
      assert.equal(survey.userId, "system_default");
    }
  });

  it("should enforce task-level elements (heading, instruction, widget, story/question, blanks)", () => {
    for (let i = 0; i < DEFAULT_SURVEYS.length; i++) {
      const task = DEFAULT_SURVEYS[i];
      assert.ok(task.heading.length > 0, `Task ${i} missing heading`);
      assert.ok(task.instruction.length > 0, `Task ${i} missing instruction`);
      assert.ok(VALID_WIDGETS.includes(task.widget as any), `Invalid widget on task ${i}`);
      assert.ok(task.story.length > 0, `Task ${i} missing story/question`);
      assert.ok(task.blanks.length > 0, `Task ${i} missing blanks`);
    }
  });

  it("should enforce isFollowup rule: true for preceding tasks and FALSE for the final task", () => {
    for (let i = 0; i < DEFAULT_SURVEYS.length; i++) {
      const task = DEFAULT_SURVEYS[i];
      const isFinalTask = i === DEFAULT_SURVEYS.length - 1;

      if (isFinalTask) {
        assert.equal(
          task.isFollowup,
          0,
          `Final task (index ${i}) must have isFollowup set to false (0), received ${task.isFollowup}`
        );
      } else {
        assert.equal(
          task.isFollowup,
          1,
          `Preceding task (index ${i}) must have isFollowup set to true (1), received ${task.isFollowup}`
        );
      }
    }
  });

  it("should match the blanks regex against each question story chunk", () => {
    const blankRegex = new RegExp("_{1,}[?]?[a-z]?_{1,}");

    for (let i = 0; i < DEFAULT_SURVEYS.length; i++) {
      const survey = DEFAULT_SURVEYS[i];
      assert.ok(
        blankRegex.test(survey.story),
        `Survey task index ${i} story chunk does not contain a valid blank marker matching regex: ${survey.story}`
      );
    }
  });

  it("should have the exact expected 3-choice answer keys for each blank", () => {
    const expectedKeys = [
      ["Marketing", "Sales", "Operations"],
      ["Slow", "Moderate", "Rapid"],
      [
        "Hidden Momentum (Internal Work and Programs)",
        "Visible Momentum (With Other Functions/Customers)",
        "Network Momentum (In the Market)",
      ],
      ["No Commitment", "Some Promise", "Strong Commitment"],
      ["Never Spoke", "Had Spoken", "Often Spoke"],
      ["The People", "The Way They Work", "Leadership"],
    ];

    const expectedBlankNames = ["a", "b", "c", "d", "e", "f"];

    for (let i = 0; i < DEFAULT_SURVEYS.length; i++) {
      const survey = DEFAULT_SURVEYS[i];
      const parsedBlanks = JSON.parse(survey.blanks);
      assert.equal(parsedBlanks.length, 1);

      const blank = parsedBlanks[0];
      assert.equal(blank.name, expectedBlankNames[i]);
      assert.ok(VALID_QUESTION_TYPES.includes(blank.questionType));

      const choices = blank.choiceList.map((c: any) => c.text);
      assert.deepEqual(choices, expectedKeys[i]);
    }
  });

  it("should verify standalone SQLite narrative.db contains all 6 tasks with final task isFollowup=0", () => {
    const standaloneDbPath = path.resolve(
      __dirname,
      "..",
      "..",
      "narrative",
      "backend",
      "narrative.db"
    );

    if (fs.existsSync(standaloneDbPath)) {
      const db = new Database(standaloneDbPath, { readonly: true });
      const rows = db.prepare("SELECT * FROM surveys WHERE user_id = 'system_default' ORDER BY id ASC").all() as any[];
      assert.equal(rows.length, 6);

      const firstTask = rows[0];
      assert.equal(firstTask.heading, "ORGANIZATIONAL FUNCTION");
      assert.equal(firstTask.isFollowup, 1);

      const finalTask = rows[5];
      assert.equal(finalTask.heading, "PRIMARY SUCCESS FACTOR");
      assert.equal(finalTask.isFollowup, 0); // follow up set to false

      db.close();
    }
  });

  it("should verify BuyFacts dev.db contains synchronized tasks with final task isFollowup=0", () => {
    const devDbPath = path.resolve(__dirname, "..", "prisma", "dev.db");

    if (fs.existsSync(devDbPath)) {
      const db = new Database(devDbPath, { readonly: true });
      const tasks = db.prepare("SELECT * FROM ResearchLibTask ORDER BY taskIndex ASC").all() as any[];
      assert.equal(tasks.length, 6);

      assert.equal(tasks[0].heading, "ORGANIZATIONAL FUNCTION");
      assert.equal(tasks[0].taskIndex, 0);
      assert.equal(tasks[0].isFollowup, 1);

      assert.equal(tasks[5].heading, "PRIMARY SUCCESS FACTOR");
      assert.equal(tasks[5].taskIndex, 5);
      assert.equal(tasks[5].isFollowup, 0);

      db.close();
    }
  });

  it("should verify standalone SQLite tasks table contains all 6 tasks with final task isFollowup=0", () => {
    const standaloneDbPath = path.resolve(
      __dirname,
      "..",
      "..",
      "narrative",
      "backend",
      "narrative.db"
    );

    if (fs.existsSync(standaloneDbPath)) {
      const db = new Database(standaloneDbPath, { readonly: true });
      const tasks = db.prepare("SELECT * FROM tasks ORDER BY taskIndex ASC").all() as any[];
      assert.equal(tasks.length, 6);

      assert.equal(tasks[0].taskIndex, 0);
      assert.equal(tasks[0].heading, "ORGANIZATIONAL FUNCTION");
      assert.equal(tasks[0].widget, "triad");
      assert.equal(tasks[0].isFollowup, 1);

      assert.equal(tasks[5].taskIndex, 5);
      assert.equal(tasks[5].heading, "PRIMARY SUCCESS FACTOR");
      assert.equal(tasks[5].widget, "triad");
      assert.equal(tasks[5].isFollowup, 0); // final task follow up false

      db.close();
    }
  });

  it("should verify Prisma PostgreSQL relational ResearchLibTask models and survey linkage", async () => {
    const survey = await prisma.researchLibSurvey.findFirst({
      where: { userId: "system_default" },
      include: { tasks: { orderBy: { taskIndex: "asc" } } },
    });

    assert.ok(survey, "ResearchLibSurvey must exist in PostgreSQL");
    assert.equal(survey.combo, "narWid");
    assert.equal(survey.timeCounter, "down");
    assert.equal(survey.pauseDuration, "3");
    assert.equal(survey.durationInMin, "30");

    assert.equal(survey.tasks.length, 6);
    assert.equal(survey.tasks[0].taskIndex, 0);
    assert.equal(survey.tasks[0].heading, "ORGANIZATIONAL FUNCTION");
    assert.equal(survey.tasks[0].isFollowup, 1);

    assert.equal(survey.tasks[5].taskIndex, 5);
    assert.equal(survey.tasks[5].heading, "PRIMARY SUCCESS FACTOR");
    assert.equal(survey.tasks[5].isFollowup, 0); // final task isFollowup is 0
  });

  it("should return hierarchical survey structure when view=survey is requested from API", async () => {
    const req = new NextRequest("http://localhost:3000/api/narrative-data?sid=test_user&view=survey");
    const res = await GET(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.survey);
    assert.equal(body.survey.combo, "narWid");
    assert.equal(body.survey.timeCounter, "down");
    assert.equal(body.survey.pauseDuration, "3");
    assert.equal(body.survey.durationInMin, "30");
    assert.equal(body.survey.tasks.length, 6);

    assert.equal(body.survey.tasks[0].isFollowup, true);
    assert.equal(body.survey.tasks[5].isFollowup, false); // final task isFollowup is false
  });
});
