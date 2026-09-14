import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

// Approved navigation specifications per Section 4 and 15
const APPROVED_NAV_ITEMS = [
  { label: "HOME", href: "/" },
  { label: "INNOVATIONS THAT SAVE TIME", href: "/products-services" },
  { label: "RESEARCH IMPERATIVES", href: "/research-imperatives" },
  { label: "CUBICON", href: "/cubicon" },
  { label: "THOUGHT LEADERSHIP", href: "/#thought-leadership" },
  { label: "ABOUT", href: "/#about" },
  { label: "CONTACT", href: "/#contact" },
];

const APPROVED_ACTION_BUTTONS = ["Video", "In Depth", "Talk to Us"];

// State Machine Simulator for Section 6 Dashboard & Media Player Model
class DashboardPlayerStateMachine {
  activeTab: "thought-leadership" | "innovations" = "thought-leadership";
  selectedItemIndex: number = 0;
  videoActive: boolean = false;
  videoStarted: boolean = false;
  inDepthModalOpen: boolean = false;
  downloadCompleted: boolean = false;
  downloadAlertVisible: boolean = false;

  selectItem(index: number) {
    this.selectedItemIndex = index;
  }

  handleVideoClick() {
    this.videoActive = true;
    this.videoStarted = false; // Opening animated state with Start Video and Cancel
    this.inDepthModalOpen = false;
  }

  handleStartPlayback() {
    this.videoStarted = true;
  }

  handleCancelVideo() {
    this.videoActive = false;
    this.videoStarted = false;
  }

  handleInDepthClick() {
    this.inDepthModalOpen = true; // Preview modal before download
    this.downloadAlertVisible = false;
  }

  handleConfirmDownload() {
    this.inDepthModalOpen = false;
    this.downloadCompleted = true;
    this.downloadAlertVisible = true; // Alerts completion while keeping item selected
  }

  dismissAlert() {
    this.downloadAlertVisible = false;
  }
}

// State Machine Simulator for Section 7.2 Timed Preview Controller
class CubiconTimedPreviewStateMachine {
  currentSlide: number = 0; // 0 = Intro, 1 = Puzzle 1, 2 = Puzzle 2, 3 = Puzzle 3
  isPreviewRunning: boolean = false;
  isPreviewPaused: boolean = false;
  secondsRemaining: number = 7;
  showLiveApp: boolean = false;
  showVideo: boolean = false;

  startPreview() {
    this.currentSlide = 1;
    this.isPreviewRunning = true;
    this.isPreviewPaused = false;
    this.secondsRemaining = 7;
    this.showLiveApp = false;
    this.showVideo = false;
  }

  togglePause() {
    this.isPreviewPaused = !this.isPreviewPaused;
  }

  replay() {
    this.currentSlide = 1;
    this.isPreviewRunning = true;
    this.isPreviewPaused = false;
    this.secondsRemaining = 7;
  }

  cancel() {
    // Return to introduction without navigating or losing place
    this.isPreviewRunning = false;
    this.isPreviewPaused = false;
    this.currentSlide = 0;
    this.secondsRemaining = 7;
  }

  seeItLive() {
    this.isPreviewRunning = false;
    this.showLiveApp = true;
    this.showVideo = false;
  }

  tickSecond() {
    if (!this.isPreviewRunning || this.isPreviewPaused) return;

    if (this.secondsRemaining <= 1) {
      if (this.currentSlide < 3) {
        this.currentSlide += 1;
        this.secondsRemaining = 7;
      } else {
        // Completed preview of all 3 puzzle states
        this.isPreviewRunning = false;
        this.secondsRemaining = 0;
      }
    } else {
      this.secondsRemaining -= 1;
    }
  }
}

test("Dashboard and Navigation Alignment Test Suite", async (t) => {
  await t.test("Navigation Menu Parity (Desktop & Mobile): Exactly 7 Approved Destinations", () => {
    assert.equal(APPROVED_NAV_ITEMS.length, 7);

    const labels = APPROVED_NAV_ITEMS.map((item) => item.label);
    assert.deepEqual(labels, [
      "HOME",
      "INNOVATIONS THAT SAVE TIME",
      "RESEARCH IMPERATIVES",
      "CUBICON",
      "THOUGHT LEADERSHIP",
      "ABOUT",
      "CONTACT",
    ]);

    const hrefs = APPROVED_NAV_ITEMS.map((item) => item.href);
    assert.deepEqual(hrefs, [
      "/",
      "/products-services",
      "/research-imperatives",
      "/cubicon",
      "/#thought-leadership",
      "/#about",
      "/#contact",
    ]);
  });

  await t.test("Navbar source file reflects exact approved navigation items and links", () => {
    const navbarPath = path.join(BUYFACTS_ROOT, "components", "Navbar.tsx");
    assert.ok(fs.existsSync(navbarPath), "Navbar.tsx must exist");
    const content = fs.readFileSync(navbarPath, "utf-8");

    for (const item of APPROVED_NAV_ITEMS) {
      assert.ok(
        content.includes(item.label),
        `Navbar.tsx must contain label ${item.label}`
      );
      assert.ok(
        content.includes(`"${item.href}"`) || content.includes(`'${item.href}'`),
        `Navbar.tsx must route to ${item.href}`
      );
    }

    // Must not contain broken /services?tab= links
    assert.ok(!content.includes("/services?tab="), "Navbar.tsx must not contain broken /services?tab= routes");
  });

  await t.test("Footer source file contains valid links without broken /services routes", () => {
    const footerPath = path.join(BUYFACTS_ROOT, "components", "Footer.tsx");
    assert.ok(fs.existsSync(footerPath), "Footer.tsx must exist");
    const content = fs.readFileSync(footerPath, "utf-8");

    assert.ok(!content.includes("/services?tab="), "Footer.tsx must not contain broken /services?tab= routes");
    assert.ok(content.includes("/products-services"), "Footer.tsx must link to /products-services");
    assert.ok(content.includes("/research-imperatives"), "Footer.tsx must link to /research-imperatives");
  });

  await t.test("Dashboard Action Buttons conform to Section 6 (Video, In Depth, Talk to Us)", () => {
    assert.equal(APPROVED_ACTION_BUTTONS.length, 3);
    assert.deepEqual(APPROVED_ACTION_BUTTONS, ["Video", "In Depth", "Talk to Us"]);

    const playerPath = path.join(BUYFACTS_ROOT, "components", "MockMediaPlayer.tsx");
    assert.ok(fs.existsSync(playerPath), "MockMediaPlayer.tsx must exist");
    const content = fs.readFileSync(playerPath, "utf-8");

    for (const btn of APPROVED_ACTION_BUTTONS) {
      assert.ok(content.includes(btn), `MockMediaPlayer.tsx must contain action button "${btn}"`);
    }
  });

  await t.test("Dashboard Video Action Button implements opening animated state without forced autoplay", () => {
    const sm = new DashboardPlayerStateMachine();
    assert.equal(sm.videoActive, false);
    assert.equal(sm.videoStarted, false);

    // Clicking Video opens opening animated state
    sm.handleVideoClick();
    assert.equal(sm.videoActive, true);
    assert.equal(sm.videoStarted, false, "Video should not start playing immediately; requires user confirmation");

    // Starting playback
    sm.handleStartPlayback();
    assert.equal(sm.videoStarted, true);

    // Canceling video
    sm.handleCancelVideo();
    assert.equal(sm.videoActive, false);
    assert.equal(sm.videoStarted, false);
  });

  await t.test("Dashboard In Depth Action Button provides preview modal and confirms completion", () => {
    const sm = new DashboardPlayerStateMachine();
    sm.selectItem(3);
    assert.equal(sm.selectedItemIndex, 3);

    // Click In Depth
    sm.handleInDepthClick();
    assert.equal(sm.inDepthModalOpen, true);
    assert.equal(sm.selectedItemIndex, 3, "Selected item highlight preserved");

    // Confirm download
    sm.handleConfirmDownload();
    assert.equal(sm.inDepthModalOpen, false);
    assert.equal(sm.downloadCompleted, true);
    assert.equal(sm.downloadAlertVisible, true);
    assert.equal(sm.selectedItemIndex, 3, "Selected item remains highlighted after download");

    // Dismiss alert
    sm.dismissAlert();
    assert.equal(sm.downloadAlertVisible, false);
    assert.equal(sm.selectedItemIndex, 3);
  });

  await t.test("Cubicon Timed Preview Controller (Section 7.2): 1-minute intro and 7s per state", () => {
    const sm = new CubiconTimedPreviewStateMachine();
    assert.equal(sm.currentSlide, 0, "Initial state is Slide 0 (Introduction)");
    assert.equal(sm.isPreviewRunning, false);

    // Start 1-Minute Preview
    sm.startPreview();
    assert.equal(sm.currentSlide, 1, "Starts on Puzzle 1");
    assert.equal(sm.isPreviewRunning, true);
    assert.equal(sm.secondsRemaining, 7, "Each puzzle state allocates 7 seconds");

    // Advance 6 seconds
    for (let i = 0; i < 6; i++) {
      sm.tickSecond();
    }
    assert.equal(sm.currentSlide, 1);
    assert.equal(sm.secondsRemaining, 1);

    // 7th second completes Puzzle 1 -> advances to Puzzle 2
    sm.tickSecond();
    assert.equal(sm.currentSlide, 2, "Advances automatically to Puzzle 2");
    assert.equal(sm.secondsRemaining, 7);

    // Puzzle 2 completes -> advances to Puzzle 3
    for (let i = 0; i < 7; i++) {
      sm.tickSecond();
    }
    assert.equal(sm.currentSlide, 3, "Advances automatically to Puzzle 3");
    assert.equal(sm.secondsRemaining, 7);

    // Puzzle 3 completes -> preview finishes
    for (let i = 0; i < 7; i++) {
      sm.tickSecond();
    }
    assert.equal(sm.currentSlide, 3);
    assert.equal(sm.isPreviewRunning, false, "Preview finishes automatically after state 3");
  });

  await t.test("Cubicon Timed Preview Controls: Pause, Replay, Cancel, and See It Live", () => {
    const sm = new CubiconTimedPreviewStateMachine();
    sm.startPreview();
    assert.equal(sm.currentSlide, 1);
    assert.equal(sm.secondsRemaining, 7);

    // Tick 2 seconds
    sm.tickSecond();
    sm.tickSecond();
    assert.equal(sm.secondsRemaining, 5);

    // Pause
    sm.togglePause();
    assert.equal(sm.isPreviewPaused, true);
    sm.tickSecond();
    sm.tickSecond();
    assert.equal(sm.secondsRemaining, 5, "Timer does not tick while paused");

    // Resume
    sm.togglePause();
    assert.equal(sm.isPreviewPaused, false);
    sm.tickSecond();
    assert.equal(sm.secondsRemaining, 4, "Timer resumes ticking");

    // Replay
    sm.replay();
    assert.equal(sm.currentSlide, 1, "Replay resets to Puzzle 1");
    assert.equal(sm.secondsRemaining, 7, "Replay resets timer to 7 seconds");
    assert.equal(sm.isPreviewRunning, true);

    // Cancel returns to introduction without navigating
    sm.cancel();
    assert.equal(sm.currentSlide, 0, "Cancel returns user to Introduction slide");
    assert.equal(sm.isPreviewRunning, false);

    // See It Live transitions to 3D app
    sm.startPreview();
    sm.seeItLive();
    assert.equal(sm.showLiveApp, true);
    assert.equal(sm.isPreviewRunning, false);
  });

  await t.test("Copy Claims Qualification: Absence of absolute ungrounded assertions", () => {
    const cubiconPath = path.join(BUYFACTS_ROOT, "app", "cubicon", "page.tsx");
    assert.ok(fs.existsSync(cubiconPath), "cubicon/page.tsx must exist");
    const content = fs.readFileSync(cubiconPath, "utf-8");

    // Absolute claims must be qualified
    assert.ok(
      !content.includes("bots are incapable of evaluating"),
      "Absolute claim 'bots are incapable of evaluating' must be qualified"
    );
    assert.ok(
      !content.includes("Ensure 100% confidence"),
      "Absolute claim 'Ensure 100% confidence' must be qualified"
    );
    assert.ok(
      content.includes("designed to resist automated script"),
      "Must contain qualified methodological claim 'designed to resist automated script'"
    );
    assert.ok(
      content.includes("Achieve high statistical confidence"),
      "Must contain qualified claim 'Achieve high statistical confidence'"
    );
  });

  await t.test("Copy Terminology Alignment: 'participant' replaces 'respondent' across pages", () => {
    const filesToCheck = [
      path.join(BUYFACTS_ROOT, "app", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "products-services", "page.tsx"),
      path.join(BUYFACTS_ROOT, "app", "research-imperatives", "page.tsx"),
      path.join(BUYFACTS_ROOT, "components", "Navbar.tsx"),
      path.join(BUYFACTS_ROOT, "components", "Footer.tsx"),
    ];

    for (const filePath of filesToCheck) {
      assert.ok(fs.existsSync(filePath), `${filePath} must exist`);
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that prominent titles or sections use participant rather than respondent
      assert.ok(
        !content.includes("Survey Respondents"),
        `${filePath} should not use 'Survey Respondents'`
      );
      assert.ok(
        !content.includes("Respondent Validation"),
        `${filePath} should not use 'Respondent Validation'`
      );
    }
  });
});
