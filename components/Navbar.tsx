"use client";

import React, { useState, useEffect } from "react";
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
  const pathname = usePathname() || "/";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <header
      className={`${styles.header} ${isScrolled ? (hideOnScroll ? styles.hidden : styles.scrolled) : ""}`}
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
              THE EARLY RECOGNITION COMPANY
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.navDesktop}>
          <Link
            href="/"
            className={`${styles.navLink} ${isHomeActive ? styles.navLinkActive : ""}`}
            id="nav-link-home"
          >
            HOME
          </Link>

          <Link
            href="/products-services"
            className={`${styles.navLink} ${isInnovationsActive ? styles.navLinkActive : ""}`}
            id="nav-link-innovations"
          >
            INNOVATIONS THAT SAVE TIME
          </Link>

          <Link
            href="/research-imperatives"
            className={`${styles.navLink} ${isResearchActive ? styles.navLinkActive : ""}`}
            id="nav-link-research-imperatives"
          >
            RESEARCH IMPERATIVES
          </Link>

          <Link
            href="/cubicon"
            className={`${styles.navLink} ${isCubiconActive ? styles.navLinkActive : ""}`}
            id="nav-link-cubicon"
          >
            CUBICON
          </Link>

          <Link
            href="/#thought-leadership"
            className={styles.navLink}
            id="nav-link-thought-leadership"
          >
            THOUGHT LEADERSHIP
          </Link>

          <Link
            href="/#about"
            className={styles.navLink}
            id="nav-link-about"
          >
            ABOUT
          </Link>

          <Link
            href="/#contact"
            className={`${styles.btnNav} btn btn-primary`}
            id="nav-link-contact"
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
            onClick={closeMobileMenu}
            className={`${styles.mobileNavLink} ${isHomeActive ? styles.mobileNavLinkActive : ""}`}
            id="mob-link-home"
          >
            HOME
          </Link>
          <Link
            href="/products-services"
            onClick={closeMobileMenu}
            className={`${styles.mobileNavLink} ${isInnovationsActive ? styles.mobileNavLinkActive : ""}`}
            id="mob-link-innovations"
          >
            INNOVATIONS THAT SAVE TIME
          </Link>
          <Link
            href="/research-imperatives"
            onClick={closeMobileMenu}
            className={`${styles.mobileNavLink} ${isResearchActive ? styles.mobileNavLinkActive : ""}`}
            id="mob-link-research-imperatives"
          >
            RESEARCH IMPERATIVES
          </Link>
          <Link
            href="/cubicon"
            onClick={closeMobileMenu}
            className={`${styles.mobileNavLink} ${isCubiconActive ? styles.mobileNavLinkActive : ""}`}
            id="mob-link-cubicon"
          >
            CUBICON
          </Link>
          <Link
            href="/#thought-leadership"
            onClick={closeMobileMenu}
            className={styles.mobileNavLink}
            id="mob-link-thought-leadership"
          >
            THOUGHT LEADERSHIP
          </Link>
          <Link
            href="/#about"
            onClick={closeMobileMenu}
            className={styles.mobileNavLink}
            id="mob-link-about"
          >
            ABOUT
          </Link>
          <Link
            href="/#contact"
            onClick={closeMobileMenu}
            className={`${styles.mobileBtnNav} btn btn-primary`}
            id="mob-link-contact"
          >
            CONTACT <ArrowUpRight size={18} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
