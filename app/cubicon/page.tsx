"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  ChevronLeft,
  ChevronRight,
  Play,
  LogOut,
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

interface SlideItem {
  heading: string;
  image: string;
  description: string;
  details: string;
}

const SLIDES: SlideItem[] = [
  {
    heading: "Introduction to Cubicon",
    image: "/cubicon-app/cubicon_logo.png",
    description: "Welcome to Cubicon",
    details: "In the next 30sec we will show you examples of the Cubicon sequence.",
  },
  {
    heading: "Puzzle 1 of 3",
    image: "/cubicon-app/arts/Puzzle1_explainer.png",
    description: "Who gets concerned by howling?",
    details: "Identify the character concerned by howling. Click and draw a precise circle around the target area on the active front face of the cube to validate your response.",
  },
  {
    heading: "Puzzle 2 of 3",
    image: "/cubicon-app/arts/Puzzle2_explainer.png",
    description: "Who's in line for a change of shirt?",
    details: "Locate the person in line for a change of shirt. Click directly on the target character on the right-side profile face of the cube.",
  },
  {
    heading: "Puzzle 3 of 3",
    image: "/cubicon-app/arts/Puzzle3_explainer.png",
    description: "Who gets concerned by howling?",
    details: "Complete the final validation test. Locate the target character on the back face of the cube and circle them to confirm spatial verification.",
  },
];

export default function CubiconPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  
  const [showLiveApp, setShowLiveApp] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideAnimationKey, setSlideAnimationKey] = useState(0);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1));
    setSlideAnimationKey((prev) => prev + 1);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
    setSlideAnimationKey((prev) => prev + 1);
  };

  const handleSeeLiveClick = () => {
    setShowLiveApp(true);
    
    // Set a tiny timeout to allow React to mount the iframe container before triggering fullscreen.
    // Modern browsers allow fullscreen requests within click handlers even inside short timers.
    setTimeout(() => {
      if (appFrameWrapperRef.current) {
        const elem = appFrameWrapperRef.current;
        const requestMethod = elem.requestFullscreen || 
                              (elem as any).webkitRequestFullscreen || 
                              (elem as any).msRequestFullscreen;
        if (requestMethod) {
          requestMethod.call(elem).catch((err: any) => {
            console.warn("Fullscreen request blocked or failed:", err);
          });
        }
      }
    }, 50);
  };

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
  const [formStep, setFormStep] = useState(1);
  const totalSteps = 3;
  const [showForm, setShowForm] = useState(false);

  const nextStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (formStep === 1) {
      if (!formState.firstName.trim() || !formState.lastName.trim() || !formState.email.trim() || !formState.emailConfirm.trim()) {
        setFormStatus({ type: "error", message: "Please fill out all required fields." });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formState.email.trim())) {
        setFormStatus({ type: "error", message: "Please enter a valid email address." });
        return;
      }
      if (formState.email.trim().toLowerCase() !== formState.emailConfirm.trim().toLowerCase()) {
        setFormStatus({ type: "error", message: "Emails do not match." });
        return;
      }
    } else if (formStep === 2) {
      if (!formState.isEighteen) {
        setFormStatus({ type: "error", message: "You must certify that you are 18 or older." });
        return;
      }
    }
    setFormStatus({ type: null, message: "" });
    setFormStep(prev => prev + 1);
  };

  const prevStep = () => {
    setFormStatus({ type: null, message: "" });
    setFormStep(prev => prev - 1);
  };

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

    if (formStep !== totalSteps) {
      nextStep();
      return;
    }

    if (!formState.firstName.trim() || !formState.lastName.trim() || !formState.email.trim()) {
      setFormStatus({
        type: "error",
        message: "Please fill out all required personal fields (First Name, Last Name, Email).",
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
        message: "You must certify that you are 18 years of age or older to submit this form.",
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

      if (response.ok && data.id) {
        const clientEmail = formState.email.trim();
        const clientName = `${formState.firstName.trim()} ${formState.lastName.trim()}`;
        
        setFormStatus({
          type: "success",
          message: "Registration successful! Redirecting to payment checkout...",
        });

        // Instant automatic redirect to dedicated payment page
        const checkoutUrl = `/payment?registrationId=${encodeURIComponent(data.id)}&email=${encodeURIComponent(clientEmail)}&name=${encodeURIComponent(clientName)}`;
        router.push(checkoutUrl);
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

  const appFrameWrapperRef = React.useRef<HTMLDivElement>(null);

  const reloadApp = () => {
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (appFrameWrapperRef.current && appFrameWrapperRef.current.requestFullscreen) {
        appFrameWrapperRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  };

  const handleExitLiveApp = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
    setShowLiveApp(false);

    setTimeout(() => {
      const benefitsSection = document.getElementById("founding-client-benefits");
      if (benefitsSection) {
        benefitsSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false);
      }
    };

    const handleCubiconMessage = (event: MessageEvent) => {
      if (event.data?.type === "CUBICON_EXIT" || event.data === "CUBICON_EXIT") {
        handleExitLiveApp();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("message", handleCubiconMessage);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("message", handleCubiconMessage);
    };
  }, []);

  return (
    <div className={styles.main}>
      <Navbar hideOnScroll={true} />

      {/* Interactive App Viewport Section */}
      <section className={styles.appViewportSection} style={{ paddingTop: "8rem", paddingBottom: "4rem" }}>
          <div className={styles.container}>
            {!showLiveApp ? (
              <div className={styles.slideshowWrapper}>
                <div key={slideAnimationKey} className={`${styles.slideshowContent} ${styles.slideFadeIn}`}>
                  <div className={styles.slideImageContainer}>
                    <img
                      src={SLIDES[currentSlide].image}
                      alt={SLIDES[currentSlide].heading}
                      className={styles.slideImage}
                    />
                  </div>
                  <div className={styles.slideDetailsContainer}>
                    <div>
                      <h3 className={styles.slideTitle}>{SLIDES[currentSlide].heading}</h3>
                      <p className={styles.slideText}>{SLIDES[currentSlide].details}</p>
                    </div>

                    {currentSlide === SLIDES.length - 1 && (
                      <div className={styles.seeLiveCallout}>
                        <span className={styles.seeLiveTitle}>Experience it yourself</span>
                        <button
                          className={styles.seeLiveBtn}
                          onClick={handleSeeLiveClick}
                          title="Launch Cubicon in 3D Live Screen"
                        >
                          <Play size={18} fill="#ffffff" /> SEE CUBICON LIVE!
                        </button>
                        <span className={styles.seeLiveSubtitle}>
                          Interactive 3D application will launch in full screen
                        </span>
                      </div>
                    )}

                    <div className={styles.slideNavControls}>
                      <button
                        className={styles.slideArrowBtn}
                        onClick={handlePrevSlide}
                        title="Previous Puzzle"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      
                      <div className={styles.slideDots}>
                        {SLIDES.map((_, index) => (
                          <button
                            key={index}
                            className={`${styles.slideDot} ${
                              currentSlide === index ? styles.activeSlideDot : ""
                            }`}
                            onClick={() => {
                              setCurrentSlide(index);
                              setSlideAnimationKey((prev) => prev + 1);
                            }}
                            title={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        className={styles.slideArrowBtn}
                        onClick={handleNextSlide}
                        title="Next Puzzle"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.appFrameWrapper} ref={appFrameWrapperRef}>
                {isFullscreen && (
                  <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000, display: "flex", gap: "10px" }}>
                    <button
                      className={styles.exitFullscreenFloatingBtn}
                      style={{ position: "static" }}
                      onClick={toggleFullscreen}
                      title="Exit Fullscreen Mode"
                    >
                      <Minimize2 size={16} /> Exit Fullscreen
                    </button>
                    <button
                      className={styles.exitFullscreenFloatingBtn}
                      style={{ position: "static", background: "rgba(234, 66, 95, 0.9)", borderColor: "rgba(255, 255, 255, 0.5)" }}
                      onClick={handleExitLiveApp}
                      title="Exit Live Demo and view benefits"
                    >
                      <LogOut size={16} /> Exit Demo
                    </button>
                  </div>
                )}

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
                    <button className={styles.exitBtn} onClick={handleExitLiveApp} title="Exit Live Demo and view benefits">
                      <LogOut size={14} /> Exit
                    </button>
                  </div>
                </div>

                {/* Embedded Deployed Cubicon App */}
                <iframe
                  key={iframeKey}
                  src="/cubicon-app/index.html"
                  title="Cubicon 3D Interactive App"
                  className={`${styles.appIframe} ${isFullscreen ? styles.appIframeFullscreen : ""}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                />
              </div>
            )}
          </div>
        </section>

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
      <section className="section-brand-bg" id="founding-client-benefits" style={{ padding: "6rem 0" }}>
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
              Please complete your contact information and select your contact areas below to register for the Cubicon Founding Client invitation.
            </p>
          </div>

          {!showForm ? (
            <div style={{ textAlign: "center", marginTop: "1rem", marginBottom: "4rem" }}>
              <button 
                onClick={() => setShowForm(true)} 
                className="btn btn-primary" 
                style={{ padding: "1.2rem 2.5rem", fontSize: "1.1rem" }}
              >
                Begin Application (Takes ~1 minute)
              </button>
            </div>
          ) : (
          <div style={{ maxWidth: "800px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr", gap: "2.5rem", alignItems: "start" }}>
            {/* Main Form */}
            <div className={styles.formContainer}>
              <form noValidate onSubmit={handleSubmit} id="cubicon-registration-form">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.25rem", color: "var(--interactive-blue)", margin: 0 }}>
                    {formStep === 1 && "Contact Information"}
                    {formStep === 2 && "Details & Verification"}
                    {formStep === 3 && "Contact Areas & Priorities"}
                  </h3>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.8rem", borderRadius: "20px" }}>
                    Part {formStep} of {totalSteps}
                  </span>
                </div>

                {formStep === 1 && (
                  <>

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
                  </>
                )}

                {formStep === 2 && (
                  <>
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
                  </>
                )}

                {formStep === 3 && (
                  <>
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
                  </>
                )}

                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                  {formStep > 1 && (
                    <button 
                      type="button" 
                      onClick={prevStep} 
                      style={{ padding: "1.1rem", fontSize: "1rem", flex: 1, background: "transparent", border: "1px solid var(--interactive-blue)", color: "var(--interactive-blue)", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
                    >
                      Back
                    </button>
                  )}
                  {formStep < totalSteps ? (
                    <button 
                      key="continue-btn"
                      type="button" 
                      onClick={nextStep} 
                      className="btn btn-primary" 
                      style={{ padding: "1.1rem", fontSize: "1.1rem", flex: 2 }}
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      key="submit-btn"
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary"
                      style={{ padding: "1.1rem", fontSize: "1.1rem", flex: 2 }}
                      id="submit-cubicon-form"
                    >
                      {isSubmitting ? "Submitting..." : "REGISTER AS FOUNDING CLIENT"} <Send size={18} />
                    </button>
                  )}
                </div>

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

          </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
