"use client";
import TenetsExplorer from "@/components/TenetsExplorer";

import React, { useState } from "react";
import ComingSoon from "./ComingSoon";
import Navbar from "@/components/Navbar";
import InteractiveSceneDeck from "@/components/InteractiveSceneDeck";
import Footer from "@/components/Footer";
import {
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
  ArrowRight,
} from "lucide-react";
import styles from "./page.module.css";
import TripletButtonGroup, { TripletButtonItem } from "@/components/TripletButton";

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Coming Soon mode.
// Set to false (and set COMING_SOON=false in middleware.ts) to show the full site.
// ─────────────────────────────────────────────────────────────────────────────
const COMING_SOON = false;

interface ServiceCardData {
  id: string;
  title: string;
  subTitle: string;
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  showMoreDetails?: boolean;
  moreDetailsUrl?: string;
}

export default function Home() {
  if (COMING_SOON) return <ComingSoon />;
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
    interest: "General Inquiry",
    isEighteen: false,
  });
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Hero Triplet Button Pathways
  const heroTripletButtons: TripletButtonItem[] = [
    {
      id: "early-recognition",
      title: "Early Recognition",
      tagline: "What is beginning to matter?",
      href: "/products-services",
      theme: "orange",
      fallbackIcon: <TrendingUp size={20} />,
      iconUrl: "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1789469826637-6ip5wl-Early_Recognition_Locon_APPROVED.png", // Ready for CDN icon URL
      actionHint: "Explore Recognition",
    },
    {
      id: "story-based-research",
      title: "Story-Based Research",
      tagline: "What can we learn from people who actually know and experience it?",
      href: "/research-imperatives",
      theme: "blue",
      fallbackIcon: <FileText size={20} />,
      iconUrl: "", // Ready for CDN icon URL
      actionHint: "Explore Research",
    },
    {
      id: "triad",
      title: "TRIAD",
      tagline: "How can we capture differences in perspective so patterns can emerge?",
      href: "/products-services#triad",
      theme: "purple",
      fallbackIcon: <Compass size={20} />,
      iconUrl: "", // Ready for CDN icon URL
      actionHint: "Explore TRIAD",
    },
  ];

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
      subTitle: "Confirm That Survey Participants Are Real People",
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
    if (!formState.name.trim() || !formState.email.trim() || !formState.message.trim()) {
      setFormStatus({
        type: "error",
        message: "Please fill out all required fields (Name, Email, Message).",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formState.email.trim())) {
      setFormStatus({
        type: "error",
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (!formState.isEighteen) {
      setFormStatus({
        type: "error",
        message: "You must certify that you are 18 years of age or older to submit this form.",
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
        if (data.verificationRequired) {
          setPendingVerificationEmail(formState.email.trim());
          setFormStatus({
            type: "success",
            message: data.message || `Please check your email at ${formState.email} to verify your inquiry. Inquiries are valid for 24 hours.`,
          });
        } else {
          const firstName = formState.name.trim().split(" ")[0] || "there";
          setFormStatus({
            type: "success",
            message: `Thank you, ${firstName}! We've received your message. Our team has taken note of your request and will review it promptly to follow up with you.`,
          });
        }
        setFormState({
          name: "",
          email: "",
          company: "",
          message: "",
          interest: "General Inquiry",
          isEighteen: false,
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

  const handleResend = async () => {
    if (!pendingVerificationEmail) return;
    setResendStatus("Sending new verification link...");
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerificationEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendStatus("New verification link dispatched! Check your inbox.");
      } else {
        setResendStatus(data.error || "Failed to resend verification email.");
      }
    } catch {
      setResendStatus("Network error. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormState((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormState((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className={styles.main}>
      {/* Decorative Glow Blobs */}
      <div className="glow-blob blob-green"></div>
      <div className="glow-blob blob-blue"></div>

      <Navbar />

      {/* SECTION 1: Hero Section */}
      <InteractiveSceneDeck>
<section id="home" data-title="Home" data-bg="#ffffff" className={styles.hero}>
        <div className={styles.heroContent}>
        <div className="grid-bg"></div>
        <div className={styles.heroCrowdOverlay}></div>

        <div className={styles.container}>
          <div className={`${styles.heroContent} animate-fade-in-up`}>
            <h1 className={styles.heroTitle}>
              The Early <span className={styles.heroHighlight}>Recognition</span> Company
            </h1>
            <p className={styles.heroSubtitle}>
              Saving You Time So You{" "}
              <span className={styles.heroSubtitleHighlight}>Have the Time</span>
            </p>
            {/* Reusable Vibrant Triplet Button Group with brief text below */}
            <TripletButtonGroup items={heroTripletButtons} />
          </div>
        </div>

        <div style={{ marginTop: "clamp(16px, 3vh, 36px)", display: "flex", justifyContent: "center", width: "100%" }}>
        <button 
          onClick={() => {
            const el = document.getElementById("roberts-way");
            if (el) el.scrollIntoView({ behavior: "smooth" });
            window.location.hash = "#roberts-way";
          }}
          aria-label="Scroll down to Robert's Way"
          style={{ 
            width: "clamp(34px, 4.5vh, 42px)", 
            height: "clamp(34px, 4.5vh, 42px)", 
            borderRadius: "50%", 
            backgroundColor: "#FFFFFF", 
            border: "1px solid #CBD5E1", 
            boxShadow: "0 4px 12px rgba(0,80,123,0.12)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            cursor: "pointer"
          }}
        >
          <ChevronDown size={18} color="#00507B" />
        </button>
      </div>
      </div>
      
      </section>

      {/* SRA Color Spectrum & Robert's Way Ten Tenets */}
      <section id="roberts-way" data-title="Robert's Way" data-bg="#F8FAFC" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TenetsExplorer />
      </section>

      {/* SECTION 2: A Thought Leadership Portfolio (8 Cards Grid) */}
      <section id="portfolio" data-title="Portfolio" data-bg="#ffffff" className={styles.portfolio}>
          <div className={styles.portfolioInner}>
            <div style={{ textAlign: "center", marginBottom: "clamp(6px, 1.2vh, 12px)" }}>
              <h2 className={styles.sectionTitle}>A Thought Leadership Portfolio</h2>
              <p className={styles.sectionSubtitle}>Proven methods and tools for today's evolving insights and marketing industry.</p>
              
              <div className={styles.tripletWrapper}>
                <span className={styles.tripletBtn} style={{ background: "#00507B", color: "#FFFFFF" }}>REAL DATA.</span>
                <span className={styles.tripletBtn} style={{ background: "#FF9900", color: "#FFFFFF" }}>REAL PEOPLE.</span>
                <span className={styles.tripletBtn} style={{ background: "#64748B", color: "#FFFFFF" }}>REAL INSIGHT.</span>
              </div>
            </div>

            <div className={styles.servicesGrid}>
              {/* Card 1: Innovation */}
              <div className={styles.serviceCard} style={{ border: "1.5px solid #FED7AA" }}>
                <div className={styles.serviceIconWrapper} style={{ background: "#FFF7ED", borderColor: "#EA580C", color: "#EA580C" }}>
                  <Compass size={22} color="#EA580C" />
                </div>
                <h3 className={styles.serviceTitle} style={{ color: "#EA580C" }}>Innovation</h3>
                <p className={styles.serviceDesc}>Creative approaches that lead to new possibilities.</p>
                <a href="/research-imperatives" className={styles.serviceLink} style={{ background: "#FFF7ED", color: "#EA580C", border: "1px solid #FED7AA" }}>
                  MORE DETAILS →
                </a>
              </div>

              {/* Card 2: Leadership */}
              <div className={styles.serviceCard} style={{ border: "1.5px solid #BFDBFE" }}>
                <div className={styles.serviceIconWrapper} style={{ background: "#EFF6FF", borderColor: "#2563EB", color: "#2563EB" }}>
                  <Award size={22} color="#2563EB" />
                </div>
                <h3 className={styles.serviceTitle} style={{ color: "#2563EB" }}>Leadership</h3>
                <p className={styles.serviceDesc}>Strategic guidance that aligns insight with action.</p>
                <a href="/research-imperatives" className={styles.serviceLink} style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>
                  MORE DETAILS →
                </a>
              </div>

              {/* Card 3: Research Tools */}
              <div className={styles.serviceCard} style={{ border: "1.5px solid #99F6E4" }}>
                <div className={styles.serviceIconWrapper} style={{ background: "#F0FDFA", borderColor: "#0D9488", color: "#0D9488" }}>
                  <Search size={22} color="#0D9488" />
                </div>
                <h3 className={styles.serviceTitle} style={{ color: "#0D9488" }}>Research Tools</h3>
                <p className={styles.serviceDesc}>Powerful tools that make research faster and smarter.</p>
                <a href="/research-imperatives" className={styles.serviceLink} style={{ background: "#F0FDFA", color: "#0D9488", border: "1px solid #99F6E4" }}>
                  MORE DETAILS →
                </a>
              </div>

              {/* Card 4: Best Practices */}
              <div className={styles.serviceCard} style={{ border: "1.5px solid #E9D5FF" }}>
                <div className={styles.serviceIconWrapper} style={{ background: "#FAF5FF", borderColor: "#9333EA", color: "#9333EA" }}>
                  <Target size={22} color="#9333EA" />
                </div>
                <h3 className={styles.serviceTitle} style={{ color: "#9333EA" }}>Best Practices</h3>
                <p className={styles.serviceDesc}>Proven methods that deliver better insights.</p>
                <a href="/research-imperatives" className={styles.serviceLink} style={{ background: "#FAF5FF", color: "#9333EA", border: "1px solid #E9D5FF" }}>
                  MORE DETAILS →
                </a>
              </div>

              {/* Card 5: Design */}
              <div className={styles.serviceCard} style={{ border: "1.5px solid #FDE68A" }}>
                <div className={styles.serviceIconWrapper} style={{ background: "#FFFBEB", borderColor: "#D97706", color: "#D97706" }}>
                  <Edit3 size={22} color="#D97706" />
                </div>
                <h3 className={styles.serviceTitle} style={{ color: "#D97706" }}>Design</h3>
                <p className={styles.serviceDesc}>Insightful study designs that drive clarity.</p>
                <a href="/research-imperatives" className={styles.serviceLink} style={{ background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" }}>
                  MORE DETAILS →
                </a>
              </div>

              {/* Card 6: Survey Hosting */}
              <div className={styles.serviceCard} style={{ border: "1.5px solid #BAE6FD" }}>
                <div className={styles.serviceIconWrapper} style={{ background: "#F0F9FF", borderColor: "#0284C7", color: "#0284C7" }}>
                  <Users size={22} color="#0284C7" />
                </div>
                <h3 className={styles.serviceTitle} style={{ color: "#0284C7" }}>Survey Hosting</h3>
                <p className={styles.serviceDesc}>Secure, reliable hosting for every research need.</p>
                <a href="/research-imperatives" className={styles.serviceLink} style={{ background: "#F0F9FF", color: "#0284C7", border: "1px solid #BAE6FD" }}>
                  MORE DETAILS →
                </a>
              </div>

              {/* Card 7: Human Validation */}
              <div className={styles.serviceCard} style={{ border: "1.5px solid #A7F3D0" }}>
                <div className={styles.serviceIconWrapper} style={{ background: "#ECFDF5", borderColor: "#059669", color: "#059669" }}>
                  <ShieldCheck size={22} color="#059669" />
                </div>
                <h3 className={styles.serviceTitle} style={{ color: "#059669" }}>Human Validation</h3>
                <p className={styles.serviceDesc}>Confirm That Survey Participants Are Real People</p>
                <a href="/cubicon" className={styles.serviceLink} style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
                  MORE DETAILS →
                </a>
              </div>

              {/* Card 8: Value */}
              <div className={styles.serviceCard} style={{ border: "1.5px solid #C7D2FE" }}>
                <div className={styles.serviceIconWrapper} style={{ background: "#EEF2FF", borderColor: "#4F46E5", color: "#4F46E5" }}>
                  <TrendingUp size={22} color="#4F46E5" />
                </div>
                <h3 className={styles.serviceTitle} style={{ color: "#4F46E5" }}>Value</h3>
                <p className={styles.serviceDesc}>Delivering measurable results and improved return on effort.</p>
                <a href="/research-imperatives" className={styles.serviceLink} style={{ background: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE" }}>
                  MORE DETAILS →
                </a>
              </div>
            </div>
          </div>
        </section>

      {/* SECTION 2.5: Cubicon Founding Client Invitation Banner */}
      <section
        className="section-brand-bg"
        id="founding-client-banner"
        style={{
          padding: "4rem 0",
          background:
            "linear-gradient(135deg, rgba(0, 80, 123, 0.03) 0%, rgba(255, 153, 0, 0.05) 100%)",
          border: "none",
        }}
      >
        <div className={styles.container}>
          <div
            className="glass-card"
            style={{
              padding: "3.5rem 3rem",
              background: "linear-gradient(135deg, #00507b 0%, #003e60 100%)",
              color: "#ffffff",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 20px 50px rgba(0, 80, 123, 0.25)",
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: "2.5rem",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background Accent Glow */}
            <div
              style={{
                position: "absolute",
                top: "-40%",
                right: "-10%",
                width: "400px",
                height: "400px",
                background:
                  "radial-gradient(circle, rgba(255, 153, 0, 0.25) 0%, transparent 70%)",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />

            <div style={{ flex: "1 1 500px" }}>
              <div
                style={{ width: "100%", border: "none" }}
              >
                <span>EXCLUSIVE INVITATION</span>
              </div>
              <h2
                style={{
                  color: "#ffffff",
                  fontSize: "2.2rem",
                  fontWeight: "700",
                  marginBottom: "1rem",
                  lineHeight: "1.2",
                }}
              >
                Cubicon™ Founding Client Program
              </h2>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "1.05rem",
                  maxWidth: "720px",
                  lineHeight: "1.6",
                }}
              >
                Experience the future of survey participant validation. BuyFacts
                is inviting qualified B2B organizations to become founding users
                of Cubicon&apos;s visual validation methods prior to pending
                commercial launch.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  marginTop: "1.5rem",
                  flexWrap: "wrap",
                  fontSize: "0.95rem",
                  color: "rgba(255, 255, 255, 0.85)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <ShieldCheck
                    size={18}
                    style={{ color: "var(--interactive-orange)" }}
                  />{" "}
                  30% Wholesale Discount
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <ShieldCheck
                    size={18}
                    style={{ color: "var(--interactive-orange)" }}
                  />{" "}
                  Risk-Free Taste Test
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <ShieldCheck
                    size={18}
                    style={{ color: "var(--interactive-orange)" }}
                  />{" "}
                  100% Refund Guarantee
                </div>
              </div>
            </div>

            <div style={{ flex: "0 0 auto" }}>
              <a
                href="/cubicon"
                className="btn btn-primary"
                id="banner-cta-cubicon"
                style={{
                  padding: "1rem 2.2rem",
                  fontSize: "1.05rem",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  boxShadow: "0 10px 25px rgba(255, 153, 0, 0.4)",
                }}
              >
                BECOME A FOUNDING CLIENT <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: About Us (Teal Theme matching Mockup image) */}
      <section id="about" data-title="About Us" data-bg="#F8FAFC" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className={styles.container}>
          <div
            className={styles.sectionHeader}
            style={{ marginBottom: "2rem" }}
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
            
            <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
              <a href="#team" className={styles.btnSecondary}>
                Meet Our Team <ArrowRight size={16} style={{ marginLeft: "0.5rem" }} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Contact Us Form Section */}
              {/* SLIDE 6: OUR TEAM */}
        <section id="team" data-title="Our Team" data-bg="#ffffff" className={styles.teamSection}>
          <div className={styles.teamInner}>
            <div style={{ textAlign: "center", marginBottom: "clamp(8px, 1.5vh, 16px)" }}>
              <h2 className={styles.teamTitle}>Our Team</h2>
              <p className={styles.teamSubtitle}>Meet the methodologists, researchers, and engineers who build BuyFacts.</p>
            </div>
            <div className={styles.teamGrid}>
              {/* Member 1: Guduspa */}
              <div className={styles.teamCard}>
                <div className={styles.teamImageWrapper}>
                  <img src="/guduspa.jpg" alt="Guduspa Kumar" />
                </div>
                <h3 className={styles.teamName}>Guduspa Kumar</h3>
                <div className={styles.teamRole}>Analysis and Analytics</div>
                <p className={styles.teamBio}>
                  Guduspa translates raw data patterns into predictive models. He designs quantitative scoring mechanisms to visualize B2B buyer intent.
                </p>
              </div>

              {/* Member 2: Robert */}
              <div className={styles.teamCard}>
                <div className={styles.teamImageWrapper}>
                  <img src="/robert.jpg" alt="Robert M Johnson" />
                </div>
                <h3 className={styles.teamName}>Robert M Johnson</h3>
                <div className={styles.teamRole}>Survey Methods and Tools</div>
                <p className={styles.teamBio}>
                  Robert designs robust, bias-free questionnaires. He develops frameworks that ensure quantitative datasets align with commercial research guidelines.
                </p>
              </div>

              {/* Member 3: Bernie */}
              <div className={styles.teamCard}>
                <div className={styles.teamImageWrapper}>
                  <img src="/bernie.jpg" alt="Bernie Rudolph" />
                </div>
                <h3 className={styles.teamName}>Bernie Rudolph</h3>
                <div className={styles.teamRole}>Survey Hosting and Research Quality</div>
                <p className={styles.teamBio}>
                  Bernie supervises secure cloud servers and routing mechanisms. He conducts strict quality control protocols for every participant panel.
                </p>
              </div>
            </div>
          </div>
        </section>

      {/* SECTION 5: Our Team (Relocated to the bottom) */}
              {/* SLIDE 7: CONTACT */}
        <section id="contact" data-title="Contact" data-bg="#0A192F" className={styles.contactSection}>
          <div className={styles.contactContainer}>
            <div className={styles.contactLeft}>
              <span style={{ color: "#FF9900", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Get In Touch</span>
              <h2 className={styles.contactTitle}>Connect with Our Team</h2>
              <p className={styles.contactDesc}>
                Have questions about the BuyFacts® framework, Cubicon™, or TRIAD™ tools? Let us help you map your B2B research challenges to high-impact analytical systems.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF9900" }}>
                    <Mail size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Email Address</div>
                    <div style={{ fontSize: "0.82rem", color: "#FFFFFF", fontWeight: 600 }}>inquiries@buyfacts.com</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF9900" }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Corporate Head Office</div>
                    <div style={{ fontSize: "0.82rem", color: "#FFFFFF", fontWeight: 600 }}>BuyFacts, Inc. <span style={{ color: "#64748B", fontWeight: 400 }}>(Delaware Corp)</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.contactFormCard}>
              <form onSubmit={(e) => { e.preventDefault(); alert("Thank you for reaching out! We will contact you shortly."); }} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>FULL NAME *</label>
                  <input type="text" name="name" required placeholder="e.g. Sarah Connor" className={styles.formInput} />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>BUSINESS EMAIL *</label>
                  <input type="email" name="email" required placeholder="e.g. sarah@cyberdyne.com" className={styles.formInput} />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>COMPANY / ORGANIZATION</label>
                  <input type="text" name="company" placeholder="e.g. Cyberdyne Systems" className={styles.formInput} />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>AREA OF INTEREST</label>
                  <select name="interest" className={styles.formSelect}>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Cubicon Validation">Cubicon Validation</option>
                    <option value="Story-Based Research">Story-Based Research</option>
                    <option value="TRIAD Framework">TRIAD Framework</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>YOUR MESSAGE *</label>
                  <textarea name="message" required rows={2} placeholder="Tell us about your research requirements..." className={styles.formTextarea}></textarea>
                </div>

                <label className={styles.checkboxLabel}>
                  <input type="checkbox" required />
                  <span>I certify that I am eighteen (18) years old or older *</span>
                </label>

                <button type="submit"  className={styles.submitBtn}>
                  Submit Inquiry →
                </button>
              </form>
            </div>
          </div>
        </section>

              {/* Scene 6: Contact & Footer */}
                {/* SLIDE 7: CONTACT */}
        {/* SLIDE 8: FOOTER */}
        <section id="footer" data-title="Footer" data-bg="#0A192F" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Footer />
        </section>
      </InteractiveSceneDeck>

</div>
  );
}
