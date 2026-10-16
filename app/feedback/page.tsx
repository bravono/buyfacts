"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  MessageSquare,
  User,
  Mail,
  Star,
  Send,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import styles from "./feedback.module.css";

const RATING_LABELS: Record<number, string> = {
  1: "Needs Significant Improvement",
  2: "Fair - Room for Improvement",
  3: "Good - Meets Expectations",
  4: "Very Good - High Quality",
  5: "Exceptional Experience",
};

function FeedbackFormContent() {
  const searchParams = useSearchParams();

  const querySessionId = searchParams.get("sessionId") || searchParams.get("session") || "";
  const queryRating = searchParams.get("rating");
  const queryName = searchParams.get("name") || "";
  const queryEmail = searchParams.get("email") || "";

  const initialRating = queryRating && !isNaN(parseInt(queryRating, 10))
    ? Math.max(1, Math.min(5, parseInt(queryRating, 10)))
    : 5;

  const [formState, setFormState] = useState({
    name: queryName,
    email: queryEmail,
    rating: initialRating,
    comment: "",
    sessionId: querySessionId,
    hp_website: "",
  });

  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (querySessionId && !formState.sessionId) {
      setFormState((prev) => ({ ...prev, sessionId: querySessionId }));
    }
    if (queryName && !formState.name) {
      setFormState((prev) => ({ ...prev, name: queryName }));
    }
    if (queryEmail && !formState.email) {
      setFormState((prev) => ({ ...prev, email: queryEmail }));
    }
  }, [querySessionId, queryName, queryEmail, formState.sessionId, formState.name, formState.email]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleRatingClick = (selectedStar: number) => {
    setFormState((prev) => ({ ...prev, rating: selectedStar }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formState.name.trim()) {
      setErrorMessage("Please enter your name so feedback is not anonymous.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formState.email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (formState.comment.trim().length < 3) {
      setErrorMessage("Feedback comment must be at least 3 characters long.");
      return;
    }

    if (formState.comment.trim().length > 3000) {
      setErrorMessage("Feedback comment cannot exceed 3,000 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cubicon-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name.trim(),
          email: formState.email.trim(),
          rating: formState.rating,
          comment: formState.comment.trim(),
          sessionId: formState.sessionId.trim(),
          hp_website: formState.hp_website,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(
          data.error || "Unable to submit feedback. Please try again."
        );
      }
    } catch {
      setErrorMessage(
        "Network connection error. Please verify your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDisplayRating = hoverRating ?? formState.rating;

  if (isSuccess) {
    return (
      <div className={styles.card}>
        <div className={styles.successCard}>
          <div className={styles.successIconWrapper}>
            <CheckCircle2 size={36} />
          </div>
          <h2 className={styles.successTitle}>Thank You for Your Feedback</h2>
          <p className={styles.successText}>
            Your review and sentiment ratings have been successfully recorded.
            Our product and methodology engineering teams review all participant
            commentary to continually improve research precision and experience.
          </p>
          <div className={styles.actionButtonGroup}>
            <Link href="/" className={styles.primaryActionBtn}>
              Back to Home <ArrowRight size={16} />
            </Link>
            <Link href="/cubicon" className={styles.secondaryActionBtn}>
              <Sparkles size={16} /> Launch Cubicon Live
            </Link>
            <button
              onClick={() => {
                setIsSuccess(false);
                setFormState((prev) => ({
                  ...prev,
                  comment: "",
                  rating: 5,
                }));
              }}
              className={styles.secondaryActionBtn}
            >
              <RotateCcw size={16} /> Submit Another Response
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {errorMessage && (
          <div className={`${styles.alertBox} ${styles.alertError}`}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>
            <span>
              Your Rating <span className={styles.requiredStar}>*</span>
            </span>
          </label>
          <div className={styles.starRatingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.starBtn} ${
                  star <= activeDisplayRating ? styles.starActive : ""
                }`}
                onClick={() => handleRatingClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                aria-label={`Rate ${star} out of 5 stars`}
              >
                <Star
                  size={28}
                  fill={star <= activeDisplayRating ? "#f59e0b" : "transparent"}
                />
              </button>
            ))}
            <span className={styles.ratingDescription}>
              {RATING_LABELS[activeDisplayRating] || `${activeDisplayRating} Stars`}
            </span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="feedback-name" className={styles.label}>
            <span>
              Full Name <span className={styles.requiredStar}>*</span>
            </span>
          </label>
          <div className={styles.inputWrapper}>
            <User size={18} className={styles.inputIcon} />
            <input
              type="text"
              id="feedback-name"
              name="name"
              value={formState.name}
              onChange={handleInputChange}
              placeholder="e.g. Jane Doe"
              className={styles.input}
              required
              maxLength={100}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="feedback-email" className={styles.label}>
            <span>
              Email Address <span className={styles.requiredStar}>*</span>
            </span>
          </label>
          <div className={styles.inputWrapper}>
            <Mail size={18} className={styles.inputIcon} />
            <input
              type="email"
              id="feedback-email"
              name="email"
              value={formState.email}
              onChange={handleInputChange}
              placeholder="e.g. jane@example.com"
              className={styles.input}
              required
              maxLength={254}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="feedback-comment" className={styles.label}>
            <span>
              Your Feedback & Commentary{" "}
              <span className={styles.requiredStar}>*</span>
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {formState.comment.length} / 3000
            </span>
          </label>
          <div className={styles.inputWrapper}>
            <MessageSquare size={18} className={styles.textareaIcon} />
            <textarea
              id="feedback-comment"
              name="comment"
              value={formState.comment}
              onChange={handleInputChange}
              placeholder="Tell us about your experience with Cubicon, TRIAD, or BuyFacts methods..."
              className={styles.textarea}
              required
              minLength={3}
              maxLength={3000}
            />
          </div>
        </div>

        {/* Honeypot field for anti-bot protection */}
        <input
          type="text"
          name="hp_website"
          value={formState.hp_website}
          onChange={handleInputChange}
          className={styles.honeypotField}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            "Submitting Feedback..."
          ) : (
            <>
              <Send size={18} /> Submit Feedback
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <div className={styles.pageContainer}>
      <Navbar hideOnScroll={false} />

      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.headerSection}>
            <div className={styles.badge}>
              <Sparkles size={14} /> Participant Sentiment
            </div>
            <h1 className={styles.title}>Share Your Feedback</h1>
            <p className={styles.subtitle}>
              We value your perspective on our human validation tools and
              research methodologies. Let us know how we can make your
              experience smoother, faster, and more insightful.
            </p>
          </div>

          <Suspense
            fallback={
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "#94a3b8",
                }}
              >
                Loading feedback form...
              </div>
            }
          >
            <FeedbackFormContent />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
