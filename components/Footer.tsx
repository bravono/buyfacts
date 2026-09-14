import React from "react";
import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.topSection}>
          <div className={styles.brandCol}>
            <Link href="/" className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <img src="/logo.png" alt="BuyFacts Logo" style={{ height: "40px" }} />
              <span className={styles.logoText}>
                Buy<span className={styles.logoHighlight}>Facts</span>
                <span className={styles.trademark}>®</span>
              </span>
            </Link>
            <p className={styles.brandDesc}>
              A framework of methods and tools designed to help organizations recognize meaningful movement earlier, reduce uncertainty, and improve Return on Effort.
            </p>
          </div>
          
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Framework Links</h4>
            <ul className={styles.linksList}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/products-services">Innovations that Save Time</Link></li>
              <li><Link href="/research-imperatives">Research Imperatives</Link></li>
              <li><Link href="/#about">About Us</Link></li>
              <li><Link href="/#contact">Contact</Link></li>
            </ul>
          </div>

          <div className={styles.methodsCol}>
            <h4 className={styles.colTitle}>Core Methodologies</h4>
            <ul className={styles.linksList}>
              <li><Link href="/cubicon">Cubicon Validation</Link></li>
              <li><Link href="/research-lib">Research Libs</Link></li>
              <li><Link href="/products-services">TRIAD Framework</Link></li>
              <li><Link href="/#thought-leadership">Thought Leadership</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <p className={styles.copyright}>
              &copy; {new Date().getFullYear()} BuyFacts, Inc. All rights reserved.
            </p>
            <span style={{ opacity: 0.3, color: 'var(--text-muted)' }}>•</span>
            <Link
              href="/file-upload"
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                opacity: 0.6,
                textDecoration: 'none',
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
            >
              Admin Access
            </Link>
          </div>
          <p className={styles.disclaimer}>
            BuyFacts, Cubicon, TRIAD, and Rule of Three are trademarks or registered trademarks of BuyFacts, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
