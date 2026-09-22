"use client";

import React from "react";
import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brandCol}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{ fontSize: "1.4rem", fontWeight: "900", color: "#FF9900" }}>E3</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#FFFFFF" }}>BuyFacts®</span>
          </div>
          <p>
            A framework of methods and tools designed to help organizations recognize meaningful
            movement earlier, reduce uncertainty, and improve Return on Effort.
          </p>
        </div>

        <div className={styles.linksCol}>
          <h4>Framework Links</h4>
          <ul>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/#roberts-way">Innovations that Save Time</Link></li>
            <li><Link href="/research-imperatives">Research Imperatives</Link></li>
            <li><Link href="/cubicon">Cubicon Validation</Link></li>
          </ul>
        </div>

        <div className={styles.linksCol}>
          <h4>Core Methodologies</h4>
          <ul>
            <li><Link href="/#portfolio">Thought Leadership</Link></li>
            <li><Link href="/cubicon">TRIAD Framework</Link></li>
            <li><Link href="/#team">About Us</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span>© 2026 BuyFacts, Inc. All rights reserved.</span>
        <span>BuyFacts, Cubicon, TRIAD, and Rule of Three are trademarks of BuyFacts, Inc.</span>
        <Link href="/admin/cubicon-analytics">Admin Access</Link>
      </div>
    </footer>
  );
}
