"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import styles from "./Navbar.module.css";

export default function Navbar({
  hideOnScroll = false,
}: {
  hideOnScroll?: boolean;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isContactCollapsed, setIsContactCollapsed] = useState(false);
  const pathname = usePathname() || "/";

  const lastScrollYRef = useRef(0);
  const ignoreScrollUntilRef = useRef(0);

  // Scroll detection: handle background glass state and scroll-up restoration
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (isContactCollapsed) {
        const isPastGracePeriod = Date.now() > ignoreScrollUntilRef.current;
        const scrolledUp = currentScrollY < lastScrollYRef.current - 8;
        const reachedTop = currentScrollY <= 20;

        // Bring navbar back when scrolling up or returning to top
        if (isPastGracePeriod && (scrolledUp || reachedTop)) {
          setIsContactCollapsed(false);
        }
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isContactCollapsed]);

  // Collapse handler for Contact link click
  const handleContactClick = () => {
    setIsContactCollapsed(true);
    setIsMobileMenuOpen(false);
    // Ignore scroll events for 1000ms while smooth scrolling down to #contact
    ignoreScrollUntilRef.current = Date.now() + 1000;

    if (pathname === "/") {
      const contactElem = document.getElementById("contact");
      if (contactElem) {
        contactElem.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Listen for hash changes or document-wide contact links
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target) {
        const href = target.getAttribute("href");
        if (href === "/#contact" || href === "#contact") {
          setIsContactCollapsed(true);
          setIsMobileMenuOpen(false);
          ignoreScrollUntilRef.current = Date.now() + 1000;
        }
      }
    };

    const handleHashChange = () => {
      if (window.location.hash === "#contact") {
        setIsContactCollapsed(true);
        ignoreScrollUntilRef.current = Date.now() + 1000;
      }
    };

    if (typeof window !== "undefined" && window.location.hash === "#contact") {
      setIsContactCollapsed(true);
    }

    document.addEventListener("click", handleDocClick, { capture: true });
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      document.removeEventListener("click", handleDocClick, { capture: true });
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Reset collapse when navigating to another route
  useEffect(() => {
    setIsContactCollapsed(false);
  }, [pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isHomeActive = pathname === "/";
  const isInnovationsActive = pathname === "/products-services";
  const isResearchActive = pathname === "/research-imperatives";
  const isCubiconActive = pathname.startsWith("/cubicon");

  const isHidden = (hideOnScroll && isScrolled) || isContactCollapsed;

  return (
    <header
      className={`${styles.header} ${isScrolled ? styles.scrolled : ""} ${isHidden ? styles.hidden : ""} ${isContactCollapsed ? styles.collapsed : ""}`}
    >
      <div className={styles.container}>
        <Link href="/" className={styles.logo} id="nav-logo-link">
          <img src="/logo.png" alt="BuyFacts Logo" style={{ height: "50px" }} />
          <div className={styles.logoTextWrapper}>
            <span className={styles.logoText}>
              Buy<span className={styles.logoHighlight}>Facts</span>
              <span className={styles.trademark}>®</span>
            </span>
            <span className={styles.logoSubtitle}>
              Real Data - Real People
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.navDesktop}>
          <Link
            href="/"
            className={`${styles.navLink} ${isHomeActive ? styles.navLinkActive : ""}`}
            id="nav-link-home"
            onClick={() => setIsContactCollapsed(false)}
          >
            HOME
          </Link>

          <Link
            href="/products-services"
            className={`${styles.navLink} ${isInnovationsActive ? styles.navLinkActive : ""}`}
            id="nav-link-innovations"
            onClick={() => setIsContactCollapsed(false)}
          >
            INNOVATIONS THAT SAVE TIME
          </Link>

          <Link
            href="/research-imperatives"
            className={`${styles.navLink} ${isResearchActive ? styles.navLinkActive : ""}`}
            id="nav-link-research-imperatives"
            onClick={() => setIsContactCollapsed(false)}
          >
            RESEARCH IMPERATIVES
          </Link>

          <Link
            href="/cubicon"
            className={`${styles.navLink} ${isCubiconActive ? styles.navLinkActive : ""}`}
            id="nav-link-cubicon"
            onClick={() => setIsContactCollapsed(false)}
          >
            CUBICON
          </Link>

          <Link
            href="/#about"
            className={styles.navLink}
            id="nav-link-about"
            onClick={() => setIsContactCollapsed(false)}
          >
            ABOUT
          </Link>

          <Link
            href="/#what-sets-us-apart"
            className={styles.navLink}
            id="nav-link-what-sets-us-apart"
            onClick={() => setIsContactCollapsed(false)}
          >
            WHAT SETS US APART
          </Link>

          <Link
            href="/#contact"
            className={`${styles.btnNav} btn btn-primary`}
            id="nav-link-contact"
            onClick={handleContactClick}
          >
            CONTACT <ArrowUpRight size={14} />
          </Link>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          className={styles.hamburger}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          id="mobile-menu-toggle-btn"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      <div
        className={`${styles.mobileDrawer} ${isMobileMenuOpen ? styles.open : ""}`}
      >
        <nav className={styles.navMobile}>
          <Link
            href="/"
            onClick={() => {
              closeMobileMenu();
              setIsContactCollapsed(false);
            }}
            className={`${styles.mobileNavLink} ${isHomeActive ? styles.mobileNavLinkActive : ""}`}
            id="mob-link-home"
          >
            HOME
          </Link>
          <Link
            href="/products-services"
            onClick={() => {
              closeMobileMenu();
              setIsContactCollapsed(false);
            }}
            className={`${styles.mobileNavLink} ${isInnovationsActive ? styles.mobileNavLinkActive : ""}`}
            id="mob-link-innovations"
          >
            INNOVATIONS THAT SAVE TIME
          </Link>
          <Link
            href="/research-imperatives"
            onClick={() => {
              closeMobileMenu();
              setIsContactCollapsed(false);
            }}
            className={`${styles.mobileNavLink} ${isResearchActive ? styles.mobileNavLinkActive : ""}`}
            id="mob-link-research-imperatives"
          >
            RESEARCH IMPERATIVES
          </Link>
          <Link
            href="/cubicon"
            onClick={() => {
              closeMobileMenu();
              setIsContactCollapsed(false);
            }}
            className={`${styles.mobileNavLink} ${isCubiconActive ? styles.mobileNavLinkActive : ""}`}
            id="mob-link-cubicon"
          >
            CUBICON
          </Link>
          <Link
            href="/#about"
            onClick={() => {
              closeMobileMenu();
              setIsContactCollapsed(false);
            }}
            className={styles.mobileNavLink}
            id="mob-link-about"
          >
            ABOUT
          </Link>
          <Link
            href="/#what-sets-us-apart"
            onClick={() => {
              closeMobileMenu();
              setIsContactCollapsed(false);
            }}
            className={styles.mobileNavLink}
            id="mob-link-what-sets-us-apart"
          >
            WHAT SETS US APART
          </Link>
          <Link
            href="/#contact"
            onClick={() => {
              closeMobileMenu();
              handleContactClick();
            }}
            className={`${styles.mobileBtnNav} btn btn-primary`}
            id="mob-link-contact"
          >
            CONTACT <ArrowUpRight size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
