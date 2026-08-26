"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileUploader, UploadSuccessResult } from "@/components/FileUploader";
import { FilePreview } from "@/components/FilePreview";
import { STORAGE_FOLDERS, MinioObjectItem, sanitizeFolderPrefix } from "@/lib/minio";
import styles from "./page.module.css";
import {
  Database,
  Upload,
  Link as LinkIcon,
  Check,
  Globe,
  MonitorPlay,
  FileText,
  Volume2,
  Eye,
  X,
  Sparkles,
  Grid,
  Lock,
  KeyRound,
  Mail,
  Loader2,
  LogOut,
  Folder,
  FolderTree,
  ArrowRightLeft,
  Trash2,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  Layers,
} from "lucide-react";

interface SavedRecord {
  id: string;
  publicUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

interface DatabaseButton {
  id: string;
  label: string;
  mediaUrl: string;
  mediaType: string;
  subtitle: string | null;
  category: string;
}

export default function FileUploadDemoPage() {
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);
  const [assigningButtonId, setAssigningButtonId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [mockButtons, setMockButtons] = useState<DatabaseButton[]>([]);

  // Storage Explorer State
  const [storageFiles, setStorageFiles] = useState<MinioObjectItem[]>([]);
  const [isLoadingStorage, setIsLoadingStorage] = useState<boolean>(false);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Move File Modal State
  const [movingFile, setMovingFile] = useState<MinioObjectItem | null>(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string>("products-services");
  const [customMoveFolder, setCustomMoveFolder] = useState<string>("");
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [moveError, setMoveError] = useState<string>("");

  // Auth State
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check existing session via /api/auth/me
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.authenticated) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch {
        setIsAuthorized(false);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  // Fetch buttons, storage files, and history log on mount (only if authorized)
  useEffect(() => {
    if (isAuthorized) {
      fetchButtons();
      fetchHistory();
      fetchStorageFiles(selectedFolderFilter);
    }
  }, [isAuthorized, selectedFolderFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthorized(true);
        setAuthPassword("");
      } else {
        setAuthError(data.error || "Authorization failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setAuthError("Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setIsAuthorized(false);
    setAuthEmail("");
    setAuthPassword("");
  };

  const fetchButtons = async () => {
    try {
      const res = await fetch("/api/buttons");
      const data = await res.json();
      if (data.success) {
        setMockButtons(data.buttons);
      }
    } catch (err) {
      console.error("Error fetching buttons:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/media-assets");
      const data = await res.json();
      if (data.success) {
        const records: SavedRecord[] = data.assets.map((item: any) => ({
          id: item.id,
          publicUrl: item.publicUrl,
          fileName: item.fileName,
          fileType: item.fileType,
          fileSize: item.fileSize,
          uploadedAt: new Date(item.uploadedAt).toLocaleTimeString(),
        }));
        setSavedRecords(records);
      }
    } catch (err) {
      console.error("Error fetching upload history:", err);
    }
  };

  const fetchStorageFiles = async (folder = "all") => {
    setIsLoadingStorage(true);
    try {
      const res = await fetch(`/api/storage/files?folder=${encodeURIComponent(folder)}`);
      const data = await res.json();
      if (data.success) {
        setStorageFiles(data.files);
      }
    } catch (err) {
      console.error("Error fetching storage files:", err);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  // Callback when a single file is successfully uploaded
  const handleUploadSuccess = async (result: UploadSuccessResult) => {
    try {
      const res = await fetch("/api/media-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicUrl: result.publicUrl,
          fileName: result.fileName,
          fileType: result.fileType,
          fileSize: result.fileSize,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLastUploadedUrl(result.publicUrl);
        fetchHistory();
        fetchStorageFiles(selectedFolderFilter);
      }
    } catch (err) {
      console.error("Failed to log upload:", err);
      const newRecord: SavedRecord = {
        id: Math.random().toString(36).substring(2, 9),
        publicUrl: result.publicUrl,
        fileName: result.fileName,
        fileType: result.fileType,
        fileSize: result.fileSize,
        uploadedAt: new Date().toLocaleTimeString(),
      };
      setSavedRecords((prev) => [newRecord, ...prev]);
      setLastUploadedUrl(result.publicUrl);
      fetchStorageFiles(selectedFolderFilter);
    }
  };

  // Callback when a batch of files is successfully uploaded
  const handleBatchUploadSuccess = async (results: UploadSuccessResult[]) => {
    try {
      const res = await fetch("/api/media-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: results.map((r) => ({
            publicUrl: r.publicUrl,
            fileName: r.fileName,
            fileType: r.fileType,
            fileSize: r.fileSize,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (results.length > 0) {
          setLastUploadedUrl(results[results.length - 1].publicUrl);
        }
        fetchHistory();
        fetchStorageFiles(selectedFolderFilter);
      }
    } catch (err) {
      console.error("Failed to log batch upload:", err);
      fetchHistory();
      fetchStorageFiles(selectedFolderFilter);
    }
  };

  const handleAssignUrl = async (buttonId: string, url: string) => {
    setAssigningButtonId(buttonId);
    try {
      const res = await fetch("/api/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: buttonId,
          mediaUrl: url,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMockButtons((prev) =>
          prev.map((btn) => (btn.id === buttonId ? { ...btn, mediaUrl: url } : btn))
        );
      }
    } catch (err) {
      console.error("Failed to assign URL to button:", err);
    } finally {
      setTimeout(() => setAssigningButtonId(null), 1500);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/media-assets", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSavedRecords([]);
      }
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const handleDeleteStorageFile = async (objectKey: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${objectKey}"?`)) {
      return;
    }

    try {
      const res = await fetch("/api/storage/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey }),
      });

      const data = await res.json();
      if (data.success) {
        fetchStorageFiles(selectedFolderFilter);
        fetchHistory();
      } else {
        alert(data.error || "Failed to delete file.");
      }
    } catch (err) {
      console.error("Failed to delete storage file:", err);
      alert("Network error while deleting file.");
    }
  };

  const openMoveModal = (file: MinioObjectItem) => {
    setMovingFile(file);
    setMoveTargetFolder("products-services");
    setCustomMoveFolder("");
    setMoveError("");
  };

  const closeMoveModal = () => {
    setMovingFile(null);
    setIsMoving(false);
    setMoveError("");
  };

  const handleExecuteMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingFile) return;

    const targetFolder =
      moveTargetFolder === "custom"
        ? sanitizeFolderPrefix(customMoveFolder)
        : moveTargetFolder;

    if (!targetFolder) {
      setMoveError("Please specify a target folder.");
      return;
    }

    setIsMoving(true);
    setMoveError("");

    try {
      const res = await fetch("/api/storage/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceKey: movingFile.objectKey,
          targetFolder,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        closeMoveModal();
        fetchStorageFiles(selectedFolderFilter);
        fetchButtons();
        fetchHistory();
      } else {
        setMoveError(data.error || "Failed to move file.");
      }
    } catch (err) {
      console.error("Failed to move file:", err);
      setMoveError("Network error while moving file.");
    } finally {
      setIsMoving(false);
    }
  };

  const handleCopyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const triggerPreview = (url: string, label: string) => {
    setPreviewUrl(url);
    setPreviewName(label);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getIconForType = (type: string) => {
    switch (type?.toLowerCase()) {
      case "video":
        return MonitorPlay;
      case "audio":
        return Volume2;
      case "pdf":
        return FileText;
      default:
        return Globe;
    }
  };

  const filteredStorageFiles = storageFiles.filter((file) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      file.fileName.toLowerCase().includes(q) ||
      file.objectKey.toLowerCase().includes(q) ||
      file.folder.toLowerCase().includes(q)
    );
  });

  if (isCheckingSession) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loaderWrapper}>
          <Loader2 className={styles.loaderIcon} />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles.wrapper}>
        <div className="glow-blob blob-blue" style={{ zIndex: 0, opacity: 0.08 }} />
        <div className="glow-blob blob-green" style={{ zIndex: 0, opacity: 0.08 }} />

        <div className={styles.navWrapper}>
          <Navbar />
        </div>

        <main className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.loginHeader}>
              <div className={styles.loginIcon}>
                <Lock className="w-6 h-6" />
              </div>
              <h1 className={styles.loginTitle}>Restricted Access</h1>
              <p className={styles.loginSubtitle}>
                Please verify your identity to access the Media Console.
              </p>
            </div>

            <form onSubmit={handleLogin} className={styles.loginForm}>
              {authError && <div className={styles.loginError}>{authError}</div>}

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Email Address</label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.inputIcon} />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className={styles.inputField}
                    placeholder="admin@buyfacts.com"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Password</label>
                <div className={styles.inputWrapper}>
                  <KeyRound className={styles.inputIcon} />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    className={styles.inputField}
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className={styles.loginSubmitBtn}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Access Console"
                )}
              </button>
            </form>
          </div>
        </main>

        <div className={styles.navWrapper}>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Background Decorators */}
      <div className="glow-blob blob-blue" style={{ zIndex: 0, opacity: 0.08 }} />
      <div className="glow-blob blob-green" style={{ zIndex: 0, opacity: 0.08 }} />

      <div className={styles.navWrapper}>
        <Navbar />
      </div>

      {/* Main Container */}
      <main className={styles.container}>
        {/* Page Header */}
        <div className={styles.header}>
          <div className="flex flex-col items-center gap-4">
            <div className={styles.badge}>
              <Sparkles className="w-3.5 h-3.5" /> Media Console & Storage Manager
            </div>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
          <h1 className={`${styles.title} text-gradient`}>
            Asset Ingestion, Storage & Linking
          </h1>
          <p className={styles.subtitle}>
            Upload batch assets into designated folders, browse and move storage files across folders, and link URLs directly to dashboard buttons.
          </p>
        </div>

        {/* Section 1: Ingestion Dashboard */}
        <div className={styles.section}>
          <div className={styles.stagerCard}>
            <h2 className={styles.sectionTitle}>
              <Upload className="w-5 h-5 text-[var(--interactive-orange)]" />
              1. Upload Assets (Single or Batch)
            </h2>
            <FileUploader
              onUploadSuccess={handleUploadSuccess}
              onBatchUploadSuccess={handleBatchUploadSuccess}
              folderPrefix="products-services"
            />
          </div>
        </div>

        {/* Section 2: Active URL Staging Console */}
        <div className={styles.stagerCard}>
          <div className={styles.stagerHeader}>
            <div className={styles.stagerTitle}>
              <LinkIcon className="w-4 h-4 text-[var(--interactive-orange)]" />
              2. Active URL Stager
            </div>
            {lastUploadedUrl && (
              <button
                type="button"
                onClick={() => setLastUploadedUrl(null)}
                className={styles.clearBtn}
              >
                Clear Stage
              </button>
            )}
          </div>

          {lastUploadedUrl ? (
            <div className={styles.urlBox}>{lastUploadedUrl}</div>
          ) : (
            <div className={styles.placeholderText}>
              <div className={styles.pulseDot}></div>
              Upload assets above or click &quot;Stage&quot; on any file in Storage Explorer to stage a URL.
            </div>
          )}
        </div>

        {/* Section 3: Component Button Grid */}
        <div className={styles.section}>
          <div
            className={styles.sectionTitle}
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "0.5rem",
            }}
          >
            <Grid className="w-5 h-5 text-[var(--interactive-blue)]" />
            3. Interactive Component Grid
          </div>

          {["Products & Services", "Research Imperatives"].map((category) => (
            <div key={category} className={styles.categoryGroup}>
              <h4 className={styles.categoryTitle}>{category} Buttons</h4>

              <div className={styles.grid}>
                {mockButtons
                  .filter((btn) => btn.category === category)
                  .map((btn) => {
                    const BtnIcon = getIconForType(btn.mediaType);
                    return (
                      <div key={btn.id} className={styles.card}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                          }}
                        >
                          <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                              <BtnIcon className="w-4 h-4" />
                            </div>
                            <span className={styles.cardLabel}>{btn.label}</span>
                          </div>

                          <div className={styles.linkSection}>
                            <span className={styles.linkLabel}>Assigned Link</span>
                            <div className={styles.linkBox} title={btn.mediaUrl}>
                              {btn.mediaUrl}
                            </div>
                          </div>
                        </div>

                        <div className={styles.cardFooter}>
                          <button
                            type="button"
                            disabled={!lastUploadedUrl}
                            onClick={() => handleAssignUrl(btn.id, lastUploadedUrl!)}
                            className={`${styles.linkBtn} ${
                              assigningButtonId === btn.id
                                ? styles.linkBtnSuccess
                                : lastUploadedUrl
                                ? styles.linkBtnEnabled
                                : styles.linkBtnDisabled
                            }`}
                          >
                            {assigningButtonId === btn.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Linked!
                              </>
                            ) : (
                              "Link URL"
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => triggerPreview(btn.mediaUrl, btn.label)}
                            className={styles.previewIconBtn}
                            title="Preview Linked Asset"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Section 4: Storage Explorer & File Manager */}
        <div className={styles.stagerCard}>
          <div
            className={styles.stagerHeader}
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "0.5rem",
            }}
          >
            <div className={styles.stagerTitle}>
              <FolderTree className="w-4 h-4 text-[var(--interactive-orange)]" />
              4. Storage Explorer & File Manager ({filteredStorageFiles.length} file
              {filteredStorageFiles.length === 1 ? "" : "s"})
            </div>
            <button
              type="button"
              onClick={() => fetchStorageFiles(selectedFolderFilter)}
              className={styles.clearBtn}
              style={{ color: "var(--interactive-blue)", display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStorage ? "animate-spin" : ""}`} /> Refresh Storage
            </button>
          </div>

          {/* Search & Folder Filters */}
          <div className={styles.storageToolbar}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search storage files by filename or path..."
                className={styles.searchInput}
              />
            </div>

            <div className={styles.folderFilterBar}>
              <button
                type="button"
                onClick={() => setSelectedFolderFilter("all")}
                className={`${styles.folderTab} ${
                  selectedFolderFilter === "all" ? styles.folderTabActive : ""
                }`}
              >
                <Layers className="w-3 h-3" /> All Folders
              </button>
              {STORAGE_FOLDERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setSelectedFolderFilter(f.value)}
                  className={`${styles.folderTab} ${
                    selectedFolderFilter === f.value ? styles.folderTabActive : ""
                  }`}
                >
                  <Folder className="w-3 h-3" /> {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Storage Files List */}
          {isLoadingStorage ? (
            <div className={styles.placeholderText} style={{ justifyContent: "center", padding: "2rem 0" }}>
              <Loader2 className="w-5 h-5 animate-spin text-[var(--interactive-orange)]" />
              Loading MinIO storage files...
            </div>
          ) : filteredStorageFiles.length === 0 ? (
            <div className={styles.placeholderText} style={{ justifyContent: "center", padding: "2rem 0" }}>
              No files found in &quot;{selectedFolderFilter === "all" ? "storage" : selectedFolderFilter}&quot;.
            </div>
          ) : (
            <div className={styles.storageGrid}>
              {filteredStorageFiles.map((file) => (
                <div key={file.objectKey} className={styles.storageItem}>
                  <div className={styles.storageItemLeft}>
                    <div className={styles.storageItemIcon}>
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className={styles.storageItemMeta}>
                      <div className={styles.storageItemName} title={file.fileName}>
                        {file.fileName}
                      </div>
                      <div className={styles.storageItemDetails}>
                        <span className={styles.folderBadge}>{file.folder}</span>
                        <span>•</span>
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.storageItemActions}>
                    {/* Stage URL */}
                    <button
                      type="button"
                      onClick={() => setLastUploadedUrl(file.publicUrl)}
                      className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                      title="Stage URL for button linking"
                    >
                      <LinkIcon className="w-3 h-3" /> Stage
                    </button>

                    {/* Preview */}
                    <button
                      type="button"
                      onClick={() => triggerPreview(file.publicUrl, file.fileName)}
                      className={styles.actionBtn}
                      title="Preview File"
                    >
                      <Eye className="w-3 h-3" />
                    </button>

                    {/* Move File */}
                    <button
                      type="button"
                      onClick={() => openMoveModal(file)}
                      className={styles.actionBtn}
                      title="Move to another folder"
                    >
                      <ArrowRightLeft className="w-3 h-3" /> Move
                    </button>

                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(file.publicUrl, file.objectKey)}
                      className={styles.actionBtn}
                      title="Copy Public URL"
                    >
                      {copiedKey === file.objectKey ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteStorageFile(file.objectKey)}
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      title="Delete File"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: History log */}
        <div className={styles.stagerCard}>
          <div
            className={styles.stagerHeader}
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <h3 className={styles.stagerTitle}>
              <Database className="w-4 h-4 text-[var(--interactive-blue)]" />
              Upload History ({savedRecords.length})
            </h3>
            {savedRecords.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className={styles.clearBtn}
              >
                Clear History
              </button>
            )}
          </div>

          {savedRecords.length === 0 ? (
            <div
              className={styles.placeholderText}
              style={{ justifyContent: "center", padding: "1rem 0" }}
            >
              No files in local history.
            </div>
          ) : (
            <div className={styles.historyList}>
              {savedRecords.map((record) => (
                <div
                  key={record.id}
                  className={styles.historyItem}
                  onClick={() => setLastUploadedUrl(record.publicUrl)}
                  title="Click to stage this URL for button linking"
                >
                  <div className={styles.historyInfo}>
                    <span className={styles.historyName}>{record.fileName}</span>
                    <span className={styles.historyUrl}>{record.publicUrl}</span>
                  </div>
                  <span className={styles.historyTime}>{record.uploadedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Move File Modal */}
      {movingFile && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: "480px" }}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalLabel}>Storage File Manager</span>
                <h3 className={styles.modalTitle}>Move Object to Folder</h3>
              </div>
              <button
                type="button"
                onClick={closeMoveModal}
                className={styles.closeBtn}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteMove} className={styles.modalForm}>
              <div className={styles.modalFileSummary}>
                <div className={styles.modalFileName}>{movingFile.fileName}</div>
                <div className={styles.modalFileCurrent}>
                  Current Path: <span style={{ fontFamily: "monospace", color: "var(--interactive-blue)" }}>/{movingFile.objectKey}</span>
                </div>
              </div>

              {moveError && <div className={styles.loginError}>{moveError}</div>}

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Select Destination Folder</label>
                <select
                  value={moveTargetFolder}
                  onChange={(e) => setMoveTargetFolder(e.target.value)}
                  className={styles.inputField}
                  style={{ cursor: "pointer" }}
                >
                  {STORAGE_FOLDERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label} ({f.value}/)
                    </option>
                  ))}
                  <option value="custom">Custom subfolder...</option>
                </select>
              </div>

              {moveTargetFolder === "custom" && (
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Custom Folder Path</label>
                  <input
                    type="text"
                    value={customMoveFolder}
                    onChange={(e) => setCustomMoveFolder(e.target.value)}
                    required
                    placeholder="e.g. cubicon/models/2026, research/reports"
                    className={styles.inputField}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={closeMoveModal}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMoving}
                  className="btn btn-primary text-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  {isMoving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Moving...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Move Object
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Overlay Preview Modal */}
      {previewUrl && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalLabel}>Media Preview</span>
                <h3 className={styles.modalTitle}>{previewName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className={styles.closeBtn}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <FilePreview
                url={previewUrl}
                fileName={previewName}
                className="border-0 shadow-none p-0 bg-transparent dark:bg-transparent"
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.navWrapper}>
        <Footer />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--border-color);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

