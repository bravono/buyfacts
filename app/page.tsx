"use client";

import React, { useState, useEffect } from "react";
import ComingSoon from "./ComingSoon";
import Navbar from "@/components/Navbar";
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
  RotateCcw,
  AlertCircle,
  X,
  Video,
} from "lucide-react";
import styles from "./page.module.css";
import TripletButtonGroup, {
  TripletButtonItem,
} from "@/components/TripletButton";

// CDN Video URLs for What Sets Us Apart subsection
const APART_VIDEO_1_CDN =
  "https://s3.buyfacts.com/buyfacts-public-assets/videos/what-sets-us-apart-1.mp4";
const APART_VIDEO_1_FALLBACK =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const APART_VIDEO_2_CDN =
  "https://s3.buyfacts.com/buyfacts-public-assets/videos/what-sets-us-apart-2.mp4";
const APART_VIDEO_2_FALLBACK =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Coming Soon mode.
// Set to false (and set COMING_SOON=false in middleware.ts) to show the full site.
// ─────────────────────────────────────────────────────────────────────────────
const COMING_SOON = false;

interface ServiceCardData {
  id: string;
  title: string;
  icon?: React.ReactNode;
  iconUrl?: string;
  iconColor: string;
  bgColor: string;
}

function ServiceCardIcon({ card }: { card: ServiceCardData }) {
  const [imageError, setImageError] = useState(false);

  if (card.iconUrl && !imageError) {
    return (
      <img
        src={card.iconUrl}
        alt={card.title}
        className={styles.cardCdnIcon}
        onError={() => setImageError(true)}
      />
    );
  }

  return <>{card.icon}</>;
}

export default function Home() {
  if (COMING_SOON) return <ComingSoon />;
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
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
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [apartVideo1Src, setApartVideo1Src] = useState(APART_VIDEO_1_CDN);
  const [apartVideo2Src, setApartVideo2Src] = useState(APART_VIDEO_2_CDN);

  // Hero Triplet Button Pathways
  const heroTripletButtons: TripletButtonItem[] = [
    {
      id: "validate-survey-participants",
      title: "Validate Survey Participants",
      tagline:
        "Cubicon uses puzzle games people enjoy but AI bots hate and fail to solve. In less than a minute, it helps validate human survey participants and protect data accuracy from bot pollution. See It Now",
      href: "/cubicon",
      theme: "orange",
      fallbackIcon: <TrendingUp size={20} />,
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791280079550-qgczbj-Microphone_Loop_Cubicon_Icon.svg", // Ready for CDN icon URL
    },
    {
      id: "faster-digital-asset-creation",
      title: "Faster Digital Asset Creation",
      tagline:
        "Research Libs gives marketers a traditional survey plus a cost-free story-based version that turns survey participants into storytellers. Storyline output adds stories to the facts, supports a twenty-fold increase in message recall, and speeds content creation. See it Now",
      href: "/research-lib",
      theme: "blue",
      fallbackIcon: <FileText size={20} />,
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791280144243-6hokjs-Research_Libs_Logo.svg", // Ready for CDN icon URL
    },
    {
      id: "market-changes-in-real-time",
      title: "Market Changes in Real Time",
      tagline:
        "TRIAD brings earlier recognition of market changes to help marketers stay ahead of competitors and expand their competitive playbook. Three corners and an interactive triangle question reveal directional change and the emotional drivers behind it. See it Now.",
      href: "/triad",
      theme: "purple",
      fallbackIcon: <Compass size={20} />,
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791280144275-6m25ys-Triad_Logo_with_Name_1_.png", // Ready for CDN icon URL
    },
  ];

  // Cubicon Anti-Bot Human Verification State
  const [isVerified, setIsVerified] = useState(false);
  const [verificationSessionId, setVerificationSessionId] = useState<
    string | null
  >(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    status: "idle" | "passed" | "failed";
    message: string;
  }>({ status: "idle", message: "" });
  const [verificationKey, setVerificationKey] = useState(0);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Ref to hold current submission executor to prevent stale closures in event listener
  const submitInquiryRef = React.useRef<(token: string) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "CUBICON_VERIFICATION_COMPLETE") {
        const { sessionId, passed, heading, description } = event.data;
        if (passed) {
          setIsVerified(true);
          setVerificationSessionId(sessionId);
          setVerificationStatus({
            status: "passed",
            message:
              heading || "Verification successful! You are verified as human.",
          });
          // Automatically submit form upon passing verification
          submitInquiryRef.current(sessionId);
        } else {
          setIsVerified(false);
          setVerificationStatus({
            status: "failed",
            message:
              description || "Verification unsuccessful. Please try again.",
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    if (isVerificationModalOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSubmitting) {
          setIsVerificationModalOpen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isVerificationModalOpen, isSubmitting]);

  const handleResetVerification = () => {
    setIsVerified(false);
    setVerificationSessionId(null);
    setVerificationStatus({ status: "idle", message: "" });
    setVerificationKey((prev) => prev + 1);
  };

  // The 8 Portfolio Cards matching Section 2 of the mockup image
  const portfolioCards: ServiceCardData[] = [
    {
      id: "survey-design",
      title: "Survey Design",
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315274750-bri2xa-BuyFacts_Survey_Hosting.svg",
      icon: <Compass size={32} />,
      iconColor: "#14a38b", // Teal
      bgColor: "rgba(20, 163, 139, 0.08)",
    },
    {
      id: "participant-insight-choices",
      title: "Participant Insight Choices",
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315259736-v7irdo-BuyFacts_Early_Recognition.svg",
      icon: <Award size={32} />,
      iconColor: "#e6a100", // Gold/Amber
      bgColor: "rgba(230, 161, 0, 0.08)",
    },
    {
      id: "traditional-story-based-instruments",
      title: "Traditional and Story-based Instruments",
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315269875-46dt5y-BuyFacts_Research_Tools_Concept.svg",
      icon: <Search size={32} />,
      iconColor: "#6d6d6d", // Grey
      bgColor: "rgba(109, 109, 109, 0.08)",
    },
    {
      id: "best-practices",
      title: "Best Practices",
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315259493-khokty-BuyFacts_Best_Practices_Keystone.svg",
      icon: <Target size={32} />,
      iconColor: "#0089d2", // Sky Blue
      bgColor: "rgba(0, 137, 210, 0.08)",
    },
    {
      id: "every-question-maps-to-its-purpose",
      title: "Every Question Maps to Its Purpose",
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315269426-66lkh2-BuyFacts_Question_Design.svg",
      icon: <Edit3 size={32} />,
      iconColor: "#7cb342", // Lime Green
      bgColor: "rgba(124, 179, 66, 0.08)",
    },
    {
      id: "executives-get-peer-comparison-not-coffee-cards",
      title: "Executives Get peer Comparison Not Coffee Cards",
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315281029-irb8ll-BuyFacts_Value_Quantification.svg",
      icon: <Users size={32} />,
      iconColor: "#e57a45", // Coral
      bgColor: "rgba(229, 122, 69, 0.08)",
    },
    {
      id: "a-dual-approach-delivers-stories-backed-by-facts",
      title: "A Dual Approach Delivers Stories Backed by Facts",
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315275105-urqpqf-BuyFacts_Thought_Leadership_TL1.svg",
      icon: <ShieldCheck size={32} />,
      iconColor: "#14a38b", // Teal
      bgColor: "rgba(20, 163, 139, 0.08)",
    },
    {
      id: "inclusive-stakeholder-engagement-reduces-malicious-compliance",
      title: "Inclusive Stakeholder Engagement Reduces Malicious Compliance",
      iconUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/uploads/1791315259585-6u4ucb-BuyFacts_Bot_Detection.svg",
      icon: <TrendingUp size={32} />,
      iconColor: "#ffb039", // Accent Gold
      bgColor: "rgba(255, 176, 57, 0.08)",
    },
  ];

  // Validate required contact form fields before launching verification puzzle
  const validateForm = () => {
    if (
      !formState.firstName.trim() ||
      !formState.lastName.trim() ||
      !formState.email.trim() ||
      !formState.message.trim()
    ) {
      setFormStatus({
        type: "error",
        message:
          "Please fill out all required fields (First Name, Last Name, Business Email, Message).",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formState.email.trim())) {
      setFormStatus({
        type: "error",
        message: "Please enter a valid email address.",
      });
      return false;
    }

    if (!formState.isEighteen) {
      setFormStatus({
        type: "error",
        message:
          "You must certify that you are 18 years of age or older to submit this form.",
      });
      return false;
    }

    return true;
  };

  // Form submission executor
  const executeFormSubmission = async (token: string) => {
    setIsSubmitting(true);
    setFormStatus({ type: null, message: "" });

    try {
      const fullName =
        `${formState.firstName.trim()} ${formState.lastName.trim()}`.trim();
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          name: fullName,
          verificationSessionId: token,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.verificationRequired) {
          setPendingVerificationEmail(formState.email.trim());
          setFormStatus({
            type: "success",
            message:
              data.message ||
              `Please check your email at ${formState.email} to verify your inquiry. Inquiries are valid for 24 hours.`,
          });
        } else {
          const displayFirstName = formState.firstName.trim() || "there";
          setFormStatus({
            type: "success",
            message: `Thank you, ${displayFirstName}! We've received your message. Our team has taken note of your request and will review it promptly to follow up with you.`,
          });
        }
        setFormState({
          firstName: "",
          lastName: "",
          email: "",
          company: "",
          message: "",
          interest: "General Inquiry",
          isEighteen: false,
        });
        setIsVerified(false);
        setVerificationSessionId(null);
        setVerificationStatus({ status: "idle", message: "" });
        setVerificationKey((prev) => prev + 1);
        setIsVerificationModalOpen(false);
      } else {
        setFormStatus({
          type: "error",
          message: data.error || "Something went wrong. Please try again.",
        });
        setIsVerificationModalOpen(false);
      }
    } catch {
      setFormStatus({
        type: "error",
        message: "Network error. Please verify your connection and try again.",
      });
      setIsVerificationModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keep submission ref updated with current formState closure
  useEffect(() => {
    submitInquiryRef.current = executeFormSubmission;
  });

  // Form submission trigger
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isVerified || !verificationSessionId) {
      setFormStatus({ type: null, message: "" });
      setVerificationStatus({ status: "idle", message: "" });
      setIsVerificationModalOpen(true);
      return;
    }

    await executeFormSubmission(verificationSessionId);
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
      <section className={styles.hero} id="hero">
        <div className="grid-bg"></div>
        <div className={styles.heroCrowdOverlay}></div>

        <div className={styles.container}>
          <div className={`${styles.heroContent} animate-fade-in-up`}>
            <h1 className={styles.heroTitle}>
              Marketers Need Earlier{" "}
              <span className={styles.heroHighlight}>Recognition,</span> Better
              Choices, and More Time
            </h1>

            {/* Reusable Vibrant Triplet Button Group with brief text below */}
            <TripletButtonGroup items={heroTripletButtons} />
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

      {/* SECTION 2: Peer Benchmark Incentive Surveys (8 Cards Grid) */}
      <section
        className="section-light"
        id="portfolio"
        style={{ padding: "7rem 0" }}
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitleLight}>
              Peer Benchmark Incentive Surveys
            </h2>
            <p className={styles.sectionDescLight}>
              Real-Time Peer Comparisons. Relevant Insight for Every participant.
            </p>

            {/* Accent Badges matching Mockup image */}
            <div className={styles.badgeRow}>
              <span className={`${styles.badge} ${styles.badgeNavy}`}>
                <span className={styles.badgeDot} />
                Peer Share for Real People
              </span>
              <span className={`${styles.badge} ${styles.badgeBlue}`}>
                <span className={styles.badgeDot} />
                No Cash Incentive Stigma
              </span>
              <span className={`${styles.badge} ${styles.badgeTeal}`}>
                <span className={styles.badgeDot} />
                Participants Provide Accurate Data
              </span>
            </div>

            <div className={styles.calloutBanner}>
              <ShieldCheck size={20} className={styles.calloutIcon} />
              <span className={styles.calloutText}>
                Protect Data Quality - Remove Pay for Participation that Promotes Cash-Grab
                Participation
              </span>
            </div>
          </div>

          {/* 8 Pillar Cards Grid */}
          <div className={styles.servicesGrid}>
            {portfolioCards.map((card, index) => (
              <div
                key={card.id}
                className={styles.serviceCard}
                id={`portfolio-card-${card.id}`}
              >
                {/* Card Header Row: Icon + Sequence Number */}
                <div className={styles.cardHeaderRow}>
                  <div
                    className={styles.iconCircle}
                    style={{
                      color: card.iconColor,
                      backgroundColor: card.bgColor,
                      borderColor: card.iconColor,
                    }}
                  >
                    <ServiceCardIcon card={card} />
                  </div>
                  <span className={styles.cardIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className={styles.cardTitle}>{card.title}</h3>
                <div
                  className={styles.cardAccentBar}
                  style={{ backgroundColor: card.iconColor }}
                />
              </div>
            ))}
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
          borderTop: "1px solid var(--border-color)",
          borderBottom: "1px solid var(--border-color)",
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
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "rgba(255, 153, 0, 0.2)",
                  border: "1px solid var(--interactive-orange)",
                  padding: "0.4rem 1rem",
                  borderRadius: "30px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#ffc164",
                  marginBottom: "1rem",
                }}
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
                href="/cubicon#founding-client"
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
      <section
        className="section-teal-bg"
        id="about"
        style={{ padding: "7rem 0" }}
      >
        <div className={styles.container}>
          <div
            className={styles.sectionHeader}
            style={{ marginBottom: "2rem", maxWidth: "920px" }}
          >
            <div className={styles.tealTitleWrapper}>
              <span className={styles.titleLine}></span>
              <h2 className={styles.tealTitle}>About</h2>
              <span className={styles.titleLine}></span>
            </div>

            {/* Document: Who Is BuyFacts? */}
            <div className={styles.aboutDocument}>
              <h3 className={styles.aboutDocTitle}>Who Is BuyFacts?</h3>

              <p className={styles.aboutLead}>
                BuyFacts is a hybrid research and professional services company
                that combines proprietary time-saving tools and methods with
                directional pattern recognition, human-validated research, and
                story-based evergreen assets to help B2B marketers cut through
                market noise, gain time, and make better competitive decisions.
              </p>

              <div className={styles.aboutDocSection}>
                <p className={styles.aboutParagraph}>
                  We built BuyFacts around a simple reality.
                </p>
                <p className={styles.aboutParagraph}>
                  Marketers are being asked to do more with fewer resources
                  while competing in markets crowded with more data, more
                  content, more messages, and more noise.
                </p>
                <p className={styles.aboutParagraph}>
                  The problem is no longer accessing information.
                </p>
                <p className={styles.aboutParagraph}>
                  The problem is recognizing what matters early enough to do
                  something useful with it.
                </p>
                <p className={styles.aboutParagraph}>
                  That is where BuyFacts comes in.
                </p>
                <p className={styles.aboutParagraph}>
                  We help marketers discover what is changing, identify
                  directional patterns while they are still forming, understand
                  the context behind those patterns, and turn that insight into
                  marketing assets that can be used long after the research
                  itself is complete.
                </p>
              </div>

              <div className={styles.aboutHighlightBlock}>
                <h4 className={styles.aboutHighlightTitle}>
                  The goal is Earlier Recognition.
                </h4>
                <p className={styles.aboutHighlightLead}>
                  Earlier Recognition creates time.
                </p>
                <ul className={styles.aboutTimeList}>
                  <li>Time to understand.</li>
                  <li>Time to evaluate choices.</li>
                  <li>Time to test.</li>
                  <li>
                    Time to act before a change becomes obvious to everyone
                    else.
                  </li>
                </ul>
                <p className={styles.aboutHighlightSummary}>
                  Our methods are designed to reduce the effort required for
                  directional insight, story-based content development, and
                  research-driven marketing assets by at least 50 percent. That
                  time savings matter because resource-constrained marketing
                  organizations rarely need more work. They need better ways to
                  get more value from the work they already do.
                </p>
              </div>

              <div className={styles.aboutDocSection}>
                <p className={styles.aboutParagraph}>
                  BuyFacts combines several proprietary approaches developed
                  from decades of B2B marketing, research, market analysis, and
                  technology experience.
                </p>
                <div className={styles.aboutPillarsGrid}>
                  <div className={styles.aboutPillarItem}>
                    <strong>TRIAD</strong> helps identify directional patterns
                    and emerging movements that affect positioning and messages.
                  </div>
                  <div className={styles.aboutPillarItem}>
                    <strong>Story-based research</strong> adds context by
                    showing what people are thinking, feeling, experiencing, and
                    trying to accomplish behind the data.
                  </div>
                  <div className={styles.aboutPillarItem}>
                    <strong>Human validation</strong> helps confirm that
                    research participants are real people, not bots presenting
                    themselves as respondents.
                  </div>
                  <div className={styles.aboutPillarItem}>
                    <strong>Rule of Three assets</strong> turn findings into
                    concise, reusable, co-branded content designed to make
                    insight easier to understand, remember, share, and use.
                  </div>
                  <div className={styles.aboutPillarItem}>
                    And we apply edutainment where appropriate to make complex
                    ideas more engaging and help vendor offerings stand apart
                    from the volume of sameness buyers encounter every day.
                  </div>
                </div>
              </div>

              <div className={styles.aboutResultBox}>
                <h4 className={styles.aboutResultTitle}>
                  The result is research with a longer life.
                </h4>
                <div className={styles.aboutResultStaccato}>
                  <span>Not simply a report.</span>
                  <span>Not simply another content asset.</span>
                </div>
                <p className={styles.aboutParagraph}>
                  Something marketers can use repeatedly across thought
                  leadership, social media, positioning, demand generation, peer
                  comparison, sales support, and market education.
                </p>
              </div>

              <div className={styles.aboutDocSection}>
                <p className={styles.aboutParagraph}>
                  Our clients bring their own experience, market knowledge, and
                  organizational context.
                </p>
                <p className={styles.aboutParagraph}>
                  BuyFacts adds expertise in directional pattern recognition,
                  research design, interpretation, and activation.
                </p>
                <p className={styles.aboutParagraph}>
                  Together, those capabilities help organizations see what may
                  be developing before it becomes obvious.
                </p>
                <p className={styles.aboutParagraph}>
                  We also believe innovation should not require organizations to
                  destroy what already works.
                </p>
                <p className={styles.aboutParagraph}>
                  BuyFacts is designed around rapid evolution, not wholesale
                  replacement.
                </p>
                <p className={styles.aboutParagraph}>
                  We strengthen proven methods, add new capabilities where they
                  create practical value, and help marketers move forward
                  without asking them to take an unnecessary leap into untested
                  ways of working.
                </p>
                <p className={styles.aboutParagraph}>
                  That matters because innovation should create confidence, not
                  disruption for disruption&apos;s sake.
                </p>
              </div>

              <div className={styles.aboutClosingSection}>
                <p className={styles.aboutParagraph}>
                  BuyFacts began in 2020 and grew from more than four decades of
                  experience across B2B marketing, primary research, survey
                  development and hosting, market analysis, content development,
                  technology markets, and emerging AI applications.
                </p>
                <p className={styles.aboutParagraph}>
                  But experience alone is not the point.
                </p>
                <p className={styles.aboutParagraph}>
                  What matters is what that experience enables us to help
                  clients do:
                </p>
                <p className={styles.aboutImpactQuote}>
                  recognize earlier, gain time, create more choices, and make
                  better competitive decisions.
                </p>
                <p className={styles.aboutFinalCall}>
                  That is why BuyFacts exists.
                </p>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "3rem" }}>
              <a href="#team" className={styles.btnSecondary}>
                Meet Our Team{" "}
                <ArrowRight size={16} style={{ marginLeft: "0.5rem" }} />
              </a>
            </div>
          </div>

          {/* SUBSECTION: What Sets Us Apart */}
          <div id="what-sets-us-apart" className={styles.apartSubsection}>
            <div className={styles.apartHeader}>
              <div className={styles.apartTitleWrapper}>
                <span className={styles.titleLine}></span>
                <h3 className={styles.apartTitle}>What Sets Us Apart</h3>
                <span className={styles.titleLine}></span>
              </div>
              <p className={styles.apartDesc}>
                Explore our innovative approach to research intelligence and
                discovery through CDN-streamed demonstrations.
              </p>
            </div>

            <div className={styles.apartGrid}>
              <div
                className={styles.apartCard}
                id="apart-card-early-recognition"
              >
                <div className={styles.videoWrapper}>
                  <video
                    className={styles.videoPlayer}
                    controls
                    playsInline
                    preload="metadata"
                    src={apartVideo1Src}
                    onError={() => {
                      if (apartVideo1Src !== APART_VIDEO_1_FALLBACK) {
                        setApartVideo1Src(APART_VIDEO_1_FALLBACK);
                      }
                    }}
                    aria-label="Early Recognition and Spatial Intelligence Video"
                  />
                </div>
                <div className={styles.apartCardBody}>
                  <span className={styles.apartBadge}>
                    <Video size={13} /> CDN Video 1
                  </span>
                  <h4 className={styles.apartCardTitle}>
                    Early Recognition &amp; Spatial Intelligence
                  </h4>
                  <p className={styles.apartCardText}>
                    Discover how our dynamic spatial models and real-time
                    telemetry detect emerging market patterns long before
                    traditional linear surveys.
                  </p>
                </div>
              </div>

              <div
                className={styles.apartCard}
                id="apart-card-story-methodology"
              >
                <div className={styles.videoWrapper}>
                  <video
                    className={styles.videoPlayer}
                    controls
                    playsInline
                    preload="metadata"
                    src={apartVideo2Src}
                    onError={() => {
                      if (apartVideo2Src !== APART_VIDEO_2_FALLBACK) {
                        setApartVideo2Src(APART_VIDEO_2_FALLBACK);
                      }
                    }}
                    aria-label="Story-Based Methodology and Return on Effort Video"
                  />
                </div>
                <div className={styles.apartCardBody}>
                  <span className={styles.apartBadge}>
                    <Video size={13} /> CDN Video 2
                  </span>
                  <h4 className={styles.apartCardTitle}>
                    Story-Based Methodology &amp; Return on Effort
                  </h4>
                  <p className={styles.apartCardText}>
                    See how narrative structures and human-centered design
                    dramatically increase participant engagement while reducing
                    total research cycle times.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Contact Us Form Section */}
      <section className={styles.contactSection} id="contact">
        <div className={styles.container}>
          <div className={styles.contactGrid}>
            <div className={styles.contactInfo}>
              <div>
                <h2 className={styles.contactHeaderTitle}>
                  Connect with Our Team
                </h2>
                <p className={styles.contactHeaderDesc}>
                  Have questions about the BuyFacts
                  <sub className={styles.subRegistered}>®</sub> framework,
                  Cubicon™, or TRIAD™ tools? Let us help you map your B2B
                  research challenges to high-impact analytical systems.
                </p>

                <div className={styles.corporateNoticeBanner}>
                  <ShieldCheck
                    size={18}
                    className={styles.corporateNoticeIcon}
                  />
                  <span>
                    {"Email confirmation is required to validate a corporate email address."}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className={`glass-card ${styles.contactCard}`}>
              <form
                noValidate
                onSubmit={handleSubmit}
                className={styles.contactForm}
                id="contact-form"
              >
                <div className={styles.formRowDouble}>
                  <div className={styles.formGroup}>
                    <label htmlFor="firstName" className={styles.label}>
                      First Name{" "}
                      <span style={{ color: "var(--primary-color)" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formState.firstName}
                        onChange={handleInputChange}
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
                    <label htmlFor="lastName" className={styles.label}>
                      Last Name{" "}
                      <span style={{ color: "var(--primary-color)" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formState.lastName}
                        onChange={handleInputChange}
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
                </div>

                <div className={styles.formRowDouble}>
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
                      className={styles.textareaCompact}
                      style={{ width: "100%", paddingLeft: "2.8rem" }}
                      required
                    ></textarea>
                    <MessageSquare
                      size={16}
                      style={{
                        position: "absolute",
                        left: "1.2rem",
                        top: "0.85rem",
                        color: "var(--text-dim)",
                      }}
                    />
                  </div>
                </div>

                <div className={styles.formFooterRow}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      cursor: "pointer",
                      fontSize: "0.88rem",
                      color: "var(--text-main)",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="isEighteen"
                      checked={formState.isEighteen}
                      onChange={handleInputChange}
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "var(--interactive-blue)",
                        cursor: "pointer",
                      }}
                    />
                    <span>
                      I certify that I am eighteen (18) years old or older{" "}
                      <span style={{ color: "var(--primary-color)" }}>*</span>
                    </span>
                  </label>
                  <span className={styles.emailRequirementNote}>
                    <ShieldCheck
                      size={14}
                      style={{ color: "var(--interactive-orange)" }}
                    />
                    {"Email confirmation is required to validate a corporate email address."}
                  </span>
                </div>

                <input
                  type="text"
                  name="hp_website"
                  style={{ display: "none" }}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`btn btn-primary ${isSubmitting ? styles.submitBtnDisabled : ""}`}
                  id="contact-submit-btn"
                  style={{ width: "100%", marginTop: "0.5rem" }}
                >
                  {isSubmitting
                    ? "Submitting Inquiry..."
                    : isVerified
                      ? "Submit Inquiry"
                      : "Complete Puzzle to Submit"}{" "}
                  {isVerified ? <Send size={16} /> : <ShieldCheck size={16} />}
                </button>

                <p className={styles.verificationHint}>
                  <ShieldCheck size={14} /> Clicking submit will open a
                  full-screen 3D verification puzzle to confirm you are human.
                </p>

                {formStatus.type && (
                  <div
                    className={`${styles.formStatus} ${formStatus.type === "success" ? styles.formStatusSuccess : styles.formStatusError}`}
                  >
                    {formStatus.message}
                  </div>
                )}

                {pendingVerificationEmail && (
                  <div
                    style={{
                      marginTop: "1.2rem",
                      padding: "14px 18px",
                      background: "rgba(59, 130, 246, 0.08)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 10px 0",
                        color: "#93c5fd",
                        lineHeight: 1.5,
                      }}
                    >
                      Did not receive the verification email? Check your spam
                      folder or request a new link:
                    </p>
                    <button
                      type="button"
                      onClick={handleResend}
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "5px",
                        padding: "7px 16px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Resend Verification Email
                    </button>
                    {resendStatus && (
                      <p
                        style={{
                          margin: "10px 0 0 0",
                          fontSize: "0.85rem",
                          color: "#e2e8f0",
                        }}
                      >
                        {resendStatus}
                      </p>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Our Team (Relocated to the bottom) */}
      <section
        className={styles.teamSection}
        id="team"
        style={{ padding: "6rem 0" }}
      >
        <div className={styles.container}>
          <div
            className={styles.sectionHeader}
            style={{ marginBottom: "4rem" }}
          >
            <h2 className={styles.sectionTitleLight}>BuyFacts Leadership</h2>
            <p className={styles.sectionDescLight}>
              Four Decades of Marketing and Primary Research Experience.
            </p>
          </div>

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
                  Super Intelligence (SI)
                  <br></br>
                  Analysis and Analytics
                </span>
                <p className={styles.memberBio}>
                  Guduspa translates raw data patterns into predictive models.
                  He designs quantitative Super Intelligence (SI) scoring
                  mechanisms to visualize B2B buyer intent.
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
                  Time Saving Early Recognition <br></br> Tools and Methods
                </span>
                <p className={styles.memberBio}>
                  A Practical Innovator and Serial Maverick with more than a
                  Dozen Successful Innovations
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
                  Survey Hosting and Participant Quality
                </span>
                <p className={styles.memberBio}>
                  Bernie pioneers many survey participant data quality
                  safeguards to manage survey hosting for More Than One Hundred
                  Marketing Teams
                </p>
              </div>
            </div>
          </div>
        </div>
        <h2 className={styles.sectionFooter}>
          A Founding Team of Successful Research Entrepreneurs
        </h2>
      </section>

      {/* Fullscreen Cubicon Anti-Bot Verification Modal */}
      {isVerificationModalOpen && (
        <div
          className={styles.fullscreenModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cubicon-modal-title"
        >
          <div className={styles.modalHeader}>
            <div className={styles.modalHeaderInfo}>
              <ShieldCheck size={24} className={styles.modalHeaderIcon} />
              <div>
                <h3 id="cubicon-modal-title" className={styles.modalTitle}>
                  Human Verification
                </h3>
                <p className={styles.modalSubtitle}>
                  Solve the 3D Cubicon spatial puzzle to verify you are human
                  and submit your inquiry.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isSubmitting) {
                  setIsVerificationModalOpen(false);
                  setVerificationStatus({ status: "idle", message: "" });
                }
              }}
              className={styles.modalCloseBtn}
              title="Cancel and return to form"
              disabled={isSubmitting}
            >
              <X size={16} /> Cancel Verification
            </button>
          </div>

          {verificationStatus.status === "failed" && (
            <div className={styles.modalFailureBar}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <AlertCircle size={18} />
                <span>
                  {verificationStatus.message ||
                    "Verification unsuccessful. Please try again."}
                </span>
              </div>
              <div className={styles.modalFailureActions}>
                <button
                  type="button"
                  onClick={handleResetVerification}
                  className={styles.modalRetryBtn}
                >
                  <RotateCcw size={14} /> Retry Puzzle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVerificationModalOpen(false);
                    setVerificationStatus({ status: "idle", message: "" });
                  }}
                  className={styles.modalReturnBtn}
                >
                  Return to Form
                </button>
              </div>
            </div>
          )}

          <div className={styles.modalIframeContainer}>
            <iframe
              key={verificationKey}
              src="/cubicon-app/index.html?sequence=contact_form"
              title="Cubicon Contact Verification Puzzle"
              className={styles.modalIframe}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />

            {isSubmitting && (
              <div className={styles.modalSubmittingOverlay}>
                <div className={styles.modalSpinner}></div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                  Verification Passed! Submitting Inquiry...
                </div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Please wait while we confirm your message.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
