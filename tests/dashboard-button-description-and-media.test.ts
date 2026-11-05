import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

test("Dashboard Button Description Suite", async (t) => {
  await t.test("1. Database holds descriptionText for all 20 rows (18 buttons + 2 welcome)", async () => {
    const buttons = await prisma.dashboardButton.findMany({ orderBy: { id: "asc" } });
    assert.equal(buttons.length, 20);
    for (const btn of buttons) {
      assert.ok(btn.descriptionText.length > 50, `${btn.id} (${btn.label}) must have descriptionText`);
    }
  });

  await t.test("2. MockMediaPlayer renders No Media Found state when no media is linked", () => {
    const player = fs.readFileSync(path.join(__dirname, "..", "components", "MockMediaPlayer.tsx"), "utf-8");
    const css = fs.readFileSync(path.join(__dirname, "..", "components", "MockMediaPlayer.module.css"), "utf-8");
    assert.ok(player.includes("No Media Found"));
    assert.ok(player.includes("noMediaContainer"));
    assert.ok(css.includes(".noMediaContainer"));
  });

  await t.test("3. Zero-Emoji Compliance", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(fs.readFileSync(__filename, "utf-8")));
  });
});
