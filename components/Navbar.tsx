"use client";

import React, { useState, useEffect } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ""}`}>
      <div className={styles.container}>
        <a href="#hero" className={styles.logo} id="nav-logo-link">
          <img src="/logo.png" alt="BuyFacts Logo" style={{ height: "50px" }} />
          <div className={styles.logoTextWrapper}>
            <span className={styles.logoText}>
              Buy<span className={styles.logoHighlight}>Facts</span>
              <span className={styles.trademark}>®</span>
            </span>
            <span className={styles.logoSubtitle}>Insights that Inspire</span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className={styles.navDesktop}>
          <a href="/" className={styles.navLink} id="nav-link-time-savings">
            HOME
          </a>

          <a href="/services" className={styles.navLink} id="nav-link-services">
            PRODUCTS / SERVICES
          </a>
          <a
            href="/thought-leadership"
            className={styles.navLink}
            id="nav-link-thought-leadership"
          >
            THOUGHT LEADERSHIP / BEST PRACTICES
          </a>

          <a href="/cubicon" className={styles.navLink} id="nav-link-cubicon">
            FOUNDING INVITATION
          </a>
          <a href="/#about" className={styles.navLink} id="nav-link-about">
            ABOUT
          </a>

          {/* Dropdown Portfolio Link */}

          <a
            href="/#contact"
            className={`${styles.btnNav} btn btn-primary`}
            id="nav-link-contact"
          >
            CONTACT <ArrowUpRight size={14} />
          </a>
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
          <a
            href="/"
            onClick={closeMobileMenu}
            className={styles.mobileNavLink}
            id="mob-link-home"
          >
            HOME
          </a>
          <a
            href="/services"
            onClick={closeMobileMenu}
            className={styles.mobileNavLink}
            id="mob-link-services"
          >
            SERVICES
          </a>
          <a
            href="/cubicon"
            onClick={closeMobileMenu}
            className={styles.mobileNavLink}
            id="mob-link-cubicon"
          >
            FOUNDING INVITATION
          </a>
          <a
            href="/#about"
            onClick={closeMobileMenu}
            className={styles.mobileNavLink}
            id="mob-link-about"
          >
            ABOUT
          </a>
          <a
            href="/#contact"
            onClick={closeMobileMenu}
            className={`${styles.mobileBtnNav} btn btn-primary`}
            id="mob-link-contact"
          >
            CONTACT <ArrowUpRight size={18} />
          </a>
        </nav>
      </div>
    </header>
  );
}
