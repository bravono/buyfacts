"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpertiseResources from "@/components/ExpertiseResources";
import { 
  ArrowRight, 
  Send,
  Building2,
  Mail,
  User,
  MessageSquare,
  FileText,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
    interest: "General Inquiry"
  });
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.message) {
      setFormStatus({
        type: "error",
        message: "Please fill out all required fields (Name, Email, Message)."
      });
      return;
    }

    setIsSubmitting(true);
    setFormStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState)
      });

      const data = await response.json();

      if (response.ok) {
        setFormStatus({
          type: "success",
          message: "Thank you! Your message has been received. Our team will contact you shortly."
        });
        setFormState({
          name: "",
          email: "",
          company: "",
          message: "",
          interest: "General Inquiry"
        });
      } else {
        setFormStatus({
          type: "error",
          message: data.error || "Something went wrong. Please try again."
        });
      }
    } catch (error) {
      setFormStatus({
        type: "error",
        message: "Network error. Please verify your connection and try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className={styles.main}>
      {/* Decorative Blur Shapes */}
      <div className="glow-blob blob-green"></div>
      <div className="glow-blob blob-blue"></div>
      <div className="glow-blob blob-gold"></div>

      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero} id="hero">
        <div className="grid-bg"></div>
        
        {/* Dark Crowds silhouettes background mockup styling */}
        <div className={styles.heroCrowdOverlay}></div>

        <div className={styles.container}>
          <div className={`${styles.heroContent} animate-fade-in-up`}>
            <h1 className={styles.heroTitle}>
              We Build <span className={styles.heroHighlight}>Brand</span>
            </h1>
            <p className={styles.heroDesc}>
              BuyFacts helps you identify meaningful movement earlier, so you can make better decisions, faster.
            </p>
            
            <div className={styles.heroActions}>
              <a href="/services" className="btn btn-primary" id="hero-cta-explore">
                LEARN MORE <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className={styles.scrollIndicator}>
          <a href="#time-savings" className={styles.scrollCircle} aria-label="Scroll down">
            <ChevronDown size={20} className={styles.scrollArrow} />
          </a>
        </div>
      </section>

      {/* Savings Section (Real Data, Founding Client Offer) */}
      <section className={styles.section} id="time-savings">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTagline}>Time Savings</span>
            <h2 className={styles.sectionTitle}>Precision B2B Research</h2>
            <p className={styles.sectionDesc}>
              Our framework ensures faster recognition of market movement, helping B2B vendors reduce uncertainty.
            </p>
          </div>

          <div className={styles.heroFeatures}>
            <div className={`${styles.heroFeatureCard} glass-card`}>
              <div className={`${styles.featureIcon} ${styles.iconBlue}`}>
                <UserCheck size={24} />
              </div>
              <h3 className={styles.featureTitle}>Real Data. Real People.</h3>
              <p className={styles.featureDesc}>
                We validate every respondent through a multi-stage review. No synthesized profiles or bot traffic, just authentic qualitative feedback from verified buyers.
              </p>
              <a href="/services" className={styles.cardActionLink}>
                Learn about validation <ArrowUpRight size={14} />
              </a>
            </div>

            <div className={`${styles.heroFeatureCard} glass-card`}>
              <div className={`${styles.featureIcon} ${styles.iconGold}`}>
                <TrendingUp size={24} />
              </div>
              <h3 className={styles.featureTitle}>Founding Client Offer</h3>
              <p className={styles.featureDesc}>
                Become a founding partner of the BuyFacts framework to unlock customized survey metrics, dedicated analysis nodes, and direct CRM integrations.
              </p>
              <a href="#contact" className={styles.cardActionLink}>
                Request founding terms <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Expertise & Resources Section */}
      <section className={styles.section} style={{ padding: "4rem 0" }}>
        <div className={styles.container}>
          <ExpertiseResources />
        </div>
      </section>

      {/* About Us Section */}
      <section className={`${styles.section} section-brand-bg`} id="about">
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: "3rem" }}>
            <span className={styles.sectionTagline} style={{ color: "var(--color-orange-2)" }}>Leadership Team</span>
            <h2 className={styles.sectionTitle}>About Us</h2>
            <p className={styles.sectionDesc} style={{ color: "var(--color-grey-2)" }}>
              BuyFacts is a framework of methods and tools designed to help organizations recognize meaningful movement earlier, reduce uncertainty, and improve Return on Effort through faster, easier, and better research.
            </p>
          </div>

          {/* Profiles Grid */}
          <div className={styles.teamGrid}>
            <div className={`${styles.memberCard} ${styles.memberCardLight}`} id="team-member-robert">
              {/* Monogram stamp icon top right */}
              <div className={styles.cardStamp}>
                <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="6" width="88" height="88" rx="12" stroke="var(--primary-color)" strokeWidth="12" fill="white" />
                  <path d="M24 24H50V34H36V46H48V56H36V76H24V24Z" fill="var(--primary-color)" />
                  <path d="M50 24H68C74 24 78 28 78 34C78 40 74 44 68 44H50V24Z" fill="var(--color-blue-1)" />
                  <path d="M50 44H70C76 44 80 48 80 55C80 62 76 76 70 76H50V44Z" fill="var(--color-blue-1)" />
                  <rect x="42" y="24" width="12" height="52" fill="var(--color-blue-1)" />
                </svg>
              </div>

              <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>
                  <span className={styles.avatarPlaceholder}>RJ</span>
                </div>
              </div>
              <h3 className={styles.memberName}>Robert M Johnson</h3>
              <span className={styles.memberRole}>Project Manager / Survey Methods</span>
              <p className={styles.memberBio}>
                Robert designs robust, bias-free questionnaires. He develops frameworks that ensure quantitative datasets align with commercial research guidelines.
              </p>
            </div>

            <div className={`${styles.memberCard} ${styles.memberCardLight}`} id="team-member-guduspa">
              {/* Monogram stamp icon top right */}
              <div className={styles.cardStamp}>
                <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="6" width="88" height="88" rx="12" stroke="var(--primary-color)" strokeWidth="12" fill="white" />
                  <path d="M24 24H50V34H36V46H48V56H36V76H24V24Z" fill="var(--primary-color)" />
                  <path d="M50 24H68C74 24 78 28 78 34C78 40 74 44 68 44H50V24Z" fill="var(--color-blue-1)" />
                  <path d="M50 44H70C76 44 80 48 80 55C80 62 76 76 70 76H50V44Z" fill="var(--color-blue-1)" />
                  <rect x="42" y="24" width="12" height="52" fill="var(--color-blue-1)" />
                </svg>
              </div>

              <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>
                  <span className={styles.avatarPlaceholder}>GK</span>
                </div>
              </div>
              <h3 className={styles.memberName}>Guduspa Kumar</h3>
              <span className={styles.memberRole}>Project Manager / Analytics</span>
              <p className={styles.memberBio}>
                Guduspa translates raw data patterns into predictive models. He designs quantitative scoring mechanisms to visualize B2B buyer intent.
              </p>
            </div>

            <div className={`${styles.memberCard} ${styles.memberCardLight}`} id="team-member-bernie">
              {/* Monogram stamp icon top right */}
              <div className={styles.cardStamp}>
                <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="6" width="88" height="88" rx="12" stroke="var(--primary-color)" strokeWidth="12" fill="white" />
                  <path d="M24 24H50V34H36V46H48V56H36V76H24V24Z" fill="var(--primary-color)" />
                  <path d="M50 24H68C74 24 78 28 78 34C78 40 74 44 68 44H50V24Z" fill="var(--color-blue-1)" />
                  <path d="M50 44H70C76 44 80 48 80 55C80 62 76 76 70 76H50V44Z" fill="var(--color-blue-1)" />
                  <rect x="42" y="24" width="12" height="52" fill="var(--color-blue-1)" />
                </svg>
              </div>

              <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>
                  <span className={styles.avatarPlaceholder}>BR</span>
                </div>
              </div>
              <h3 className={styles.memberName}>Bernie Rudolph</h3>
              <span className={styles.memberRole}>Project Manager / Quality Assurance</span>
              <p className={styles.memberBio}>
                Bernie supervises secure cloud servers and routing mechanisms. He conducts strict quality control protocols for every participant panel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className={styles.section} id="contact">
        <div className={styles.container}>
          <div className={styles.contactGrid}>
            <div className={styles.contactInfo}>
              <div>
                <span className={styles.sectionTagline}>Get In Touch</span>
                <h2 className={styles.contactHeaderTitle}>Connect with Our Team</h2>
                <p className={styles.contactHeaderDesc}>
                  Have questions about the BuyFacts® framework, Cubicon™, or TRIAD™ tools? Let us help you map your B2B research challenges to high-impact analytical systems.
                </p>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className={styles.infoTextTitle}>Email Address</h4>
                  <p className={styles.infoTextVal}>inquiries@buyfacts.net</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className={styles.infoTextTitle}>Corporate Head Office</h4>
                  <p className={styles.infoTextVal}>BuyFacts Research Group LLC<br />Financial Center, Suite 1100<br />New York, NY 10005</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="glass-card" style={{ padding: "3rem" }}>
              <form onSubmit={handleSubmit} className={styles.contactForm} id="contact-form">
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>Full Name <span style={{ color: "var(--primary-color)" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      value={formState.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Sarah Connor" 
                      className={styles.input}
                      style={{ width: "100%", paddingLeft: "2.8rem" }}
                      required
                    />
                    <User size={16} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>Business Email <span style={{ color: "var(--primary-color)" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      value={formState.email}
                      onChange={handleInputChange}
                      placeholder="e.g. sarah@cyberdyne.com" 
                      className={styles.input}
                      style={{ width: "100%", paddingLeft: "2.8rem" }}
                      required
                    />
                    <Mail size={16} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="company" className={styles.label}>Company / Organization</label>
                  <div style={{ position: "relative" }}>
                    <input 
                      type="text" 
                      id="company" 
                      name="company" 
                      value={formState.company}
                      onChange={handleInputChange}
                      placeholder="e.g. Cyberdyne Systems" 
                      className={styles.input}
                      style={{ width: "100%", paddingLeft: "2.8rem" }}
                    />
                    <Building2 size={16} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="interest" className={styles.label}>Area of Interest</label>
                  <div style={{ position: "relative" }}>
                    <select 
                      id="interest" 
                      name="interest" 
                      value={formState.interest}
                      onChange={handleInputChange}
                      className={styles.input}
                      style={{ width: "100%", paddingLeft: "2.8rem", appearance: "none" }}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Cubicon Methodology">Cubicon™ Framework</option>
                      <option value="TRIAD Survey Design">TRIAD™ Survey Tools</option>
                      <option value="Rule of Three Validation">Rule of Three® Consultation</option>
                      <option value="Survey Hosting Services">Survey Hosting & Auditing</option>
                      <option value="Founding Client Offer">Founding Client Offer</option>
                    </select>
                    <FileText size={16} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.label}>Your Message <span style={{ color: "var(--primary-color)" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <textarea 
                      id="message" 
                      name="message" 
                      value={formState.message}
                      onChange={handleInputChange}
                      placeholder="Tell us about your research requirements..." 
                      className={styles.textarea}
                      style={{ width: "100%", paddingLeft: "2.8rem" }}
                      required
                    ></textarea>
                    <MessageSquare size={16} style={{ position: "absolute", left: "1.2rem", top: "1.1rem", color: "var(--text-dim)" }} />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary submitBtn"
                  id="contact-submit-btn"
                >
                  {isSubmitting ? "Sending Inquiry..." : "Submit Inquiry"} <Send size={16} />
                </button>

                {formStatus.type && (
                  <div className={`${styles.formStatus} ${formStatus.type === "success" ? styles.formStatusSuccess : styles.formStatusError}`}>
                    {formStatus.message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
