"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface SavedRecord {
  id: string;
  publicUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export default function FileUploadDemoPage() {
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);
  const [assigningButtonId, setAssigningButtonId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  // Active button list matching Dashboard / Services buttons + Thought Leadership buttons
  const [mockButtons, setMockButtons] = useState([
    { id: 1, label: "Define It", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 2, label: "Host", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 3, label: "Respondent Validation", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 4, label: "Refine It", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 5, label: "Analyze It", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 6, label: "Story Based", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 7, label: "Build It", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 8, label: "Apply It", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 9, label: "Buyer Drivers", mediaUrl: "https://www.buyfacts.com/", icon: Globe, category: "Services" },
    { id: 10, label: "Survey Respondent Engagement", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", icon: Volume2, category: "Thought Leadership" },
    { id: 11, label: "Content Creation", mediaUrl: "https://www.orimi.com/pdf-test.pdf", icon: FileText, category: "Thought Leadership" },
    { id: 12, label: "Research Methods", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", icon: MonitorPlay, category: "Thought Leadership" },
    { id: 13, label: "Research Speed", mediaUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80", icon: Globe, category: "Thought Leadership" },
    { id: 14, label: "Hybrid Marketing", mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", icon: MonitorPlay, category: "Thought Leadership" },
    { id: 15, label: "Marketing Influence", mediaUrl: "https://pdfobject.com/pdf/sample.pdf", icon: FileText, category: "Thought Leadership" },
  ]);

  // Callback when a file is successfully uploaded
  const handleUploadSuccess = (result: UploadSuccessResult) => {
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
  };

  const handleAssignUrl = (buttonId: number, url: string) => {
    setMockButtons((prev) =>
      prev.map((btn) => (btn.id === buttonId ? { ...btn, mediaUrl: url } : btn))
    );
    setAssigningButtonId(buttonId);
    setTimeout(() => setAssigningButtonId(null), 1500);
  };

  const triggerPreview = (url: string, label: string) => {
    setPreviewUrl(url);
    setPreviewName(label);
  };

  return (
    <div className={styles.wrapper}>
      {/* Background Decorators */}
      <div className="glow-blob blob-blue" style={{ zIndex: 0, opacity: 0.08 }} />
      <div className="glow-blob blob-green" style={{ zIndex: 0, opacity: 0.08 }} />
      
      <div className="w-full relative z-50">
        <Navbar />
      </div>

      {/* Centered Main Wrapper with Massive Side Padding */}
      <main className={styles.container}>
        
        {/* Page Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Sparkles className="w-3.5 h-3.5" /> Media Console
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
                    const BtnIcon = btn.icon;
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
                onClick={() => setSavedRecords([])}
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

      <div className="w-full relative z-50">
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
