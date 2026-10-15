import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUYFACTS_ROOT = path.resolve(__dirname, "..");

// State Machine Simulator for Navbar Contact Collapse & Scroll-Up Behavior
class NavbarCollapseStateMachine {
  isScrolled: boolean = false;
  isContactCollapsed: boolean = false;
  isMobileMenuOpen: boolean = false;
  lastScrollY: number = 0;
  ignoreScrollUntil: number = 0;

  clickContact(now: number = Date.now()) {
    this.isContactCollapsed = true;
    this.isMobileMenuOpen = false;
    this.ignoreScrollUntil = now + 1000;
  }

  clickOtherNavLink() {
    this.isContactCollapsed = false;
    this.isMobileMenuOpen = false;
  }

  handleScroll(currentScrollY: number, now: number = Date.now()) {
    if (currentScrollY > 20) {
      this.isScrolled = true;
    } else {
      this.isScrolled = false;
    }

    if (this.isContactCollapsed) {
      const isPastGracePeriod = now > this.ignoreScrollUntil;
      const scrolledUp = currentScrollY < this.lastScrollY - 8;
      const reachedTop = currentScrollY <= 20;

      if (isPastGracePeriod && (scrolledUp || reachedTop)) {
        this.isContactCollapsed = false;
      }
    }

    this.lastScrollY = currentScrollY;
  }
}

test("Navbar Contact Collapse and Scroll-Up Restoration Integration Test Suite", async (t) => {
  const navbarPath = path.join(BUYFACTS_ROOT, "components", "Navbar.tsx");
  const cssPath = path.join(BUYFACTS_ROOT, "components", "Navbar.module.css");

  assert.ok(fs.existsSync(navbarPath), "Navbar.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "Navbar.module.css must exist");

  const navbarContent = fs.readFileSync(navbarPath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  await t.test("1. Contact Click Collapse Logic in Navbar Component", () => {
    // Contact state management
    assert.ok(
      navbarContent.includes("isContactCollapsed"),
      "Navbar.tsx must maintain isContactCollapsed state"
    );
    assert.ok(
      navbarContent.includes("setIsContactCollapsed"),
      "Navbar.tsx must define setIsContactCollapsed state updater"
    );

    // Click handler presence
    assert.ok(
      navbarContent.includes("handleContactClick"),
      "Navbar.tsx must implement handleContactClick"
    );

    // Desktop Contact button binding
    assert.ok(
      /id="nav-link-contact"[^>]*onClick=\{handleContactClick\}/.test(navbarContent) ||
      /onClick=\{handleContactClick\}[^>]*id="nav-link-contact"/.test(navbarContent),
      "Desktop CONTACT link (nav-link-contact) must bind handleContactClick"
    );

    // Mobile Contact button binding
    assert.ok(
      navbarContent.includes('id="mob-link-contact"') &&
      navbarContent.includes("handleContactClick();"),
      "Mobile drawer CONTACT link (mob-link-contact) must invoke handleContactClick"
    );

    // Application of collapsed and hidden classes
    assert.ok(
      navbarContent.includes("styles.collapsed"),
      "Navbar.tsx must apply styles.collapsed when contact collapsed"
    );
    assert.ok(
      navbarContent.includes("styles.hidden"),
      "Navbar.tsx must apply styles.hidden when collapsed or hidden on scroll"
    );
  });

  await t.test("2. Scroll-Up Detection & Grace Period Implementation", () => {
    // Scroll tracking
    assert.ok(
      navbarContent.includes("lastScrollYRef"),
      "Navbar.tsx must track last scroll position via lastScrollYRef"
    );
    assert.ok(
      navbarContent.includes("ignoreScrollUntilRef"),
      "Navbar.tsx must track programmatic scroll grace window via ignoreScrollUntilRef"
    );

    // Upward scroll condition
    assert.ok(
      navbarContent.includes("scrolledUp") ||
      navbarContent.includes("currentScrollY < lastScrollYRef.current"),
      "Navbar.tsx must detect upward scrolling"
    );

    // Resetting state on scroll up
    assert.ok(
      navbarContent.includes("setIsContactCollapsed(false)"),
      "Navbar.tsx must restore navbar visibility on upward scroll or navigation"
    );
  });

  await t.test("3. CSS Stylesheet Class Specifications for Collapsed State", () => {
    // .collapsed class definition
    assert.ok(
      cssContent.includes(".collapsed"),
      "Navbar.module.css must define .collapsed class"
    );

    // Negative translation to ensure entire navbar moves offscreen
    assert.ok(
      cssContent.includes("transform: translateY(calc(-100% - 30px));") ||
      cssContent.includes("transform: translateY(-"),
      "Navbar.module.css must shift collapsed header offscreen via translateY"
    );

    // Invisibility and click-through prevention
    assert.ok(
      cssContent.includes("opacity: 0;"),
      "Navbar.module.css must enforce opacity: 0 for collapsed header"
    );
    assert.ok(
      cssContent.includes("pointer-events: none;"),
      "Navbar.module.css must enforce pointer-events: none for collapsed header"
    );

    // Smooth transition
    assert.ok(
      cssContent.includes("transition: transform"),
      "Navbar.module.css must provide smooth transform transition for collapse/expand animation"
    );
  });

  await t.test("4. Navigation Parity Preserved: All 7 Destinations & IDs Intact", () => {
    const requiredDesktopIds = [
      'id="nav-link-home"',
      'id="nav-link-innovations"',
      'id="nav-link-research-imperatives"',
      'id="nav-link-cubicon"',
      'id="nav-link-about"',
      'id="nav-link-what-sets-us-apart"',
      'id="nav-link-contact"',
    ];

    const requiredMobileIds = [
      'id="mob-link-home"',
      'id="mob-link-innovations"',
      'id="mob-link-research-imperatives"',
      'id="mob-link-cubicon"',
      'id="mob-link-about"',
      'id="mob-link-what-sets-us-apart"',
      'id="mob-link-contact"',
    ];

    for (const id of requiredDesktopIds) {
      assert.ok(navbarContent.includes(id), `Navbar.tsx must retain desktop id ${id}`);
    }

    for (const id of requiredMobileIds) {
      assert.ok(navbarContent.includes(id), `Navbar.tsx must retain mobile id ${id}`);
    }
  });

  await t.test("5. State Machine Lifecycle Simulation", () => {
    const sm = new NavbarCollapseStateMachine();
    const baseTime = 1000000;

    // Initial state at page top
    sm.handleScroll(0, baseTime);
    assert.equal(sm.isScrolled, false);
    assert.equal(sm.isContactCollapsed, false);

    // User scrolls down past hero
    sm.handleScroll(200, baseTime + 100);
    assert.equal(sm.isScrolled, true);
    assert.equal(sm.isContactCollapsed, false);

    // User clicks Contact in navbar
    sm.clickContact(baseTime + 200);
    assert.equal(sm.isContactCollapsed, true, "Navbar must collapse immediately upon clicking Contact");

    // During programmatic smooth scroll (grace window), scroll events fire downwards
    sm.handleScroll(1500, baseTime + 400);
    assert.equal(sm.isContactCollapsed, true, "Navbar must remain collapsed while traveling down to #contact");

    // Arrival at #contact section (~3500px)
    sm.handleScroll(3500, baseTime + 800);
    assert.equal(sm.isContactCollapsed, true, "Navbar must remain collapsed at #contact");

    // User scrolls further down (e.g. past contact card) after grace period
    sm.handleScroll(3600, baseTime + 1500);
    assert.equal(sm.isContactCollapsed, true, "Downward scrolling must not restore the navbar");

    // User starts scrolling back UP by 50px
    sm.handleScroll(3550, baseTime + 1600);
    assert.equal(
      sm.isContactCollapsed,
      false,
      "Navbar must restore (uncollapse) immediately when user starts scrolling back up"
    );

    // User clicks Contact again
    sm.clickContact(baseTime + 2000);
    assert.equal(sm.isContactCollapsed, true, "Navbar collapses again on subsequent Contact click");

    // User scrolls all the way back to page top (<= 20px)
    sm.handleScroll(15, baseTime + 3200);
    assert.equal(
      sm.isContactCollapsed,
      false,
      "Returning to top of page must restore navbar"
    );

    // User clicks another nav link while collapsed
    sm.clickContact(baseTime + 4000);
    assert.equal(sm.isContactCollapsed, true);
    sm.clickOtherNavLink();
    assert.equal(
      sm.isContactCollapsed,
      false,
      "Clicking another navigation link must reset collapsed state"
    );
  });

  await t.test("6. Zero-Emoji Compliance across Modified Files", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    const files = [
      { name: "components/Navbar.tsx", content: navbarContent },
      { name: "components/Navbar.module.css", content: cssContent },
    ];

    for (const f of files) {
      const lines = f.content.split("\n");
      lines.forEach((line, idx) => {
        assert.ok(
          !emojiRegex.test(line),
          `Emoji found in ${f.name} at line ${idx + 1}: ${line}`
        );
      });
    }
  });
});
