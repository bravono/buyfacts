import React from "react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.topSection}>
          <div className={styles.brandCol}>
            <div className={styles.logo}>
              <span className={styles.logoText}>
                Buy<span className={styles.logoHighlight}>Facts</span>
                <span className={styles.trademark}>®</span>
              </span>
            </div>
            <p className={styles.brandDesc}>
              A framework of methods and tools designed to help organizations recognize meaningful movement earlier, reduce uncertainty, and improve Return on Effort.
            </p>
          </div>
          
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Framework Links</h4>
            <ul className={styles.linksList}>
              <li><a href="#time-savings">Time Savings</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className={styles.methodsCol}>
            <h4 className={styles.colTitle}>Core Methodologies</h4>
            <ul className={styles.linksList}>
              <li><a href="#services?tab=best-practices">Cubicon™</a></li>
              <li><a href="#services?tab=thought-leadership">Research Libs™</a></li>
              <li><a href="#services?tab=research-tools">TRIAD™</a></li>
              <li><a href="#services?tab=best-practices">Rule of Three®</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomSection}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} BuyFacts®. All rights reserved.
          </p>
          <p className={styles.disclaimer}>
            BuyFacts®, Cubicon™, TRIAD™, and Rule of Three® are registered trademarks or trademarks in the B2B research methodology domain.
          </p>
        </div>
      </div>
    </footer>
  );
}
