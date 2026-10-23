"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import styles from "./analytics.module.css";
import CubiconCoordinatePicker, { CoordinatePickerApplyResult, CoordinateDataSync } from "@/components/CubiconCoordinatePicker";
import { normalizeQuestionType, CanonicalQuestionType } from "@/lib/cubicon/coordinateHelper";
import { Crosshair, Plus, Trash2, ArrowRight } from "lucide-react";

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

interface SequenceItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  passThreshold?: number;
  pass_threshold?: number;
  rotationDirection?: string;
  rotation_direction?: string;
  defaultRotationInterval?: number;
  default_rotation_interval?: number;
  isActive?: boolean;
  is_active?: boolean;
  createdBy?: string;
  created_by?: string;
  tasks?: Array<{
    id: number;
    taskIndex: number;
    heading: string;
    description: string;
    screen: string;
    image: string;
    rotation: string;
    rotationInterval: number;
  }>;
  _count?: {
    attempts: number;
    sessions: number;
  };
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
  const [activeTab, setActiveTab] = useState<"testers" | "referrals" | "funnel" | "feedback" | "sequences">("testers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Helper to generate default tasks for sequences
  const generateDefaultTasks = (count: number, rotationDir = "left", rotationInterval = 15) => {
    const screens = ["Active_front", "Active_side_r", "Active_back", "Active_side_l"];
    const arts = ["/cubicon-app/arts/Puzzle1.webp", "/cubicon-app/arts/Puzzle2.webp", "/cubicon-app/arts/Puzzle3.webp"];
    const tasks = [];
    for (let i = 0; i < count; i++) {
      tasks.push({
        taskIndex: i,
        taskNumber: i + 1,
        heading: `Puzzle Task ${i + 1}`,
        description: i === 2 ? "Trace the path across waypoints (Drag to solve)." : "Click the correct target on screen.",
        screen: screens[i % screens.length],
        image: arts[i % arts.length],
        questionType: i === 2 ? "Anticipation" : "Selection",
        correctCoordinates: "",
        startPoint: "",
        midPoint: "",
        endPoint: "",
        rotation: rotationDir,
        rotationInterval: rotationInterval,
        tolerance: 0.5,
      });
    }
    return tasks;
  };

  // Sequences Management State
  const [sequences, setSequences] = useState<SequenceItem[]>([]);
  const [isSeqLoading, setIsSeqLoading] = useState<boolean>(false);
  const [seqMessage, setSeqMessage] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newSeq, setNewSeq] = useState({
    title: "",
    slug: "",
    description: "",
    pass_threshold: 0.66,
    rotation_direction: "left",
    default_rotation_interval: 15,
    is_active: false,
    tasksCount: 3,
    tasks: generateDefaultTasks(3),
  });

  // Task Editing & Coordinate Picker State
  const [editingSeq, setEditingSeq] = useState<any | null>(null);
  const [editingTasks, setEditingTasks] = useState<any[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<{
    source: "create" | "edit";
    taskIndex: number;
  } | null>(null);

  const currentPickerTask = useMemo(() => {
    if (!pickerTarget) return null;
    if (pickerTarget.source === "create") {
      return newSeq.tasks?.[pickerTarget.taskIndex] || null;
    }
    return editingTasks?.[pickerTarget.taskIndex] || null;
  }, [pickerTarget, newSeq.tasks, editingTasks]);

  const handlePickerQuestionTypeChange = (nextType: CanonicalQuestionType) => {
    if (!pickerTarget) return;
    if (pickerTarget.source === "create") {
      setNewSeq((prev) => {
        const nextTasks = [...(prev.tasks || [])];
        if (nextTasks[pickerTarget.taskIndex]) {
          nextTasks[pickerTarget.taskIndex] = {
            ...nextTasks[pickerTarget.taskIndex],
            questionType: nextType,
          };
        }
        return { ...prev, tasks: nextTasks };
      });
    } else if (pickerTarget.source === "edit") {
      setEditingTasks((prev) => {
        const next = [...prev];
        if (next[pickerTarget.taskIndex]) {
          next[pickerTarget.taskIndex] = {
            ...next[pickerTarget.taskIndex],
            questionType: nextType,
          };
        }
        return next;
      });
    }
  };

  const handlePickerDataChange = (syncData: CoordinateDataSync) => {
    if (!pickerTarget) return;

    const updater = (task: any) => ({
      ...task,
      ...(syncData.screen !== undefined ? { screen: syncData.screen } : {}),
      ...(syncData.image !== undefined ? { image: syncData.image } : {}),
      ...(syncData.questionType !== undefined
        ? { questionType: syncData.questionType, question_type: syncData.questionType }
        : {}),
      ...(syncData.correctCoordinates !== undefined
        ? { correctCoordinates: syncData.correctCoordinates, correct_coordinates: syncData.correctCoordinates }
        : {}),
      ...(syncData.startPoint !== undefined ? { startPoint: syncData.startPoint } : {}),
      ...(syncData.midPoint !== undefined ? { midPoint: syncData.midPoint } : {}),
      ...(syncData.endPoint !== undefined ? { endPoint: syncData.endPoint } : {}),
    });

    if (pickerTarget.source === "create") {
      setNewSeq((prev) => {
        const nextTasks = [...(prev.tasks || [])];
        if (nextTasks[pickerTarget.taskIndex]) {
          nextTasks[pickerTarget.taskIndex] = updater(nextTasks[pickerTarget.taskIndex]);
        }
        return { ...prev, tasks: nextTasks };
      });
    } else if (pickerTarget.source === "edit") {
      setEditingTasks((prev) => {
        const next = [...prev];
        if (next[pickerTarget.taskIndex]) {
          next[pickerTarget.taskIndex] = updater(next[pickerTarget.taskIndex]);
        }
        return next;
      });
    }
  };

  const handlePickerApply = (result: CoordinatePickerApplyResult) => {
    if (!pickerTarget) return;

    if (pickerTarget.source === "create") {
      setNewSeq((prev) => {
        const nextTasks = [...(prev.tasks || [])];
        if (nextTasks[pickerTarget.taskIndex]) {
          nextTasks[pickerTarget.taskIndex] = {
            ...nextTasks[pickerTarget.taskIndex],
            correctCoordinates: result.correctCoordinates,
            startPoint: result.startPoint,
            midPoint: result.midPoint,
            endPoint: result.endPoint,
            ...(result.image ? { image: result.image } : {}),
            ...(result.screen ? { screen: result.screen } : {}),
            ...(result.questionType ? { questionType: result.questionType, question_type: result.questionType } : {}),
          };
        }
        return { ...prev, tasks: nextTasks };
      });
    } else if (pickerTarget.source === "edit") {
      setEditingTasks((prev) => {
        const next = [...prev];
        if (next[pickerTarget.taskIndex]) {
          next[pickerTarget.taskIndex] = {
            ...next[pickerTarget.taskIndex],
            correctCoordinates: result.correctCoordinates,
            startPoint: result.startPoint,
            midPoint: result.midPoint,
            endPoint: result.endPoint,
            ...(result.image ? { image: result.image } : {}),
            ...(result.screen ? { screen: result.screen } : {}),
            ...(result.questionType ? { questionType: result.questionType, question_type: result.questionType } : {}),
          };
        }
        return next;
      });
    }
    setIsPickerOpen(false);
    setPickerTarget(null);
  };

  const fetchSequences = async () => {
    try {
      setIsSeqLoading(true);
      const res = await fetch("/api/admin/sequences");
      if (res.ok) {
        const json = await res.json();
        if (json.sequences) {
          setSequences(json.sequences);
        }
      }
    } catch (err: any) {
      console.warn("[analytics] Failed to fetch sequences:", err);
    } finally {
      setIsSeqLoading(false);
    }
  };

  const handleActivateSequence = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/sequences/${id}/activate`, {
        method: "POST",
      });
      if (res.ok) {
        setSeqMessage("Puzzle sequence activated successfully.");
        await fetchSequences();
        setTimeout(() => setSeqMessage(""), 4000);
      } else {
        const errJson = await res.json();
        setSeqMessage(`Activation failed: ${errJson.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setSeqMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteSequence = async (id: number) => {
    if (!confirm("Are you sure you want to delete this sequence?")) return;
    try {
      const res = await fetch(`/api/admin/sequences/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSeqMessage("Sequence deleted.");
        await fetchSequences();
        setTimeout(() => setSeqMessage(""), 4000);
      } else {
        const errJson = await res.json();
        setSeqMessage(`Delete failed: ${errJson.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setSeqMessage(`Error: ${err.message}`);
    }
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: newSeq.title,
        slug: newSeq.slug,
        description: newSeq.description,
        passThreshold: newSeq.pass_threshold,
        rotationDirection: newSeq.rotation_direction,
        defaultRotationInterval: newSeq.default_rotation_interval,
        isActive: newSeq.is_active,
        tasks: newSeq.tasks,
      };

      const res = await fetch("/api/admin/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSeqMessage("New puzzle sequence created successfully.");
        setIsCreateModalOpen(false);
        setNewSeq({
          title: "",
          slug: "",
          description: "",
          pass_threshold: 0.66,
          rotation_direction: "left",
          default_rotation_interval: 15,
          is_active: false,
          tasksCount: 3,
          tasks: generateDefaultTasks(3),
        });
        await fetchSequences();
        setTimeout(() => setSeqMessage(""), 4000);
      } else {
        const errJson = await res.json();
        setSeqMessage(`Create failed: ${errJson.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setSeqMessage(`Error: ${err.message}`);
    }
  };

  const handleOpenEditTasks = (seq: any) => {
    setEditingSeq(seq);
    const existingTasks = Array.isArray(seq.tasks) && seq.tasks.length > 0
      ? JSON.parse(JSON.stringify(seq.tasks)).map((t: any) => {
          const qt = normalizeQuestionType(t.questionType || t.question_type);
          return { ...t, questionType: qt, question_type: qt };
        })
      : generateDefaultTasks(3, seq.rotationDirection || "left", seq.defaultRotationInterval || 15);
    setEditingTasks(existingTasks);
  };

  const handleSaveEditedSequenceTasks = async () => {
    if (!editingSeq) return;
    try {
      const res = await fetch(`/api/admin/sequences/${editingSeq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingSeq.title,
          description: editingSeq.description,
          passThreshold: editingSeq.passThreshold,
          rotationDirection: editingSeq.rotationDirection,
          defaultRotationInterval: editingSeq.defaultRotationInterval,
          isActive: editingSeq.isActive !== undefined ? editingSeq.isActive : editingSeq.is_active,
          tasks: editingTasks,
        }),
      });

      if (res.ok) {
        setSeqMessage(`Tasks for sequence "${editingSeq.title}" saved successfully.`);
        setEditingSeq(null);
        await fetchSequences();
        setTimeout(() => setSeqMessage(""), 4000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setSeqMessage(`Error saving tasks: ${errJson.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setSeqMessage(`Error: ${err.message}`);
    }
  };

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

          <button
            className={`${styles.tabBtn} ${activeTab === "sequences" ? styles.tabBtnActive : ""}`}
            onClick={() => {
              setActiveTab("sequences");
              fetchSequences();
            }}
          >
            Puzzle Groups & Sequences
            <span className={styles.tabBadge}>{sequences.length}</span>
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
                        Rating: {fb.rating || 5} / 5
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
        {/* Tab 5: Puzzle Groups & Sequences */}
        {activeTab === "sequences" && (
          <div className={styles.contentCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 6px 0", color: "#ffffff" }}>
                  Puzzle Groups & Sequence Engine
                </h2>
                <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: 0 }}>
                  Manage dynamic challenge sequences, rotation parameters, thresholds, and custom assets.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className={styles.btnSecondary}
                  onClick={fetchSequences}
                  disabled={isSeqLoading}
                >
                  {isSeqLoading ? "Refreshing..." : "Refresh Sequences"}
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create New Sequence
                </button>
              </div>
            </div>

            {seqMessage && (
              <div
                style={{
                  background: seqMessage.toLowerCase().includes("fail") || seqMessage.toLowerCase().includes("error")
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(16, 185, 129, 0.15)",
                  border: seqMessage.toLowerCase().includes("fail") || seqMessage.toLowerCase().includes("error")
                    ? "1px solid rgba(239, 68, 68, 0.3)"
                    : "1px solid rgba(16, 185, 129, 0.3)",
                  color: seqMessage.toLowerCase().includes("fail") || seqMessage.toLowerCase().includes("error")
                    ? "#fca5a5"
                    : "#34d399",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "0.88rem",
                }}
              >
                {seqMessage}
              </div>
            )}

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Title & Slug</th>
                    <th>Pass Threshold</th>
                    <th>Rotation Config</th>
                    <th>Tasks</th>
                    <th>Telemetry</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sequences.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>
                        {isSeqLoading ? "Loading sequences..." : "No puzzle groups found."}
                      </td>
                    </tr>
                  ) : (
                    sequences.map((seq) => (
                      <tr key={seq.id}>
                        <td>
                          {(() => {
                            const isAct = seq.isActive !== undefined ? seq.isActive : seq.is_active;
                            return (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: "9999px",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  background: isAct ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.1)",
                                  color: isAct ? "#34d399" : "#94a3b8",
                                  border: isAct ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(148, 163, 184, 0.2)",
                                }}
                              >
                                {isAct ? "ACTIVE DEFAULT" : "INACTIVE"}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#ffffff" }}>{seq.title}</div>
                          <div style={{ fontSize: "0.8rem", color: "#38bdf8" }}>{seq.slug}</div>
                        </td>
                        <td>
                          {(() => {
                            const threshold = seq.passThreshold !== undefined ? seq.passThreshold : (seq.pass_threshold ?? 0.66);
                            return (
                              <span style={{ fontWeight: 600, color: "#cbd5e1" }}>
                                {threshold > 1
                                  ? `${threshold} Tasks`
                                  : `${Math.round(threshold * 100)}%`}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ textTransform: "capitalize", color: "#ffffff" }}>
                            Direction: <strong>{seq.rotationDirection || seq.rotation_direction || "left"}</strong>
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                            Interval: {seq.defaultRotationInterval ?? seq.default_rotation_interval ?? 15}s
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: "#38bdf8" }}>{seq.tasks?.length || 0} Steps</strong>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                          Sessions: {seq._count?.sessions || 0}
                          <br />
                          Attempts: {seq._count?.attempts || 0}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {!(seq.isActive !== undefined ? seq.isActive : seq.is_active) && (
                              <button
                                className={styles.btnPrimary}
                                style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                                onClick={() => handleActivateSequence(seq.id)}
                              >
                                Activate
                              </button>
                            )}
                            <button
                              className={styles.btnSecondary}
                              style={{ padding: "5px 10px", fontSize: "0.75rem", borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}
                              onClick={() => handleOpenEditTasks(seq)}
                            >
                              Edit Tasks ({seq.tasks?.length || 0})
                            </button>
                            <a
                              href={`/cubicon?sequence=${seq.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.btnSecondary}
                              style={{ padding: "5px 10px", fontSize: "0.75rem", textDecoration: "none" }}
                            >
                              Test Run
                            </a>
                            {seq.slug !== "default" && (
                              <button
                                className={styles.btnSecondary}
                                style={{ padding: "5px 10px", fontSize: "0.75rem", borderColor: "rgba(239, 68, 68, 0.4)", color: "#f87171" }}
                                onClick={() => handleDeleteSequence(seq.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Sequence Modal */}
        {isCreateModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
            <div className={styles.modalContent} style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#38bdf8" }}>Create New Puzzle Sequence</h3>
                <button className={styles.modalClose} onClick={() => setIsCreateModalOpen(false)}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateSequence} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                    Sequence Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Strict Anti-Bot Challenge"
                    value={newSeq.title}
                    onChange={(e) => setNewSeq({ ...newSeq, title: e.target.value })}
                    className={styles.searchInput}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                    Slug (Unique identifier, optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., strict-anti-bot"
                    value={newSeq.slug}
                    onChange={(e) => setNewSeq({ ...newSeq, slug: e.target.value })}
                    className={styles.searchInput}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short overview of the puzzle group"
                    value={newSeq.description}
                    onChange={(e) => setNewSeq({ ...newSeq, description: e.target.value })}
                    className={styles.searchInput}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                      Pass Threshold
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="10"
                      value={newSeq.pass_threshold}
                      onChange={(e) => setNewSeq({ ...newSeq, pass_threshold: parseFloat(e.target.value) || 0.66 })}
                      className={styles.searchInput}
                      style={{ width: "100%" }}
                    />
                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>
                      e.g., 0.66 for 66%, or 3 for 3 tasks
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                      Rotation Direction
                    </label>
                    <select
                      value={newSeq.rotation_direction}
                      onChange={(e) => setNewSeq({ ...newSeq, rotation_direction: e.target.value })}
                      className={styles.select}
                      style={{ width: "100%" }}
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                      Rotation Interval (seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={newSeq.default_rotation_interval}
                      onChange={(e) => setNewSeq({ ...newSeq, default_rotation_interval: parseInt(e.target.value, 10) || 15 })}
                      className={styles.searchInput}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                      Number of Puzzle Tasks
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newSeq.tasksCount}
                      onChange={(e) => {
                        const count = parseInt(e.target.value, 10) || 1;
                        const clamped = Math.max(1, Math.min(10, count));
                        setNewSeq((prev) => {
                          let tasks = [...(prev.tasks || [])];
                          if (tasks.length < clamped) {
                            const extra = generateDefaultTasks(clamped, prev.rotation_direction, prev.default_rotation_interval).slice(tasks.length);
                            tasks = [...tasks, ...extra];
                          } else if (tasks.length > clamped) {
                            tasks = tasks.slice(0, clamped);
                          }
                          return { ...prev, tasksCount: clamped, tasks };
                        });
                      }}
                      className={styles.searchInput}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* Tasks Configuration List */}
                <div style={{ marginTop: "4px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "#38bdf8" }}>
                      Sequence Tasks ({newSeq.tasks?.length || 0})
                    </label>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      Configure face images and click "Pick Coordinates" to capture targets visually.
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto", paddingRight: "4px" }}>
                    {newSeq.tasks?.map((task, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(15, 23, 42, 0.6)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ color: "#ffffff", fontSize: "0.85rem" }}>
                            Task {idx + 1}: {task.heading}
                          </strong>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: task.correctCoordinates ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                              color: task.correctCoordinates ? "#34d399" : "#f87171",
                              fontWeight: 600,
                            }}
                          >
                            {task.correctCoordinates ? "Coordinates Configured" : "No Coordinates"}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div>
                            <label style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Screen Face</label>
                            <select
                              className={styles.select}
                              style={{ width: "100%", padding: "4px 8px", fontSize: "0.8rem" }}
                              value={task.screen}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewSeq((prev) => {
                                  const t = [...prev.tasks];
                                  t[idx] = { ...t[idx], screen: val };
                                  return { ...prev, tasks: t };
                                });
                              }}
                            >
                              <option value="Active_front">Active_front</option>
                              <option value="Active_side_r">Active_side_r</option>
                              <option value="Active_back">Active_back</option>
                              <option value="Active_side_l">Active_side_l</option>
                              <option value="Active_top">Active_top</option>
                              <option value="Active_bottom">Active_bottom</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Question Type</label>
                            <select
                              className={styles.select}
                              style={{ width: "100%", padding: "4px 8px", fontSize: "0.8rem" }}
                              value={normalizeQuestionType(task.questionType)}
                              onChange={(e) => {
                                const val = normalizeQuestionType(e.target.value);
                                setNewSeq((prev) => {
                                  const t = [...prev.tasks];
                                  t[idx] = { ...t[idx], questionType: val };
                                  return { ...prev, tasks: t };
                                });
                              }}
                            >
                              <option value="Selection">Selection (Click)</option>
                              <option value="Anticipation">Anticipation (Drag)</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
                          <input
                            type="text"
                            placeholder="Image URL"
                            value={task.image}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewSeq((prev) => {
                                const t = [...prev.tasks];
                                t[idx] = { ...t[idx], image: val };
                                return { ...prev, tasks: t };
                              });
                            }}
                            className={styles.searchInput}
                            style={{ flex: 1, padding: "4px 8px", fontSize: "0.8rem" }}
                          />
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            style={{ padding: "6px 12px", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                            onClick={() => {
                              setPickerTarget({ source: "create", taskIndex: idx });
                              setIsPickerOpen(true);
                            }}
                          >
                            <Crosshair size={13} style={{ marginRight: 4 }} />
                            Pick Coordinates Visually
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    id="seqActive"
                    checked={newSeq.is_active}
                    onChange={(e) => setNewSeq({ ...newSeq, is_active: e.target.checked })}
                  />
                  <label htmlFor="seqActive" style={{ fontSize: "0.88rem", color: "#ffffff", cursor: "pointer" }}>
                    Activate immediately as primary challenge
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnPrimary}>
                    Create Sequence
                  </button>
                </div>
              </form>
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

        {/* Edit Sequence Tasks Modal */}
        {editingSeq && (
          <div className={styles.modalOverlay} onClick={() => setEditingSeq(null)}>
            <div className={styles.modalContent} style={{ maxWidth: "720px", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#38bdf8" }}>
                    Configure Sequence Tasks: {editingSeq.title}
                  </h3>
                  <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                    Slug: {editingSeq.slug} • Direction: {editingSeq.rotationDirection || editingSeq.rotation_direction || "left"}
                  </div>
                </div>
                <button className={styles.modalClose} onClick={() => setEditingSeq(null)}>
                  &times;
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
                    Sequence Tasks ({editingTasks.length})
                  </label>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                    onClick={() => {
                      const newIdx = editingTasks.length;
                      setEditingTasks([
                        ...editingTasks,
                        {
                          taskIndex: newIdx,
                          taskNumber: newIdx + 1,
                          heading: `Task ${newIdx + 1}`,
                          description: "Solve the challenge.",
                          screen: "Active_front",
                          image: "/cubicon-app/arts/Puzzle1.webp",
                          questionType: "Selection",
                          correctCoordinates: "",
                          startPoint: "",
                          midPoint: "",
                          endPoint: "",
                          rotation: editingSeq.rotationDirection || editingSeq.rotation_direction || "left",
                          rotationInterval: editingSeq.defaultRotationInterval || editingSeq.default_rotation_interval || 15,
                          tolerance: 0.5,
                        },
                      ]);
                    }}
                  >
                    <Plus size={14} style={{ marginRight: 4 }} /> Add Task
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                  {editingTasks.map((task, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "8px",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ background: "#0284c7", color: "#ffffff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={task.heading}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingTasks((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], heading: val };
                                return next;
                              });
                            }}
                            className={styles.searchInput}
                            style={{ fontWeight: 600, color: "#ffffff", padding: "4px 8px", fontSize: "0.85rem" }}
                          />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: task.correctCoordinates ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                              color: task.correctCoordinates ? "#34d399" : "#f87171",
                              fontWeight: 600,
                            }}
                          >
                            {task.correctCoordinates ? "Coordinates Configured" : "No Coordinates"}
                          </span>

                          {editingTasks.length > 1 && (
                            <button
                              type="button"
                              className={styles.btnSecondary}
                              style={{ padding: "4px 8px", color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}
                              onClick={() => {
                                setEditingTasks(editingTasks.filter((_, i) => i !== idx));
                              }}
                              title="Delete task"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Screen Face</label>
                          <select
                            className={styles.select}
                            style={{ width: "100%", padding: "5px 8px", fontSize: "0.82rem" }}
                            value={task.screen}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingTasks((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], screen: val };
                                return next;
                              });
                            }}
                          >
                            <option value="Active_front">Active_front</option>
                            <option value="Active_side_r">Active_side_r</option>
                            <option value="Active_back">Active_back</option>
                            <option value="Active_side_l">Active_side_l</option>
                            <option value="Active_top">Active_top</option>
                            <option value="Active_bottom">Active_bottom</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Question Type</label>
                          <select
                            className={styles.select}
                            style={{ width: "100%", padding: "5px 8px", fontSize: "0.82rem" }}
                            value={normalizeQuestionType(task.questionType || task.question_type)}
                            onChange={(e) => {
                              const val = normalizeQuestionType(e.target.value);
                              setEditingTasks((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], questionType: val, question_type: val };
                                return next;
                              });
                            }}
                          >
                            <option value="Selection">Selection (Click)</option>
                            <option value="Anticipation">Anticipation (Drag)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
                        <input
                          type="text"
                          placeholder="Image URL"
                          value={task.image}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingTasks((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], image: val };
                              return next;
                            });
                          }}
                          className={styles.searchInput}
                          style={{ flex: 1, padding: "5px 8px", fontSize: "0.82rem" }}
                        />
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          style={{ padding: "6px 12px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                          onClick={() => {
                            setPickerTarget({ source: "edit", taskIndex: idx });
                            setIsPickerOpen(true);
                          }}
                        >
                          <Crosshair size={13} style={{ marginRight: 4 }} />
                          Pick Coordinates Visually
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setEditingSeq(null)}>
                    Cancel
                  </button>
                  <button type="button" className={styles.btnPrimary} onClick={handleSaveEditedSequenceTasks}>
                    Save Sequence Tasks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Cubicon Coordinate Picker Modal */}
        <CubiconCoordinatePicker
          isOpen={isPickerOpen}
          onClose={() => {
            setIsPickerOpen(false);
            setPickerTarget(null);
          }}
          initialScreen={currentPickerTask?.screen || "Active_front"}
          initialImage={currentPickerTask?.image || "/cubicon-app/arts/Puzzle1.webp"}
          initialQuestionType={normalizeQuestionType(currentPickerTask?.questionType || currentPickerTask?.question_type)}
          initialCoordinates={currentPickerTask?.correctCoordinates || currentPickerTask?.correct_coordinates || ""}
          onDataChange={handlePickerDataChange}
          onQuestionTypeChange={handlePickerQuestionTypeChange}
          onApply={handlePickerApply}
        />
      </div>
    </div>
  );
}
