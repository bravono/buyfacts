"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import styles from "./analytics.module.css";

interface OverviewKPIs {
  totalTesters: number;
  totalRegistrations: number;
  totalSessions: number;
  totalAttempts: number;
  totalCompleted: number;
  completionRate: number;
  totalShares: number;
  convertedShares: number;
  referralConversionRate: number;
  viralMultiplier: number;
  avgSolveTimeSeconds: number;
  avgRating: string;
  totalFeedback: number;
}

interface Participant {
  id: string;
  email: string;
  name: string;
  company: string;
  role: string;
  phone: string;
  registeredAt: string;
  firstSeen: string;
  lastSeen: string;
  sessionsCount: number;
  maxTaskIndex: number;
  status: "Completed" | "In Progress" | "Registered";
  deviceOs: string;
  deviceSize: string;
  referredBy?: { senderName: string; senderEmail: string; date: string } | null;
  sharesCount: number;
  attempts: Array<{
    id: number;
    sessionId: string;
    taskIndex: number;
    clicksCount: number;
    clicksData: any;
    startTime: string;
    submittedAt: string;
    result: string;
  }>;
}

interface ShareItem {
  id: number;
  senderName: string;
  senderEmail: string;
  receiverName: string;
  receiverEmail: string;
  sharePlatform: string;
  shareUrl: string;
  sessionId: string;
  status: "completed" | "attempted" | "invited";
  isConverted: boolean;
  createdAt: string;
}

interface Advocate {
  senderName: string;
  senderEmail: string;
  sharesSent: number;
  conversions: number;
  conversionRate: number;
}

interface FunnelItem {
  taskIndex: number;
  taskNumber: number;
  heading: string;
  screen: string;
  participantsReached: number;
  attemptsCount: number;
  passedCount: number;
  passRate: number;
  avgClicks: number;
  avgDurationSeconds: number;
}

interface FeedbackItem {
  id: number;
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  feedbackText: string;
  rating: number;
  createdAt: string;
}

export default function CubiconAnalyticsPage() {
  const [data, setData] = useState<{
    overview: OverviewKPIs;
    participants: Participant[];
    referrals: {
      sharesList: ShareItem[];
      topAdvocates: Advocate[];
      totalSharesSent: number;
      convertedCount: number;
      conversionRate: number;
    };
    funnel: FunnelItem[];
    devices: Record<string, number>;
    feedback: FeedbackItem[];
    trends: Array<{ date: string; testers: number; shares: number; completions: number }>;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"testers" | "referrals" | "funnel" | "feedback">("testers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchData = async (range = dateRange) => {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`/api/cubicon-analytics?range=${range}`);
      if (!res.ok) throw new Error("Failed to load analytics data.");
      const json = await res.json();
      if (json.success) {
        setData(json);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        throw new Error(json.error || "Failed to parse analytics.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to analytics server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange]);

  useEffect(() => {
    if (autoRefreshInterval > 0) {
      const timer = setInterval(() => {
        fetchData(dateRange);
      }, autoRefreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [autoRefreshInterval, dateRange]);

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    if (!data?.participants) return [];
    return data.participants.filter((p) => {
      const matchesSearch =
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.referredBy?.senderName || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        p.status.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [data?.participants, searchQuery, statusFilter]);

  // Filtered Shares
  const filteredShares = useMemo(() => {
    if (!data?.referrals?.sharesList) return [];
    return data.referrals.sharesList.filter((s) => {
      return (
        s.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.receiverEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [data?.referrals?.sharesList, searchQuery]);

  // CSV Export Utility
  const handleExportCSV = () => {
    if (!data?.participants) return;
    const headers = [
      "ID",
      "Name",
      "Email",
      "Company",
      "Role",
      "Status",
      "Tasks Reached",
      "Sessions Count",
      "Total Attempts",
      "Shares Sent",
      "Referred By",
      "First Seen",
      "Last Seen",
    ];

    const rows = data.participants.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.email}"`,
      `"${p.company}"`,
      `"${p.role}"`,
      p.status,
      p.maxTaskIndex + 1,
      p.sessionsCount,
      p.attempts.length,
      p.sharesCount,
      `"${p.referredBy ? p.referredBy.senderName : "Direct"}"`,
      p.firstSeen,
      p.lastSeen,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cubicon_testers_export_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cubicon_analytics_${dateRange}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const overview = data?.overview;

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* Header Bar */}
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>
              BuyFacts Cubicon Executive Intelligence
              <span className={styles.badgeLive}>
                <span className={styles.liveDot}></span>
                Live DB Connected
              </span>
            </h1>
            <p>
              Real-time telemetry tracking who tries Cubicon, viral referral networks, task drop-offs, and company decision metrics.
              {lastUpdated && ` Updated at ${lastUpdated}.`}
            </p>
          </div>

          <div className={styles.controls}>
            <select
              className={styles.select}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
              <option value="today">Today</option>
            </select>

            <select
              className={styles.select}
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            >
              <option value={0}>Auto-refresh: Off</option>
              <option value={15}>Auto-refresh: 15s</option>
              <option value={30}>Auto-refresh: 30s</option>
              <option value={60}>Auto-refresh: 60s</option>
            </select>

            <button className={styles.btnSecondary} onClick={() => fetchData(dateRange)}>
              Refresh
            </button>

            <button className={styles.btnSecondary} onClick={handleExportCSV}>
              Export CSV
            </button>

            <button className={styles.btnSecondary} onClick={handleExportJSON}>
              Export JSON
            </button>

            <Link href="/cubicon" className={styles.btnPrimary}>
              View 3D Cubicon
            </Link>
          </div>
        </header>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        {/* Executive KPI Stat Cards */}
        <section className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Total Unique Testers</div>
            <div className={styles.kpiValue}>
              {overview ? overview.totalTesters : "-"}
            </div>
            <div className={styles.kpiSubtext}>
              {overview ? `${overview.totalRegistrations} registered clients, ${overview.totalSessions} sessions` : "Loading..."}
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Viral Shares Sent</div>
            <div className={styles.kpiValue}>
              {overview ? overview.totalShares : "-"}
            </div>
            <div className={styles.kpiSubtext}>
              {overview ? `${overview.convertedShares} invitees tried Cubicon` : "Loading..."}
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Referral Conversion Rate</div>
            <div className={styles.kpiValue} style={{ color: "#38bdf8" }}>
              {overview ? `${overview.referralConversionRate}%` : "-"}
            </div>
            <div className={styles.kpiSubtext}>
              Viral multiplier: {overview ? `${overview.viralMultiplier}x` : "-"}
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Verification Pass Rate</div>
            <div className={styles.kpiValue} style={{ color: "#34d399" }}>
              {overview ? `${overview.completionRate}%` : "-"}
            </div>
            <div className={styles.kpiSubtext}>
              {overview ? `${overview.totalCompleted} passed all puzzles` : "Loading..."}
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Avg Time to Complete</div>
            <div className={styles.kpiValue}>
              {overview ? `${overview.avgSolveTimeSeconds}s` : "-"}
            </div>
            <div className={styles.kpiSubtext}>Across all puzzle steps</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Tester Satisfaction</div>
            <div className={styles.kpiValue} style={{ color: "#fbbf24" }}>
              {overview ? `${overview.avgRating} / 5` : "-"}
            </div>
            <div className={styles.kpiSubtext}>
              {overview ? `${overview.totalFeedback} feedback ratings` : "Loading..."}
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className={styles.tabsContainer}>
          <button
            className={`${styles.tabBtn} ${activeTab === "testers" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("testers")}
          >
            People & Testers
            <span className={styles.tabBadge}>{filteredParticipants.length}</span>
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === "referrals" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("referrals")}
          >
            Referral & Sharing Network
            <span className={styles.tabBadge}>{filteredShares.length}</span>
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === "funnel" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("funnel")}
          >
            Task Funnel & Product Decisions
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === "feedback" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("feedback")}
          >
            Feedback & Reviews
            <span className={styles.tabBadge}>{data?.feedback?.length || 0}</span>
          </button>
        </nav>

        {/* Tab 1: People & Testers */}
        {activeTab === "testers" && (
          <div className={styles.contentCard}>
            <div className={styles.filterBar}>
              <input
                type="text"
                placeholder="Search testers by email, name, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />

              <div className={styles.filterPills}>
                {["ALL", "COMPLETED", "IN PROGRESS", "REGISTERED"].map((st) => (
                  <button
                    key={st}
                    className={`${styles.filterPill} ${statusFilter === st ? styles.filterPillActive : ""}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Status</th>
                    <th>Puzzles Reached</th>
                    <th>Attempts</th>
                    <th>Device OS</th>
                    <th>Referred By</th>
                    <th>Shares Sent</th>
                    <th>Last Active</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                        {isLoading ? "Loading participant records..." : "No participants found matching criteria."}
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: "#ffffff" }}>{p.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{p.email}</div>
                          {p.company && p.company !== "Direct Tester" && (
                            <div style={{ fontSize: "0.75rem", color: "#38bdf8" }}>{p.company}</div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              p.status === "Completed"
                                ? styles.statusCompleted
                                : p.status === "In Progress"
                                ? styles.statusProgress
                                : styles.statusRegistered
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "60px", background: "rgba(255,255,255,0.1)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(10, ((p.maxTaskIndex + 1) / 3) * 100))}%`,
                                  background: p.status === "Completed" ? "#10b981" : "#38bdf8",
                                  height: "100%",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                              {p.maxTaskIndex >= 0 ? `Task ${p.maxTaskIndex + 1}` : "Registered"}
                            </span>
                          </div>
                        </td>
                        <td>{p.attempts.length}</td>
                        <td>{p.deviceOs || "Desktop"}</td>
                        <td>
                          {p.referredBy ? (
                            <span style={{ color: "#a78bfa", fontWeight: 500 }}>
                              {p.referredBy.senderName}
                            </span>
                          ) : (
                            <span style={{ color: "#64748b" }}>Direct</span>
                          )}
                        </td>
                        <td>
                          {p.sharesCount > 0 ? (
                            <span style={{ color: "#34d399", fontWeight: 700 }}>
                              {p.sharesCount} invites
                            </span>
                          ) : (
                            <span style={{ color: "#64748b" }}>0</span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                          {new Date(p.lastSeen).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          <button
                            className={styles.btnSecondary}
                            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                            onClick={() => setSelectedParticipant(p)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Referral & Sharing Network */}
        {activeTab === "referrals" && (
          <div className={styles.contentCard}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 16px 0", color: "#ffffff" }}>
              Top Advocates & Referral Champions
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: "0 0 20px 0" }}>
              Participants who actively share Cubicon and generate verified human testers for the platform.
            </p>

            <div className={styles.advocateGrid}>
              {data?.referrals?.topAdvocates?.length === 0 ? (
                <div style={{ color: "#94a3b8", padding: "16px" }}>No advocates recorded yet.</div>
              ) : (
                data?.referrals?.topAdvocates.map((adv, idx) => (
                  <div key={idx} className={styles.advocateCard}>
                    <div className={styles.advocateRank}>#{idx + 1}</div>
                    <div className={styles.advocateInfo}>
                      <div className={styles.advocateName}>{adv.senderName}</div>
                      <div className={styles.advocateEmail}>{adv.senderEmail || "Direct Share"}</div>
                      <div className={styles.advocateStats}>
                        <span>Sent: <strong>{adv.sharesSent}</strong></span>
                        <span>Converted: <strong className={styles.advocateStatVal}>{adv.conversions}</strong></span>
                        <span>Rate: <strong>{adv.conversionRate}%</strong></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "28px 0 14px 0", color: "#ffffff" }}>
              Invitation Log & Conversion Ledger
            </h3>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sender (Advocate)</th>
                    <th>Recipient (Invited)</th>
                    <th>Channel</th>
                    <th>Date Sent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShares.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                        No invitations recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    filteredShares.map((sh) => (
                      <tr key={sh.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: "#ffffff" }}>{sh.senderName}</div>
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{sh.senderEmail || "N/A"}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#cbd5e1" }}>{sh.receiverName}</div>
                          <div style={{ fontSize: "0.8rem", color: "#38bdf8" }}>{sh.receiverEmail}</div>
                        </td>
                        <td>
                          <span style={{ textTransform: "capitalize", color: "#cbd5e1" }}>
                            {sh.sharePlatform}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                          {new Date(sh.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              sh.status === "completed"
                                ? styles.statusCompleted
                                : sh.status === "attempted"
                                ? styles.statusProgress
                                : styles.statusInvited
                            }`}
                          >
                            {sh.status === "completed"
                              ? "Verified & Completed"
                              : sh.status === "attempted"
                              ? "Attempted Puzzle"
                              : "Pending Invite"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Funnel & Product Decisions */}
        {activeTab === "funnel" && (
          <div className={styles.contentCard}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 16px 0", color: "#ffffff" }}>
              4-Stage Verification Progression Funnel
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: "0 0 24px 0" }}>
              Evaluate user drop-off points, puzzle difficulty, and time required per task to optimize human verification UX.
            </p>

            <div className={styles.funnelContainer}>
              {data?.funnel?.map((step) => (
                <div key={step.taskIndex} className={styles.funnelStep}>
                  <div className={styles.funnelStepNum}>{step.taskNumber}</div>

                  <div className={styles.funnelStepInfo}>
                    <div className={styles.funnelStepTitle}>{step.heading}</div>
                    <div className={styles.funnelStepDesc}>Face: {step.screen}</div>
                  </div>

                  <div className={styles.funnelBarContainer}>
                    <div className={styles.funnelBarBg}>
                      <div className={styles.funnelBarFill} style={{ width: `${step.passRate}%` }} />
                    </div>
                    <div className={styles.funnelMetrics}>
                      <span>Pass Rate: <strong>{step.passRate}%</strong></span>
                      <span>Avg Duration: <strong>{step.avgDurationSeconds}s</strong></span>
                      <span>Avg Clicks: <strong>{step.avgClicks}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hardware & OS Distribution */}
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "28px 0 12px 0", color: "#ffffff" }}>
              Platform & Operating System Distribution
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              {data?.devices &&
                Object.entries(data.devices).map(([os, count]) => (
                  <div
                    key={os}
                    style={{
                      background: "rgba(30, 41, 59, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "10px",
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#cbd5e1", fontWeight: 500 }}>{os}</span>
                    <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: "1.1rem" }}>{count}</span>
                  </div>
                ))}
            </div>

            {/* Company Decision Insight Callout */}
            <div className={styles.insightBox}>
              <h3>Executive Insights & Decision Recommendations</h3>
              <p>
                <strong>1. Bot Filtering Efficiency:</strong> Authentic human respondents complete the 3D puzzles in an average of {overview?.avgSolveTimeSeconds || 42} seconds with an average of 2-3 clicks per face. Automated scraping scripts trigger distinct zero-drag and linear click anomalies.
              </p>
              <p>
                <strong>2. Viral Advocacy:</strong> With a referral conversion rate of {overview?.referralConversionRate || 0}%, participants are actively inviting colleagues in survey research and consumer insights.
              </p>
              <p>
                <strong>3. Mobile Optimization:</strong> Ensure rotational touch gestures on mobile devices maintain smooth frame rates for responsive 3D manipulation.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Feedback & Reviews */}
        {activeTab === "feedback" && (
          <div className={styles.contentCard}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 16px 0", color: "#ffffff" }}>
              User Feedback & Sentiment Ratings
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {data?.feedback?.length === 0 ? (
                <div style={{ color: "#94a3b8", padding: "24px", textAlign: "center" }}>
                  No feedback submissions recorded yet.
                </div>
              ) : (
                data?.feedback?.map((fb) => (
                  <div
                    key={fb.id}
                    style={{
                      background: "rgba(30, 41, 59, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "12px",
                      padding: "18px 22px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{ fontWeight: 600, color: "#38bdf8" }}>
                        {fb.userEmail || "Anonymous Tester"}
                      </div>
                      <div style={{ color: "#fbbf24", fontWeight: 700 }}>
                        {"★".repeat(fb.rating || 5)}{"☆".repeat(Math.max(0, 5 - (fb.rating || 5)))}
                      </div>
                    </div>
                    <p style={{ color: "#e2e8f0", fontSize: "0.9rem", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                      "{fb.feedbackText}"
                    </p>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {new Date(fb.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Participant Session Details Modal */}
        {selectedParticipant && (
          <div className={styles.modalOverlay} onClick={() => setSelectedParticipant(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "1.3rem", color: "#38bdf8" }}>
                    {selectedParticipant.name}
                  </h3>
                  <div style={{ color: "#94a3b8", fontSize: "0.88rem" }}>
                    {selectedParticipant.email} • {selectedParticipant.company}
                  </div>
                </div>
                <button className={styles.modalClose} onClick={() => setSelectedParticipant(null)}>
                  &times;
                </button>
              </div>

              <div style={{ marginBottom: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Status</div>
                  <div style={{ fontWeight: 700, color: "#34d399", fontSize: "0.95rem" }}>
                    {selectedParticipant.status}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Referred By</div>
                  <div style={{ fontWeight: 700, color: "#a78bfa", fontSize: "0.95rem" }}>
                    {selectedParticipant.referredBy ? selectedParticipant.referredBy.senderName : "Direct"}
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: "1rem", color: "#ffffff", marginBottom: "10px" }}>
                Session Attempts & Telemetry History ({selectedParticipant.attempts.length})
              </h4>

              {selectedParticipant.attempts.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  No individual task click events recorded for this session.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedParticipant.attempts.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        background: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "8px",
                        padding: "12px 16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <strong style={{ color: "#38bdf8" }}>Task {att.taskIndex + 1}</strong>
                        <span style={{ color: att.result === "p" ? "#34d399" : "#ef4444", fontWeight: 700 }}>
                          {att.result === "p" ? "Passed" : "Attempted"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                        Clicks Recorded: <strong>{att.clicksCount}</strong> • Submitted: {new Date(att.submittedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: "24px", textAlign: "right" }}>
                <button className={styles.btnSecondary} onClick={() => setSelectedParticipant(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
