"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  Send,
  Building2,
  Mail,
  User,
  MessageSquare,
  FileText,
  ChevronDown,
  Compass,
  Award,
  Search,
  Target,
  Edit3,
  Users,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import styles from "./page.module.css";

interface ServiceCardData {
  id: string;
  title: string;
  subTitle: string;
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
}

export default function Home() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
    interest: "General Inquiry",
  });
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The 8 Portfolio Cards matching Section 2 of the mockup image
  const portfolioCards: ServiceCardData[] = [
    {
      id: "innovation",
      title: "Innovation",
      subTitle: "Creative approaches that lead to new possibilities.",
      icon: <Compass size={32} />,
      iconColor: "#14a38b", // Teal
      bgColor: "rgba(20, 163, 139, 0.08)",
    },
    {
      id: "leadership",
      title: "Leadership",
      subTitle: "Strategic guidance that aligns insight with action.",
      icon: <Award size={32} />,
      iconColor: "#e6a100", // Gold/Amber
      bgColor: "rgba(230, 161, 0, 0.08)",
    },
    {
      id: "research-tools",
      title: "Research Tools",
      subTitle: "Powerful tools that make research faster and smarter.",
      icon: <Search size={32} />,
      iconColor: "#6d6d6d", // Grey
      bgColor: "rgba(109, 109, 109, 0.08)",
    },
    {
      id: "best-practices",
      title: "Best Practices",
      subTitle: "Proven methods that deliver better insights.",
      icon: <Target size={32} />,
      iconColor: "#0089d2", // Sky Blue
      bgColor: "rgba(0, 137, 210, 0.08)",
    },
    {
      id: "design",
      title: "Design",
      subTitle: "Insightful study designs that drive clarity.",
      icon: <Edit3 size={32} />,
      iconColor: "#7cb342", // Lime Green
      bgColor: "rgba(124, 179, 66, 0.08)",
    },
    {
      id: "survey-hosting",
      title: "Survey Hosting",
      subTitle: "Secure, reliable hosting for every research need.",
      icon: <Users size={32} />,
      iconColor: "#e57a45", // Coral
      bgColor: "rgba(229, 122, 69, 0.08)",
    },
    {
      id: "human-validation",
      title: "Human Validation",
      subTitle: "Real people. Real validation. Real confidence.",
      icon: <ShieldCheck size={32} />,
      iconColor: "#14a38b", // Teal
      bgColor: "rgba(20, 163, 139, 0.08)",
    },
    {
      id: "value",
      title: "Value",
      subTitle: "Delivering measurable results and improved return on effort.",
      icon: <TrendingUp size={32} />,
      iconColor: "#ffb039", // Accent Gold
      bgColor: "rgba(255, 176, 57, 0.08)",
    },
  ];

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.message) {
      setFormStatus({
        type: "error",
        message: "Please fill out all required fields (Name, Email, Message).",
      });
      return;
    }

    setIsSubmitting(true);
    setFormStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      const data = await response.json();

      if (response.ok) {
        setFormStatus({
          type: "success",
          message:
            "Thank you! Your message has been received. Our team will contact you shortly.",
        });
        setFormState({
          name: "",
          email: "",
          company: "",
          message: "",
          interest: "General Inquiry",
        });
      } else {
        setFormStatus({
          type: "error",
          message: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      setFormStatus({
        type: "error",
        message: "Network error. Please verify your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className={styles.main}>
      {/* Decorative Glow Blobs */}
      <div className="glow-blob blob-green"></div>
      <div className="glow-blob blob-blue"></div>

      <Navbar />

      {/* SECTION 1: Hero Section */}
      <section className={styles.hero} id="hero">
        <div className="grid-bg"></div>
        <div className={styles.heroCrowdOverlay}></div>

        <div className={styles.container}>
          <div className={`${styles.heroContent} animate-fade-in-up`}>
            <h1 className={styles.heroTitle}>
              We Build <span className={styles.heroHighlight}>Brand</span>
            </h1>
            <p className={styles.heroDesc}>
              BuyFacts helps you identify meaningful movement earlier, so you
              can make better decisions, faster.
            </p>

            <div className={styles.heroActions}>
              <a
                href="/services"
                className={styles.btnTeal}
                id="hero-cta-explore"
              >
                LEARN MORE
              </a>
            </div>
          </div>
        </div>

        <div className={styles.scrollIndicator}>
          <a
            href="#portfolio"
            className={styles.scrollCircle}
            aria-label="Scroll down"
          >
            <ChevronDown size={20} className={styles.scrollArrow} />
          </a>
        </div>
      </section>

      {/* SECTION 2: A Thought Leadership Portfolio (8 Cards Grid) */}
      <section
        className="section-light"
        id="portfolio"
        style={{ padding: "7rem 0" }}
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitleLight}>
              A Thought Leadership{" "}
              <span style={{ color: "var(--interactive-blue)" }}>Portfolio</span>
            </h2>
            <p className={styles.sectionDescLight}>
              Proven methods and tools for today&apos;s evolving insights and
              marketing industry.
            </p>

            {/* Accent Badges matching Mockup image */}
            <div className={styles.badgeRow}>
              <span className={`${styles.badge} ${styles.badgeNavy}`}>
                REAL DATA.
              </span>
              <span className={`${styles.badge} ${styles.badgeBlue}`}>
                REAL PEOPLE.
              </span>
              <span className={`${styles.badge} ${styles.badgeTeal}`}>
                REAL INSIGHT.
              </span>
            </div>
          </div>

          {/* 8 Circular Icon Cards Grid */}
          <div className={styles.servicesGrid}>
            {portfolioCards.map((card) => (
              <div
                key={card.id}
                className={styles.serviceCard}
                id={`portfolio-card-${card.id}`}
              >
                {/* Circle Icon Container */}
                <div
                  className={styles.iconCircle}
                  style={{
                    color: card.iconColor,
                    backgroundColor: card.bgColor,
                    borderColor: card.iconColor,
                  }}
                >
                  {card.icon}
                </div>

                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardSubtitle}>{card.subTitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: About Us (Teal Theme matching Mockup image) */}
      <section
        className="section-teal-bg"
        id="about"
        style={{ padding: "7rem 0" }}
      >
        <div className={styles.container}>
          <div
            className={styles.sectionHeader}
            style={{ marginBottom: "4rem" }}
          >
            <div className={styles.tealTitleWrapper}>
              <span className={styles.titleLine}></span>
              <h2 className={styles.tealTitle}>About Us</h2>
              <span className={styles.titleLine}></span>
            </div>
            <p className={styles.tealDesc}>
              BuyFacts is a framework of methods and tools designed to help
              organizations recognize meaningful movement earlier, reduce
              uncertainty, and improve Return on Effort through faster, easier,
              and better research.
            </p>
          </div>

          {/* 3 Team Profile Cards */}
          <div className={styles.teamGrid}>
            <div className={styles.memberCard} id="team-member-guduspa">
              <div className={styles.imageWrapper}>
                <img
                  src="/guduspa.jpg"
                  alt="Guduspa Kumar"
                  className={styles.memberImg}
                />
              </div>
              <div className={styles.memberInfo}>
                <h3 className={styles.memberName}>Guduspa Kumar</h3>
                <span className={styles.memberRole}>
                  Analysis and Analytics
                </span>
                <p className={styles.memberBio}>
                  Guduspa translates raw data patterns into predictive models.
                  He designs quantitative scoring mechanisms to visualize B2B
                  buyer intent.
                </p>
              </div>
            </div>

            <div className={styles.memberCard} id="team-member-robert">
              <div className={styles.imageWrapper}>
                <img
                  src="/robert.jpg"
                  alt="Robert M Johnson"
                  className={styles.memberImg}
                />
              </div>
              <div className={styles.memberInfo}>
                <h3 className={styles.memberName}>Robert M Johnson</h3>
                <span className={styles.memberRole}>
                  Survey Methods and Tools
                </span>
                <p className={styles.memberBio}>
                  Robert designs robust, bias-free questionnaires. He develops
                  frameworks that ensure quantitative datasets align with
                  commercial research guidelines.
                </p>
              </div>
            </div>

            <div className={styles.memberCard} id="team-member-bernie">
              <div className={styles.imageWrapper}>
                <img
                  src="/bernie.jpg"
                  alt="Bernie Rudolph"
                  className={styles.memberImg}
                />
              </div>
              <div className={styles.memberInfo}>
                <h3 className={styles.memberName}>Bernie Rudolph</h3>
                <span className={styles.memberRole}>
                  Survey Hosting and Research Quality
                </span>
                <p className={styles.memberBio}>
                  Bernie supervises secure cloud servers and routing mechanisms.
                  He conducts strict quality control protocols for every
                  participant panel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Contact Us Form Section */}
      <section className={styles.section} id="contact">
        <div className={styles.container}>
          <div className={styles.contactGrid}>
            <div className={styles.contactInfo}>
              <div>
                <span className={styles.sectionTagline}>Get In Touch</span>
                <h2 className={styles.contactHeaderTitle}>
                  Connect with Our Team
                </h2>
                <p className={styles.contactHeaderDesc}>
                  Have questions about the BuyFacts® framework, Cubicon™, or
                  TRIAD™ tools? Let us help you map your B2B research challenges
                  to high-impact analytical systems.
                </p>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className={styles.infoTextTitle}>Email Address</h4>
                  <p className={styles.infoTextVal}>inquiries@buyfacts.com</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className={styles.infoTextTitle}>
                    Corporate Head Office
                  </h4>
                  <p className={styles.infoTextVal}>
                    BuyFacts Research Group LLC
                    <br />
                    Financial Center, Suite 1100
                    <br />
                    New York, NY 10005
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="glass-card" style={{ padding: "3rem" }}>
              <form
                onSubmit={handleSubmit}
                className={styles.contactForm}
                id="contact-form"
              >
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>
                    Full Name{" "}
                    <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
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
                    <User
                      size={16}
                      style={{
                        position: "absolute",
                        left: "1.2rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-dim)",
                      }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>
                    Business Email{" "}
                    <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
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
                    <Mail
                      size={16}
                      style={{
                        position: "absolute",
                        left: "1.2rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-dim)",
                      }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="company" className={styles.label}>
                    Company / Organization
                  </label>
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
                    <Building2
                      size={16}
                      style={{
                        position: "absolute",
                        left: "1.2rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-dim)",
                      }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="interest" className={styles.label}>
                    Area of Interest
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      id="interest"
                      name="interest"
                      value={formState.interest}
                      onChange={handleInputChange}
                      className={styles.input}
                      style={{
                        width: "100%",
                        paddingLeft: "2.8rem",
                        appearance: "none",
                      }}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Cubicon Methodology">
                        Cubicon™ Framework
                      </option>
                      <option value="TRIAD Survey Design">
                        TRIAD™ Survey Tools
                      </option>
                      <option value="Rule of Three Validation">
                        Rule of Three® Consultation
                      </option>
                      <option value="Survey Hosting Services">
                        Survey Hosting & Auditing
                      </option>
                      <option value="Founding Client Offer">
                        Founding Client Offer
                      </option>
                    </select>
                    <FileText
                      size={16}
                      style={{
                        position: "absolute",
                        left: "1.2rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-dim)",
                      }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.label}>
                    Your Message{" "}
                    <span style={{ color: "var(--primary-color)" }}>*</span>
                  </label>
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
                    <MessageSquare
                      size={16}
                      style={{
                        position: "absolute",
                        left: "1.2rem",
                        top: "1.1rem",
                        color: "var(--text-dim)",
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary submitBtn"
                  id="contact-submit-btn"
                >
                  {isSubmitting ? "Sending Inquiry..." : "Submit Inquiry"}{" "}
                  <Send size={16} />
                </button>

                {formStatus.type && (
                  <div
                    className={`${styles.formStatus} ${formStatus.type === "success" ? styles.formStatusSuccess : styles.formStatusError}`}
                  >
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
