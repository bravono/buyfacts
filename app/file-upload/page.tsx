"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileUploader, UploadSuccessResult } from "@/components/FileUploader";
import { FilePreview } from "@/components/FilePreview";
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
  User,
  Mail,
  Loader2,
  LogOut
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
  
  // Auth State
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check existing session
  useEffect(() => {
    const checkSession = () => {
      const storedSession = localStorage.getItem("uploadAuth");
      if (storedSession === "true") {
        setIsAuthorized(true);
      }
      setIsCheckingSession(false);
    };
    checkSession();
  }, []);

  // Fetch buttons and history log on mount (only if authorized)
  useEffect(() => {
    if (isAuthorized) {
      fetchButtons();
      fetchHistory();
    }
  }, [isAuthorized]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-uploader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, name: authName }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthorized(true);
        localStorage.setItem("uploadAuth", "true");
      } else {
        setAuthError(data.error || "Authorization failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setAuthError("Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("uploadAuth");
    setIsAuthorized(false);
    setAuthEmail("");
    setAuthName("");
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

  // Callback when a file is successfully uploaded
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
        setMockButtons(prev =>
          prev.map(btn => (btn.id === buttonId ? { ...btn, mediaUrl: url } : btn))
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

  const triggerPreview = (url: string, label: string) => {
    setPreviewUrl(url);
    setPreviewName(label);
  };

  const getIconForType = (type: string) => {
    switch (type?.toLowerCase()) {
      case "video": return MonitorPlay;
      case "audio": return Volume2;
      case "pdf": return FileText;
      default: return Globe;
    }
  };

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
              {authError && (
                <div className={styles.loginError}>
                  {authError}
                </div>
              )}
              
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Full Name
                </label>
                <div className={styles.inputWrapper}>
                  <User className={styles.inputIcon} />
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    required
                    className={styles.inputField}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Email Address
                </label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.inputIcon} />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className={styles.inputField}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className={styles.loginSubmitBtn}
              >
                {isVerifying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
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

      {/* Centered Main Wrapper with Massive Side Padding */}
      <main className={styles.container}>
        
        {/* Page Header */}
        <div className={styles.header}>
          <div className="flex flex-col items-center gap-4">
            <div className={styles.badge}>
              <Sparkles className="w-3.5 h-3.5" /> Media Console
            </div>
            <button 
              onClick={handleLogout}
              className={styles.logoutBtn}
            >
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
          <h1 className={`${styles.title} text-gradient`}>
            Asset Ingestion & Linking
          </h1>
          <p className={styles.subtitle}>
            Upload assets directly to cloud storage, stage the public URLs, and assign them dynamically to your dashboard buttons.
          </p>
        </div>

        {/* Section 1: Ingestion Dashboard */}
        <div className={styles.section}>
          <div className={styles.stagerCard}>
            <h2 className={styles.sectionTitle}>
              <Upload className="w-5 h-5 text-[var(--interactive-orange)]" />
              1. Upload Assets
            </h2>
            <FileUploader
              onUploadSuccess={handleUploadSuccess}
              folderPrefix="media"
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
            <div className={styles.urlBox}>
              {lastUploadedUrl}
            </div>
          ) : (
            <div className={styles.placeholderText}>
              <div className={styles.pulseDot}></div>
              Upload an asset above or select from "Upload History" to stage a link.
            </div>
          )}
        </div>

        {/* Section 3: Component Button Grid */}
        <div className={styles.section}>
          <div className={styles.sectionTitle} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Grid className="w-5 h-5 text-[var(--interactive-blue)]" />
            3. Interactive Component Grid
          </div>

          {["Services", "Thought Leadership"].map((category) => (
            <div key={category} className={styles.categoryGroup}>
              <h4 className={styles.categoryTitle}>
                {category} Buttons
              </h4>

              {/* Grid Layout containing beautifully styled cards */}
              <div className={styles.grid}>
                {mockButtons
                  .filter((btn) => btn.category === category)
                  .map((btn) => {
                    const BtnIcon = getIconForType(btn.mediaType);
                    return (
                      <div key={btn.id} className={styles.card}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                              <BtnIcon className="w-4 h-4" />
                            </div>
                            <span className={styles.cardLabel}>
                              {btn.label}
                            </span>
                          </div>

                          {/* Link Container with proper vertical spacing */}
                          <div className={styles.linkSection}>
                            <span className={styles.linkLabel}>
                              Assigned Link
                            </span>
                            <div className={styles.linkBox} title={btn.mediaUrl}>
                              {btn.mediaUrl}
                            </div>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className={styles.cardFooter}>
                          {/* Link URL Button */}
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

                          {/* Preview linked asset button */}
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

        {/* Section 4: History log */}
        <div className={styles.stagerCard}>
          <div className={styles.stagerHeader} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
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
            <div className={styles.placeholderText} style={{ justifyContent: 'center', padding: '1rem 0' }}>
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
                    <span className={styles.historyName}>
                      {record.fileName}
                    </span>
                    <span className={styles.historyUrl}>
                      {record.publicUrl}
                    </span>
                  </div>
                  <span className={styles.historyTime}>
                    {record.uploadedAt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Lightbox / Overlay Preview Modal */}
      {previewUrl && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            
            {/* Modal header */}
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalLabel}>
                  Media Preview
                </span>
                <h3 className={styles.modalTitle}>
                  {previewName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className={styles.closeBtn}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal content body */}
            <div className={styles.modalBody}>
              <FilePreview url={previewUrl} fileName={previewName} className="border-0 shadow-none p-0 bg-transparent dark:bg-transparent" />
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
