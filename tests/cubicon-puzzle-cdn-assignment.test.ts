import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GET, VERIFIED_CDN_PUZZLE_IMAGES, formatFriendlyPuzzleName } from "@/app/api/cubicon/puzzle-images/route";

test("Cubicon CDN Puzzle Image Assignment Test Suite", async (t) => {
  await t.test("1. Name Formatting Helper", () => {
    assert.equal(
      formatFriendlyPuzzleName("cubicon/Puzzle/1792082419103-hp8641-Alice_In_Wonderland_Colored.webp"),
      "Alice In Wonderland Colored"
    );
    assert.equal(
      formatFriendlyPuzzleName("WOW_Grand_Central_Station_Color_No_Text.webp"),
      "Grand Central Station Color No Text"
    );
    assert.equal(
      formatFriendlyPuzzleName("WOW_Lost_City_of_Atlantis_Color-2.png"),
      "Lost City of Atlantis Color 2"
    );
  });

  await t.test("2. Verified Baseline CDN Catalog Integrity", () => {
    assert.ok(VERIFIED_CDN_PUZZLE_IMAGES.length >= 10, "Must provide baseline CDN puzzle images");
    for (const item of VERIFIED_CDN_PUZZLE_IMAGES) {
      assert.ok(item.publicUrl.startsWith("https://s3.buyfacts.com/"), "Must point to s3.buyfacts.com CDN");
      assert.ok(item.name.length > 0, "Must provide human-readable title");
      assert.ok(["webp", "png"].includes(item.format), "Must have valid format");
      assert.ok(typeof item.size === "number" && item.size > 0, "Must have positive size");
    }
  });

  await t.test("3. Puzzle Images API: GET /api/cubicon/puzzle-images (Happy Path)", async () => {
    const req = new Request("http://localhost/api/cubicon/puzzle-images");
    const res = await GET(req as any);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.images));
    assert.ok(body.images.length >= 10);

    // Verify first item structure
    const first = body.images[0];
    assert.ok(first.publicUrl);
    assert.ok(first.name);
    assert.ok(first.format);
  });

  await t.test("4. Puzzle Images API: Search Filtering (?q=alice)", async () => {
    const req = new Request("http://localhost/api/cubicon/puzzle-images?q=alice");
    const res = await GET(req as any);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.images.length > 0);
    for (const item of body.images) {
      const match =
        item.name.toLowerCase().includes("alice") ||
        item.fileName.toLowerCase().includes("alice") ||
        item.objectKey.toLowerCase().includes("alice");
      assert.ok(match, "Each search result must match search query");
    }
  });

  await t.test("5. Puzzle Images API: Format Filtering (?format=webp)", async () => {
    const req = new Request("http://localhost/api/cubicon/puzzle-images?format=webp");
    const res = await GET(req as any);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.images.length > 0);
    for (const item of body.images) {
      assert.equal(item.format, "webp");
    }
  });

  await t.test("6. CubiconCoordinatePicker: CDN Thumbnail Strip and Side-Scrolling Architecture", async () => {
    const pickerCode = await fs.readFile("components/CubiconCoordinatePicker.tsx", "utf-8");
    const pickerCss = await fs.readFile("components/CubiconCoordinatePicker.module.css", "utf-8");

    // Component must fetch /api/cubicon/puzzle-images
    assert.match(pickerCode, /\/api\/cubicon\/puzzle-images/);

    // Must handle assigning image to active face
    assert.match(pickerCode, /handleAssignImage/);
    assert.match(pickerCode, /setImage\(item\.publicUrl\)/);

    // Must provide side-scrolling track and controls
    assert.match(pickerCode, /scrollTrackRef/);
    assert.match(pickerCode, /handleScrollLeft/);
    assert.match(pickerCode, /handleScrollRight/);

    // CoordinatePickerApplyResult must support image and screen
    assert.match(pickerCode, /image\?:\s*string/);
    assert.match(pickerCode, /screen\?:\s*string/);

    // CSS must define side-scrolling track, cards, and scroll buttons
    assert.match(pickerCss, /\.cdnGalleryCard\s*\{/);
    assert.match(pickerCss, /\.scrollTrack\s*\{[\s\S]*?overflow-x:\s*auto/);
    assert.match(pickerCss, /\.thumbnailCard\s*\{/);
    assert.match(pickerCss, /\.thumbnailCardSelected\s*\{/);
    assert.match(pickerCss, /\.scrollArrowBtn\s*\{/);
  });

  await t.test("7. Admin Dashboard: Form and Apply Handler Integration", async () => {
    const adminCode = await fs.readFile("app/admin/page.tsx", "utf-8");

    // onApply handler must apply result.image and result.screen
    assert.match(adminCode, /result\.image \? \{ image: result\.image \}/);
    assert.match(adminCode, /result\.screen \? \{ screen: result\.screen \}/);

    // Form must offer direct button to assign CDN puzzle image
    assert.match(adminCode, /Assign CDN Puzzle Image & Pick Coordinates/);
  });

  await t.test("8. Cubicon Analytics: Sequence Task Assignment Integration", async () => {
    const analyticsCode = await fs.readFile("app/cubicon/analytics/page.tsx", "utf-8");

    // handlePickerApply must update image and screen on tasks
    assert.match(analyticsCode, /result\.image \? \{ image: result\.image \}/);
    assert.match(analyticsCode, /result\.screen \? \{ screen: result\.screen \}/);
  });
});
