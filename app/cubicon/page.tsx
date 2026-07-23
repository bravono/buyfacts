"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ShieldCheck,
  Bot,
  UserCheck,
  Award,
  Zap,
  Gift,
  Star,
  CheckCircle2,
  Send,
  AlertCircle,
  FileCheck,
  Calculator,
  User,
  Mail,
  Phone,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  RotateCcw,
  ExternalLink,
  Box,
  ClipboardList,
} from "lucide-react";
import styles from "./cubicon.module.css";

// Interface definitions for the contact areas from the Excel spreadsheet
interface OptionItem {
  label: string;
  factor: number;
}

interface AreaDefinition {
  id: string;
  name: string;
  weight: number;
  options: OptionItem[];
}

const CONTACT_AREAS: AreaDefinition[] = [
  {
    id: "interest",
    name: "Interest",
    weight: 45,
    options: [
      { label: "Self-Help", factor: 0.5 },
      { label: "Contribution", factor: 0.5 },
      { label: "Access to Research", factor: 0.5 },
      { label: "Confirmation", factor: 0.2 },
      { label: "Topical Idea", factor: 0.0 },
      { label: "Other", factor: 0.2 },
    ],
  },
  {
    id: "need",
    name: "Need",
    weight: 20,
    options: [
      { label: "Clarify", factor: 0.6 },
      { label: "Simplify", factor: 0.7 },
      { label: "Additional Detail", factor: 0.4 },
      { label: "Best Practices", factor: 0.7 },
      { label: "Become a Site Maven", factor: 0.5 },
      { label: "Other", factor: 0.2 },
    ],
  },
  {
    id: "source",
    name: "Source",
    weight: 5,
    options: [
      { label: "Email Invite", factor: 0.1 },
      { label: "Blog Posting", factor: 0.7 },
      { label: "Peer Referral", factor: 0.3 },
      { label: "Search Engine", factor: 0.2 },
      { label: "Press Article", factor: 0.8 },
      { label: "Other", factor: 0.2 },
    ],
  },
  {
    id: "profile",
    name: "Profile",
    weight: 5,
    options: [
      { label: "Self", factor: 0.6 },
      { label: "Company", factor: 0.5 },
      { label: "Publisher", factor: 0.2 },
      { label: "Press", factor: 0.9 },
      { label: "Consultant", factor: 0.2 },
      { label: "Other", factor: 0.2 },
    ],
  },
  {
    id: "history",
    name: "History",
    weight: 5,
    options: [
      { label: "Experienced Researcher", factor: 0.7 },
      { label: "Analytical Expertise", factor: 0.3 },
      { label: "Survey Author", factor: 0.8 },
      { label: "Member", factor: 0.3 },
      { label: "Ongoing Conversation", factor: 0.3 },
      { label: "Other", factor: 0.2 },
    ],
  },
  {
    id: "goal",
    name: "Goal",
    weight: 20,
    options: [
      { label: "Promote Idea", factor: 0.9 },
      { label: "Sell Something", factor: 0.7 },
      { label: "Add a Topic", factor: 0.2 },
      { label: "Just Comment", factor: 0.4 },
      { label: "Notify Us", factor: 0.2 },
      { label: "Other", factor: 0.2 },
    ],
  },
];

// Weighting multiple lookup based on count of items selected in an area
const WEIGHTING_MULTIPLES: Record<number, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.5,
  4: 1.1,
  5: 0.4,
  6: 0.3,
};

export default function CubiconPage() {
  const [activeTab, setActiveTab] = useState<"app" | "register">("app");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    emailConfirm: "",
    urgency: "Medium",
    requestConfirmation: true,
    isEighteen: false,
  });

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >({
    interest: [],
    need: [],
    source: [],
    profile: [],
    history: [],
    goal: [],
  });

  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle checkbox option in an area
  const toggleOption = (areaId: string, label: string) => {
    setSelectedOptions((prev) => {
      const currentArea = prev[areaId] || [];
      const updated = currentArea.includes(label)
        ? currentArea.filter((item) => item !== label)
        : [...currentArea, label];
      return { ...prev, [areaId]: updated };
    });
  };

  // Compute B2B Priority Score dynamically based on selected options
  const computePriorityScore = (): number => {
    let totalScore = 0;

    CONTACT_AREAS.forEach((area) => {
      const selectedLabels = selectedOptions[area.id] || [];
      const count = selectedLabels.length;

      if (count > 0) {
        const multiple = WEIGHTING_MULTIPLES[count] || 1.0;
        let sumFactors = 0;

        selectedLabels.forEach((lbl) => {
          const opt = area.options.find((o) => o.label === lbl);
          if (opt) {
            sumFactors += opt.factor;
          }
        });

        const avgFactor = sumFactors / count;
        const areaTally = multiple * avgFactor * area.weight;
        totalScore += areaTally;
      }
    });

    return Math.round(totalScore * 10) / 10;
  };

  const priorityScore = computePriorityScore();

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormState((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormState((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.firstName || !formState.lastName || !formState.email) {
      setFormStatus({
        type: "error",
        message: "Please fill out all required personal fields.",
      });
      return;
    }

    if (
      formState.email.trim().toLowerCase() !==
      formState.emailConfirm.trim().toLowerCase()
    ) {
      setFormStatus({
        type: "error",
        message: "The entered email addresses do not match.",
      });
      return;
    }

    if (!formState.isEighteen) {
      setFormStatus({
        type: "error",
        message: "You must certify that you are 18 years of age or older.",
      });
      return;
    }

    setIsSubmitting(true);
    setFormStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/cubicon-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          selectedAreas: selectedOptions,
          priorityScore,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFormStatus({
          type: "success",
          message:
            "Thank you! Your Cubicon Founding Client registration has been submitted successfully.",
        });
        setFormState({
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          emailConfirm: "",
          urgency: "Medium",
          requestConfirmation: true,
          isEighteen: false,
        });
        setSelectedOptions({
          interest: [],
          need: [],
          source: [],
          profile: [],
          history: [],
          goal: [],
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
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reloadApp = () => {
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div className={styles.main}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <Sparkles size={16} /> Interactive 3D Validation Technology
            </div>
            <h1 className={styles.heroTitle}>
              CUBICON 3D <span className={styles.heroHighlight}>VALIDATION APP</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Experience Cubicon&apos;s revolutionary 3D visual validation system. Designed to ensure
              100% genuine human survey participation by deploying interactive 3D spatial tasks that automated bots are incapable of solving.
            </p>

            {/* View Switcher Tabs */}
            <div className={styles.viewSwitcher}>
              <button
                className={`${styles.tabBtn} ${activeTab === "app" ? styles.activeTabBtn : ""}`}
                onClick={() => setActiveTab("app")}
              >
                <Box size={18} /> Interactive 3D App
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === "register" ? styles.activeTabBtn : ""}`}
                onClick={() => setActiveTab("register")}
              >
                <ClipboardList size={18} /> Founding Client Invitation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive App Viewport Section */}
      {activeTab === "app" && (
        <section className={styles.appViewportSection}>
          <div className={styles.container}>
            <div className={styles.appFrameWrapper}>
              <div className={styles.appFrameHeader}>
                <div className={styles.appTitleGroup}>
                  <span className={styles.liveIndicator}>
                    <span className={styles.pulseDot}></span> LIVE 3D ENGINE
                  </span>
                  <span style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)", fontWeight: 500 }}>
                    Cubicon Interactive Spatial Solver v1.0
                  </span>
                </div>
                <div className={styles.appControls}>
                  <button className={styles.controlBtn} onClick={reloadApp} title="Reload 3D App">
                    <RotateCcw size={14} /> Restart Scene
                  </button>
                  <button className={styles.controlBtn} onClick={toggleFullscreen} title="Toggle Fullscreen">
                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>
                  <a
                    href="/cubicon-app/index.html"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.controlBtn}
                    title="Open in new window"
                  >
                    <ExternalLink size={14} /> Launch Standalone
                  </a>
                </div>
              </div>

              {/* Embedded Deployed Cubicon App */}
              <iframe
                key={iframeKey}
                src="/cubicon-app/index.html"
                title="Cubicon 3D Interactive App"
                className={`${styles.appIframe} ${isFullscreen ? styles.appIframeFullscreen : ""}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        </section>
      )}

      {/* WHY WE CREATED CUBICON */}
      <section className="section-light" style={{ padding: "6rem 0" }}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>RATIONALE &amp; MISSION</span>
            <h2 className={styles.sectionTitle}>Why We Created Cubicon</h2>
            <p className={styles.sectionDesc}>
              Organizations are placing increasing reliance on online research. Before organizations can place confidence in what people say, there must be confidence that people, rather than automated bots, are the participants.
            </p>
          </div>

          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <div
                className={styles.cardIconCircle}
                style={{ background: "rgba(234, 66, 95, 0.1)", color: "#ea425f" }}
              >
                <Bot size={28} />
              </div>
              <h3 className={styles.cardTitle}>Eliminate Automated Bots</h3>
              <p className={styles.cardText}>
                Automated bots skew survey datasets and destroy research integrity. Traditional CAPTCHA tests are failing to stop modern scripted bots from polluting commercial panels.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div
                className={styles.cardIconCircle}
                style={{ background: "rgba(20, 163, 139, 0.1)", color: "#14a38b" }}
              >
                <UserCheck size={28} />
              </div>
              <h3 className={styles.cardTitle}>Visual Validation Methods</h3>
              <p className={styles.cardText}>
                Cubicon improves human survey participation through visual validation methods that automated bots are incapable of evaluating.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div
                className={styles.cardIconCircle}
                style={{ background: "rgba(255, 153, 0, 0.1)", color: "var(--interactive-orange)" }}
              >
                <Award size={28} />
              </div>
              <h3 className={styles.cardTitle}>Real Data from Real People</h3>
              <p className={styles.cardText}>
                Ensure 100% confidence in your strategic decisions by basing them on validated, high-fidelity responses from genuine human participants.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDING CLIENT BENEFITS */}
      <section className="section-brand-bg" style={{ padding: "6rem 0" }}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>EXCLUSIVE PRIVILEGES</span>
            <h2 className={styles.sectionTitle}>Founding Client Benefits</h2>
            <p className={styles.sectionDesc}>
              As an early founding partner, your organization will receive lifetime preferential rate locks and custom evaluation tools.
            </p>
          </div>

          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <span className={styles.benefitBadge}>PERMANENT</span>
              <div className={styles.benefitIcon}>
                <Zap size={32} />
              </div>
              <h3 className={styles.benefitTitle}>30% Permanent Wholesale Price</h3>
              <p className={styles.benefitDesc}>
                Lock in permanent wholesale pricing 30% below current and future Cubicon commercial list prices.
              </p>
            </div>

            <div className={styles.benefitCard}>
              <span className={styles.benefitBadge}>EVALUATION</span>
              <div className={styles.benefitIcon}>
                <Gift size={32} />
              </div>
              <h3 className={styles.benefitTitle}>Real-World Taste Test</h3>
              <p className={styles.benefitDesc}>
                A taste test including one use with an upcoming survey or online activity, allowing you to evaluate Cubicon under real-world conditions using your own project.
              </p>
            </div>

            <div className={styles.benefitCard}>
              <span className={styles.benefitBadge}>REFERRAL BONUS</span>
              <div className={styles.benefitIcon}>
                <Star size={32} />
              </div>
              <h3 className={styles.benefitTitle}>Free Additional Survey Test</h3>
              <p className={styles.benefitDesc}>
                One additional free survey validation test for introducing a new corporate client to Cubicon after a paid survey validation.
              </p>
            </div>

            <div className={styles.benefitCard}>
              <span className={styles.benefitBadge}>INNOVATION</span>
              <div className={styles.benefitIcon}>
                <Award size={32} />
              </div>
              <h3 className={styles.benefitTitle}>Priority Access</h3>
              <p className={styles.benefitDesc}>
                Priority access to future Cubicon enhancements and other BuyFacts innovations before general market release.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDATION CLIENT REQUIREMENTS */}
      <section className="section-light" style={{ padding: "6rem 0" }}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>QUALIFICATION CRITERIA</span>
            <h2 className={styles.sectionTitle}>Founding Client Requirements</h2>
            <p className={styles.sectionDesc}>
              We are accepting a limited cohort of founding clients based on the following criteria:
            </p>
          </div>

          <div className={styles.requirementsGrid}>
            <div className={styles.reqCard}>
              <div className={styles.reqNumber}>01</div>
              <h3 className={styles.reqTitle}>US Headquartered B2B Organization</h3>
              <p className={styles.reqDesc}>
                Registration is open to US headquartered B2B organizations looking to protect survey data validity.
              </p>
            </div>

            <div className={styles.reqCard}>
              <div className={styles.reqNumber}>02</div>
              <h3 className={styles.reqTitle}>$100 Trial Taste Test Investment</h3>
              <p className={styles.reqDesc}>
                $100 investment to complete the trial test taste survey. <strong>The $100 fee is fully refundable on request if Cubicon does not uncover at least 10% automated bots</strong> among your survey participants. (In tests to date, bot participation often exceeded 30%).
              </p>
            </div>

            <div className={styles.reqCard}>
              <div className={styles.reqNumber}>03</div>
              <h3 className={styles.reqTitle}>60-Day Start Requirement</h3>
              <p className={styles.reqDesc}>
                Survey or online research project must begin within 60 days of registration to qualify for the founding client benefits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* REGISTRATION FORM SECTION */}
      <section className="section-brand-bg" id="register-form" style={{ padding: "6rem 0" }}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>APPLY NOW</span>
            <h2 className={styles.sectionTitle}>Founding Client Registration</h2>
            <p className={styles.sectionDesc}>
              Please complete your contact information and select your contact areas below to calculate your respondent priority score and register for the Cubicon Founding Client invitation.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "2.5rem", alignItems: "start" }}>
            {/* Main Form */}
            <div className={styles.formContainer}>
              <form onSubmit={handleSubmit} id="cubicon-registration-form">
                {/* Personal Information */}
                <h3 style={{ fontSize: "1.25rem", color: "var(--interactive-blue)", marginBottom: "1.5rem" }}>
                  1. Contact Information
                </h3>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="firstName" className={styles.label}>
                      First Name <span style={{ color: "var(--primary-color)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formState.firstName}
                      onChange={handleInputChange}
                      placeholder="e.g. John"
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="lastName" className={styles.label}>
                      Last Name <span style={{ color: "var(--primary-color)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formState.lastName}
                      onChange={handleInputChange}
                      placeholder="e.g. Smith"
                      className={styles.input}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                      Email Address <span style={{ color: "var(--primary-color)" }}>*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formState.email}
                      onChange={handleInputChange}
                      placeholder="john@company.com"
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="emailConfirm" className={styles.label}>
                      Re-enter Email <span style={{ color: "var(--primary-color)" }}>*</span>
                    </label>
                    <input
                      type="email"
                      id="emailConfirm"
                      name="emailConfirm"
                      value={formState.emailConfirm}
                      onChange={handleInputChange}
                      placeholder="Re-enter your email"
                      className={styles.input}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="phone" className={styles.label}>
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formState.phone}
                      onChange={handleInputChange}
                      placeholder="(555) 000-0000"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="urgency" className={styles.label}>
                      Urgency
                    </label>
                    <select
                      id="urgency"
                      name="urgency"
                      value={formState.urgency}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div style={{ margin: "1.5rem 0", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="requestConfirmation"
                      checked={formState.requestConfirmation}
                      onChange={handleInputChange}
                      className={styles.checkbox}
                    />
                    <span>Request confirmation of receipt via email</span>
                  </label>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="isEighteen"
                      checked={formState.isEighteen}
                      onChange={handleInputChange}
                      className={styles.checkbox}
                      required
                    />
                    <span>
                      I certify that I am eighteen (18) years old or older <span style={{ color: "var(--primary-color)" }}>*</span>
                    </span>
                  </label>
                </div>

                <hr style={{ margin: "2.5rem 0", borderColor: "var(--border-color)" }} />

                {/* Contact Areas (Excel Grid) */}
                <h3 style={{ fontSize: "1.25rem", color: "var(--interactive-blue)", marginBottom: "0.5rem" }}>
                  2. Contact Areas &amp; Priorities
                </h3>
                <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                  Check all elements that apply to your organization. Multiple selections adjust factors automatically according to the BuyFacts weighting model.
                </p>

                {CONTACT_AREAS.map((area) => (
                  <div key={area.id} className={styles.areaSection}>
                    <div className={styles.areaHeader}>
                      <span className={styles.areaTitle}>{area.name}</span>
                      <span className={styles.areaWeightBadge}>Area Weight: {area.weight}</span>
                    </div>

                    <div className={styles.optionsGrid}>
                      {area.options.map((opt) => {
                        const isChecked = (selectedOptions[area.id] || []).includes(opt.label);
                        return (
                          <label key={opt.label} className={styles.optionItem}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOption(area.id, opt.label)}
                              className={styles.checkbox}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "1.1rem", fontSize: "1.1rem", marginTop: "1rem" }}
                  id="submit-cubicon-form"
                >
                  {isSubmitting ? "Submitting Registration..." : "REGISTER AS FOUNDING CLIENT"}{" "}
                  <Send size={18} />
                </button>

                {formStatus.type && (
                  <div
                    className={
                      formStatus.type === "success"
                        ? styles.formStatusSuccess
                        : styles.formStatusError
                    }
                  >
                    {formStatus.message}
                  </div>
                )}
              </form>
            </div>

            {/* Priority Score Sidebar Card */}
            <div>
              <div className={styles.scoreStickyCard}>
                <Calculator size={36} style={{ color: "var(--interactive-orange)", margin: "0 auto" }} />
                <div className={styles.scoreLabel}>RESPONDENT PRIORITY SCORE</div>
                <div className={styles.scoreValue}>{priorityScore}</div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)", lineHeight: "1.5" }}>
                  Calculated in real-time from your selected contact areas using the BuyFacts model.
                </p>

                <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.15)", textAlign: "left", fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.85)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    <CheckCircle2 size={16} style={{ color: "var(--interactive-orange)" }} /> 100% Refundable Guarantee
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    <CheckCircle2 size={16} style={{ color: "var(--interactive-orange)" }} /> US B2B Headquartered
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle2 size={16} style={{ color: "var(--interactive-orange)" }} /> 60-Day Start Window
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
