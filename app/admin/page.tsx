"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import styles from "./admin.module.css";
import {
  ADMIN_MODEL_REGISTRY,
  ADMIN_CATEGORIES,
  ModelMetadata,
  ModelFieldDefinition,
} from "@/lib/admin/schemaRegistry";
import {
  Database,
  Users,
  Mail,
  FileText,
  Layers,
  Box,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldCheck,
  Activity,
  Copy,
  Check,
  Lock,
} from "lucide-react";

interface UserSession {
  userId: string;
  email: string;
  name?: string;
  role?: string;
}

interface SummaryData {
  counts: Record<string, number>;
  totalRecords: number;
  categoryCounts: Record<string, number>;
  modelCount: number;
  recentActivity: {
    inquiries: any[];
    feedback: any[];
    sessions: any[];
    media: any[];
  };
}

export default function AdminDatabaseDashboard() {
  // Authentication State
  const [session, setSession] = useState<UserSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Navigation State
  const [activeTab, setActiveTab] = useState<string>("overview"); // 'overview' | modelKey
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Table Data State
  const [records, setRecords] = useState<any[]>([]);
  const [totalRecordsCount, setTotalRecordsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [tableError, setTableError] = useState("");

  // Modals State
  const [inspectRecord, setInspectRecord] = useState<any | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active Model Metadata
  const currentModelMeta: ModelMetadata | null = useMemo(() => {
    if (activeTab === "overview") return null;
    return ADMIN_MODEL_REGISTRY[activeTab] || null;
  }, [activeTab]);

  // Check auth session
  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.authenticated && data.user) {
        setSession(data.user);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load summary stats
  const fetchSummary = useCallback(async () => {
    if (!session) return;
    setIsLoadingSummary(true);
    try {
      const res = await fetch("/api/admin/database?action=summary");
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchSummary();
    }
  }, [session, fetchSummary]);

  // Fetch table records
  const fetchTableData = useCallback(async () => {
    if (!session || activeTab === "overview") return;
    setIsLoadingTable(true);
    setTableError("");

    try {
      const meta = ADMIN_MODEL_REGISTRY[activeTab];
      if (!meta) return;

      const activeSortBy = sortBy || meta.defaultSortField;
      const activeSortOrder = sortOrder || meta.defaultSortOrder;

      const queryParams = new URLSearchParams({
        action: "table",
        table: activeTab,
        page: String(currentPage),
        limit: String(pageSize),
        search: searchQuery,
        sortBy: activeSortBy,
        sortOrder: activeSortOrder,
      });

      const res = await fetch(`/api/admin/database?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRecords(data.records);
        setTotalRecordsCount(data.totalCount);
        setTotalPages(data.totalPages);
      } else {
        setTableError(data.error || "Failed to load table records.");
      }
    } catch (err: any) {
      setTableError(err.message || "Failed to fetch table records.");
    } finally {
      setIsLoadingTable(false);
    }
  }, [session, activeTab, currentPage, pageSize, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (activeTab !== "overview" && session) {
      fetchTableData();
    }
  }, [activeTab, session, fetchTableData]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setSession(data.user);
        setLoginPassword("");
      } else {
        setLoginError(data.error || "Invalid credentials.");
      }
    } catch {
      setLoginError("An unexpected error occurred during login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession(null);
      setActiveTab("overview");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Switch tabs
  const handleTabSwitch = (tabKey: string) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
    setSearchQuery("");
    if (ADMIN_MODEL_REGISTRY[tabKey]) {
      setSortBy(ADMIN_MODEL_REGISTRY[tabKey].defaultSortField);
      setSortOrder(ADMIN_MODEL_REGISTRY[tabKey].defaultSortOrder);
    }
  };

  // Sort toggle
  const handleSortToggle = (fieldName: string) => {
    if (sortBy === fieldName) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(fieldName);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Open Create Modal
  const openCreateModal = () => {
    if (!currentModelMeta) return;
    const initial: Record<string, any> = {};
    for (const f of currentModelMeta.fields) {
      if (!f.readOnly) {
        initial[f.name] = f.defaultValue !== undefined ? f.defaultValue : "";
      }
    }
    setFormData(initial);
    setFormError("");
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (record: any) => {
    if (!currentModelMeta) return;
    const initial: Record<string, any> = {};
    for (const f of currentModelMeta.fields) {
      if (!f.readOnly) {
        initial[f.name] = record[f.name] !== undefined ? record[f.name] : "";
      }
    }
    // For User password, keep blank
    if (currentModelMeta.key === "user") {
      initial.password = "";
    }
    setFormData(initial);
    setFormError("");
    setEditRecord(record);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentModelMeta) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: currentModelMeta.key,
          data: formData,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setCreateModalOpen(false);
        fetchTableData();
        fetchSummary();
      } else {
        setFormError(data.error || "Failed to create record.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentModelMeta || !editRecord) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const id = editRecord[currentModelMeta.idField];
      const res = await fetch("/api/admin/database", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: currentModelMeta.key,
          id,
          data: formData,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setEditRecord(null);
        fetchTableData();
        fetchSummary();
      } else {
        setFormError(data.error || "Failed to update record.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to update record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!currentModelMeta || !deleteConfirmRecord) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const id = deleteConfirmRecord[currentModelMeta.idField];
      const res = await fetch("/api/admin/database", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: currentModelMeta.key,
          id,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setDeleteConfirmRecord(null);
        fetchTableData();
        fetchSummary();
      } else {
        setFormError(data.error || "Failed to delete record.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to delete record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!currentModelMeta || records.length === 0) return;
    const visibleFields = currentModelMeta.fields.filter((f) => !f.hiddenInTable);
    const headers = visibleFields.map((f) => `"${f.label.replace(/"/g, '""')}"`).join(",");

    const rows = records.map((record) => {
      return visibleFields
        .map((f) => {
          const val = record[f.name];
          if (val === null || val === undefined) return '""';
          if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentModelMeta.key}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const exportJSON = () => {
    if (!currentModelMeta || records.length === 0) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `${currentModelMeta.key}_export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Render Category Icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Identity & Access":
        return <Users size={16} />;
      case "Communications & Leads":
        return <Mail size={16} />;
      case "Content & Media":
        return <FileText size={16} />;
      case "Cubicon 3D Platform":
        return <Box size={16} />;
      case "Research Lib Platform":
        return <Layers size={16} />;
      default:
        return <Database size={16} />;
    }
  };

  // 1. Loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.loginContainer}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <RefreshCw size={32} className="spin" style={{ marginBottom: "1rem", animation: "spin 1s linear infinite" }} />
            <p>Verifying admin authorization...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Login Card
  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.loginHeader}>
              <img src="/logo.png" alt="BuyFacts Logo" style={{ height: "48px", marginBottom: "0.5rem" }} />
              <h1 className={styles.loginTitle}>Admin Portal</h1>
              <p className={styles.loginSubtitle}>
                Sign in with an authorized administrator account to access the database.
              </p>
            </div>

            {loginError && <div className={styles.errorBanner}>{loginError}</div>}

            <form onSubmit={handleLogin} className={styles.loginForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Admin Email</label>
                <input
                  type="email"
                  className={styles.formInput}
                  placeholder="admin@buyfacts.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Password</label>
                <input
                  type="password"
                  className={styles.formInput}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className={styles.loginBtn} disabled={isLoggingIn}>
                {isLoggingIn ? "Authenticating..." : "Sign In to Admin Dashboard"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin Dashboard
  return (
    <div className={styles.container}>
      {/* Top Sticky Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <Link href="/" className={styles.logoLink}>
              <img src="/logo.png" alt="BuyFacts" className={styles.logoImage} />
              <div className={styles.brandTitles}>
                <h1 className={styles.brandTitle}>
                  BuyFacts Admin
                  <span className={styles.badgeLive}>
                    <ShieldCheck size={12} /> Database Connected
                  </span>
                </h1>
                <p className={styles.brandSubtitle}>Central Database Management & Visibility</p>
              </div>
            </Link>
          </div>

          <div className={styles.headerActions}>
            <Link href="/admin/cubicon-analytics" className={styles.navBtn}>
              <Activity size={14} /> Cubicon Analytics
            </Link>
            <Link href="/file-upload" className={styles.navBtn}>
              <FileText size={14} /> Asset Manager
            </Link>
            <button
              onClick={() => {
                if (activeTab === "overview") fetchSummary();
                else fetchTableData();
              }}
              className={styles.navBtn}
              title="Refresh Current View"
            >
              <RefreshCw size={14} className={isLoadingTable || isLoadingSummary ? "spin" : ""} />
            </button>
            <div className={styles.userBadge}>
              <span>{session.name || session.email}</span>
              <span className={styles.userRole}>{session.role || "admin"}</span>
            </div>
            <button onClick={handleLogout} className={styles.logoutBtn} title="Sign Out">
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className={styles.layout}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar}>
          <div>
            <div className={styles.sidebarSectionTitle}>Main Hub</div>
            <button
              onClick={() => handleTabSwitch("overview")}
              className={`${styles.tabBtn} ${activeTab === "overview" ? styles.tabBtnActive : ""}`}
            >
              <div className={styles.tabBtnLeft}>
                <Database size={16} />
                <span>Overview & Metrics</span>
              </div>
              <span className={`${styles.tabCountBadge} ${activeTab === "overview" ? styles.tabCountBadgeActive : ""}`}>
                {summary?.totalRecords ?? 0}
              </span>
            </button>
          </div>

          {ADMIN_CATEGORIES.map((category) => {
            const modelsInCategory = Object.values(ADMIN_MODEL_REGISTRY).filter((m) => m.category === category);
            return (
              <div key={category}>
                <div className={styles.sidebarSectionTitle}>{category}</div>
                {modelsInCategory.map((meta) => {
                  const count = summary?.counts[meta.key] ?? 0;
                  const isActive = activeTab === meta.key;
                  return (
                    <button
                      key={meta.key}
                      onClick={() => handleTabSwitch(meta.key)}
                      className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
                    >
                      <div className={styles.tabBtnLeft}>
                        {getCategoryIcon(meta.category)}
                        <span title={meta.displayName}>{meta.displayName}</span>
                      </div>
                      <span className={`${styles.tabCountBadge} ${isActive ? styles.tabCountBadgeActive : ""}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Right Content Area */}
        <main className={styles.content}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              {/* Stat Cards */}
              <div className={styles.overviewGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statCardHeader}>
                    <span className={styles.statLabel}>Total DB Records</span>
                    <div className={styles.statIconWrapper}>
                      <Database size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{summary?.totalRecords.toLocaleString() ?? "0"}</div>
                  <div className={styles.statDesc}>Across all 17 database models</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statCardHeader}>
                    <span className={styles.statLabel}>Registered Models</span>
                    <div className={styles.statIconWrapper}>
                      <Layers size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{summary?.modelCount ?? 17}</div>
                  <div className={styles.statDesc}>5 primary platform domains</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statCardHeader}>
                    <span className={styles.statLabel}>Cubicon Attempts</span>
                    <div className={styles.statIconWrapper}>
                      <Box size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>
                    {summary?.counts.cubiconAttempt?.toLocaleString() ?? "0"}
                  </div>
                  <div className={styles.statDesc}>3D puzzle validation clicks</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statCardHeader}>
                    <span className={styles.statLabel}>Inquiries & Leads</span>
                    <div className={styles.statIconWrapper}>
                      <Mail size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>
                    {((summary?.counts.contactInquiry ?? 0) + (summary?.counts.cubiconRegistration ?? 0)).toLocaleString()}
                  </div>
                  <div className={styles.statDesc}>Contact and registration leads</div>
                </div>
              </div>

              {/* Category Explorer */}
              <div className={styles.categoriesSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Domain Overview</h2>
                </div>
                <div className={styles.categoryCardsGrid}>
                  {ADMIN_CATEGORIES.map((cat) => {
                    const count = summary?.categoryCounts[cat] ?? 0;
                    const models = Object.values(ADMIN_MODEL_REGISTRY).filter((m) => m.category === cat);
                    return (
                      <div
                        key={cat}
                        className={styles.categoryCard}
                        onClick={() => handleTabSwitch(models[0].key)}
                      >
                        <div className={styles.categoryCardTitle}>
                          <span>{cat}</span>
                          {getCategoryIcon(cat)}
                        </div>
                        <div className={styles.categoryCardCount}>{count.toLocaleString()} rows</div>
                        <div className={styles.categoryCardModels}>
                          {models.map((m) => (
                            <span key={m.key} className={styles.modelPill}>
                              {m.displayName} ({summary?.counts[m.key] ?? 0})
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Recent Database Activity</h2>
                </div>
                <div className={styles.activityGrid}>
                  {/* Recent Inquiries */}
                  <div className={styles.activityCard}>
                    <div className={styles.activityCardTitle}>
                      <Mail size={16} /> Latest Contact Inquiries
                    </div>
                    {summary?.recentActivity.inquiries.length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No inquiries yet.</p>
                    )}
                    {summary?.recentActivity.inquiries.map((inq: any) => (
                      <div key={inq.id} className={styles.activityItem}>
                        <div className={styles.activityItemMain}>
                          <span>{inq.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {new Date(inq.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className={styles.activityItemSub}>
                          {inq.email} {inq.company ? `• ${inq.company}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recent Feedback */}
                  <div className={styles.activityCard}>
                    <div className={styles.activityCardTitle}>
                      <Activity size={16} /> Latest Feedback Submissions
                    </div>
                    {summary?.recentActivity.feedback.length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No feedback yet.</p>
                    )}
                    {summary?.recentActivity.feedback.map((fb: any) => (
                      <div key={fb.id} className={styles.activityItem}>
                        <div className={styles.activityItemMain}>
                          <span>{fb.userEmail || "Anonymous"}</span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--interactive-orange)" }}>
                            ★ {fb.rating}/5
                          </span>
                        </div>
                        <div className={styles.activityItemSub}>{fb.feedbackText}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent Sessions */}
                  <div className={styles.activityCard}>
                    <div className={styles.activityCardTitle}>
                      <Box size={16} /> Recent Cubicon Sessions
                    </div>
                    {summary?.recentActivity.sessions.length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No sessions yet.</p>
                    )}
                    {summary?.recentActivity.sessions.map((sess: any) => (
                      <div key={sess.id} className={styles.activityItem}>
                        <div className={styles.activityItemMain}>
                          <span style={{ fontFamily: "monospace" }}>{sess.session_id.substring(0, 18)}...</span>
                          <span style={{ fontSize: "0.75rem" }}>
                            Passed: {sess.passedPuzzles}/{sess.totalPuzzlesAttempted}
                          </span>
                        </div>
                        <div className={styles.activityItemSub}>
                          {sess.user_email || "Unregistered visitor"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECIFIC MODEL TABLE EXPLORER */}
          {activeTab !== "overview" && currentModelMeta && (
            <div>
              {/* Table Top Header */}
              <div className={styles.tableHeaderContainer}>
                <div className={styles.tableTitleGroup}>
                  <h2 className={styles.tableTitle}>
                    {currentModelMeta.displayName}
                    <span className={styles.tableCategoryBadge}>{currentModelMeta.category}</span>
                  </h2>
                  <p className={styles.tableDescription}>{currentModelMeta.description}</p>
                </div>

                <div className={styles.tableActions}>
                  <button onClick={openCreateModal} className={styles.createBtn}>
                    <Plus size={16} /> Create Record
                  </button>
                  <button onClick={exportCSV} className={styles.exportBtn} title="Download CSV">
                    <Download size={14} /> Export CSV
                  </button>
                  <button onClick={exportJSON} className={styles.exportBtn} title="Download JSON">
                    <Download size={14} /> Export JSON
                  </button>
                </div>
              </div>

              {/* Table Filter / Search Controls */}
              <div className={styles.filterBar}>
                <div className={styles.searchBox}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={`Search ${currentModelMeta.searchableFields.join(", ")}...`}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className={styles.pageSizeControl}>
                  <span>Rows per page:</span>
                  <select
                    className={styles.pageSizeSelect}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {tableError && <div className={styles.errorBanner}>{tableError}</div>}

              {/* Table Records */}
              <div className={styles.tableWrapper}>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {currentModelMeta.fields
                          .filter((f) => !f.hiddenInTable)
                          .map((f) => {
                            const isSorted = sortBy === f.name;
                            return (
                              <th
                                key={f.name}
                                className={styles.tableTh}
                                onClick={() => handleSortToggle(f.name)}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                  <span>{f.label}</span>
                                  {isSorted ? (
                                    sortOrder === "asc" ? (
                                      <ArrowUp size={12} />
                                    ) : (
                                      <ArrowDown size={12} />
                                    )
                                  ) : (
                                    <ArrowUpDown size={12} opacity={0.3} />
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        <th className={styles.tableTh} style={{ textAlign: "right" }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingTable ? (
                        <tr>
                          <td
                            colSpan={currentModelMeta.fields.length + 1}
                            style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}
                          >
                            <RefreshCw size={24} className="spin" style={{ animation: "spin 1s linear infinite", marginBottom: "0.5rem" }} />
                            <p>Loading {currentModelMeta.displayName} records...</p>
                          </td>
                        </tr>
                      ) : records.length === 0 ? (
                        <tr>
                          <td
                            colSpan={currentModelMeta.fields.length + 1}
                            style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}
                          >
                            No records found in this table.
                          </td>
                        </tr>
                      ) : (
                        records.map((row, idx) => {
                          const rowId = row[currentModelMeta.idField];
                          return (
                            <tr key={rowId || idx} className={styles.tableTr}>
                              {currentModelMeta.fields
                                .filter((f) => !f.hiddenInTable)
                                .map((f) => {
                                  const val = row[f.name];

                                  // Format values
                                  let renderedVal: React.ReactNode = String(val ?? "-");
                                  if (f.name === "passwordStatus" || f.type === "masked") {
                                    renderedVal = (
                                      <span className={styles.badgeSensitive}>
                                        <Lock size={10} style={{ marginRight: 4 }} />
                                        {val || "[Configured]"}
                                      </span>
                                    );
                                  } else if (f.type === "boolean") {
                                    renderedVal = val ? (
                                      <span className={styles.badgeBooleanTrue}>True</span>
                                    ) : (
                                      <span className={styles.badgeBooleanFalse}>False</span>
                                    );
                                  } else if (f.type === "datetime" && val) {
                                    renderedVal = new Date(val).toLocaleString();
                                  } else if (f.type === "json" && val) {
                                    renderedVal = (
                                      <span className={styles.badgeJson} title={String(val)}>
                                        {String(val).substring(0, 30)}...
                                      </span>
                                    );
                                  } else if (f.name === "publicUrl" || f.name === "mediaUrl" || f.name === "image") {
                                    renderedVal = (
                                      <a
                                        href={String(val)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "var(--interactive-blue)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
                                      >
                                        View Asset <ExternalLink size={12} />
                                      </a>
                                    );
                                  }

                                  return (
                                    <td key={f.name} className={styles.tableTd}>
                                      {renderedVal}
                                    </td>
                                  );
                                })}

                              {/* Row Actions */}
                              <td className={styles.tableTd} style={{ textAlign: "right" }}>
                                <div className={styles.rowActions} style={{ justifyContent: "flex-end" }}>
                                  <button
                                    onClick={() => setInspectRecord(row)}
                                    className={styles.actionIconBtn}
                                    title="Inspect Record Details"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(row)}
                                    className={styles.actionIconBtn}
                                    title="Edit Record"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmRecord(row)}
                                    className={`${styles.actionIconBtn} ${styles.deleteIconBtn}`}
                                    title="Delete Record"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className={styles.paginationBar}>
                  <div>
                    Showing {records.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                    {Math.min(currentPage * pageSize, totalRecordsCount)} of {totalRecordsCount} records
                  </div>

                  <div className={styles.paginationControls}>
                    <button
                      className={styles.pageBtn}
                      disabled={currentPage <= 1 || isLoadingTable}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className={styles.pageBtn}
                      disabled={currentPage >= totalPages || isLoadingTable}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: INSPECT RECORD */}
      {inspectRecord && currentModelMeta && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Inspect Record Details</h3>
              <button onClick={() => setInspectRecord(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {currentModelMeta.fields.map((f) => (
                <div key={f.name} className={styles.detailRow}>
                  <div className={styles.detailKey}>{f.label}</div>
                  <div className={styles.detailVal}>
                    {f.type === "datetime" && inspectRecord[f.name]
                      ? new Date(inspectRecord[f.name]).toLocaleString()
                      : typeof inspectRecord[f.name] === "object"
                      ? JSON.stringify(inspectRecord[f.name])
                      : String(inspectRecord[f.name] ?? "-")}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Raw JSON Payload</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(inspectRecord, null, 2), "json")}
                    className={styles.exportBtn}
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                  >
                    {copiedKey === "json" ? <Check size={12} color="green" /> : <Copy size={12} />}
                    {copiedKey === "json" ? "Copied" : "Copy JSON"}
                  </button>
                </div>
                <pre className={styles.jsonViewer}>{JSON.stringify(inspectRecord, null, 2)}</pre>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setInspectRecord(null)} className={styles.cancelBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE RECORD */}
      {createModalOpen && currentModelMeta && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New {currentModelMeta.displayName} Record</h3>
              <button onClick={() => setCreateModalOpen(false)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className={styles.modalBody}>
                {formError && <div className={styles.errorBanner}>{formError}</div>}

                {currentModelMeta.fields
                  .filter((f) => !f.readOnly)
                  .map((f) => (
                    <div key={f.name} className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        {f.label} {f.required && <span style={{ color: "#c92a2a" }}>*</span>}
                      </label>

                      {f.options ? (
                        <select
                          className={styles.formSelect}
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        >
                          {f.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : f.type === "boolean" ? (
                        <select
                          className={styles.formSelect}
                          value={formData[f.name] ? "true" : "false"}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value === "true" })}
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : f.type === "json" ? (
                        <textarea
                          className={`${styles.formTextarea} ${styles.codeArea}`}
                          placeholder="{}"
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        />
                      ) : f.type === "number" || f.type === "float" ? (
                        <input
                          type="number"
                          step={f.type === "float" ? "0.01" : "1"}
                          className={styles.formInput}
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          required={f.required}
                        />
                      ) : f.type === "masked" ? (
                        <input
                          type="password"
                          className={styles.formInput}
                          placeholder="••••••••"
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        />
                      ) : (
                        <input
                          type="text"
                          className={styles.formInput}
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          required={f.required}
                        />
                      )}
                    </div>
                  ))}
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className={styles.cancelBtn}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT RECORD */}
      {editRecord && currentModelMeta && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Edit {currentModelMeta.displayName} Record #{editRecord[currentModelMeta.idField]}
              </h3>
              <button onClick={() => setEditRecord(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.modalBody}>
                {formError && <div className={styles.errorBanner}>{formError}</div>}

                {currentModelMeta.fields
                  .filter((f) => !f.readOnly)
                  .map((f) => (
                    <div key={f.name} className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        {f.label} {f.required && <span style={{ color: "#c92a2a" }}>*</span>}
                      </label>

                      {f.options ? (
                        <select
                          className={styles.formSelect}
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        >
                          {f.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : f.type === "boolean" ? (
                        <select
                          className={styles.formSelect}
                          value={formData[f.name] ? "true" : "false"}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value === "true" })}
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : f.type === "json" ? (
                        <textarea
                          className={`${styles.formTextarea} ${styles.codeArea}`}
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        />
                      ) : f.type === "number" || f.type === "float" ? (
                        <input
                          type="number"
                          step={f.type === "float" ? "0.01" : "1"}
                          className={styles.formInput}
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          required={f.required}
                        />
                      ) : f.type === "masked" ? (
                        <div>
                          <input
                            type="password"
                            className={styles.formInput}
                            placeholder="Leave blank to keep current password"
                            value={formData[f.name] ?? ""}
                            onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          />
                          <span className={styles.formHelper}>Leave blank if you do not want to change password.</span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          className={styles.formInput}
                          value={formData[f.name] ?? ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          required={f.required}
                        />
                      )}
                    </div>
                  ))}
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setEditRecord(null)}
                  className={styles.cancelBtn}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deleteConfirmRecord && currentModelMeta && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent} style={{ maxWidth: "480px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: "#c92a2a" }}>
                Confirm Record Deletion
              </h3>
              <button onClick={() => setDeleteConfirmRecord(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {formError && <div className={styles.errorBanner}>{formError}</div>}
              <p style={{ fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to permanently delete record{" "}
                <strong>#{deleteConfirmRecord[currentModelMeta.idField]}</strong> from{" "}
                <strong>{currentModelMeta.displayName}</strong>?
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                This action cannot be undone and will immediately remove the record from the database.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setDeleteConfirmRecord(null)}
                className={styles.cancelBtn}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className={styles.deleteConfirmBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
