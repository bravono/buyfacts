"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Download,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  isPdfUrl,
  isDocxUrl,
  fetchAndConvertDocx,
  getOfficeViewerUrl,
} from "@/lib/document-parser";
import styles from "./viewer.module.css";

function DocumentViewerContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "/sample-details.pdf";
  const title = searchParams.get("title") || "Document Reader";

  const isDocx = isDocxUrl(url);
  const isPdf = isPdfUrl(url) || !isDocx;

  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isDocx);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDocx || !url) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    fetchAndConvertDocx(url)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.html) {
          setDocxHtml(res.html);
          setLoadError(null);
        } else {
          setLoadError(res.error || "Failed to render Word document");
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Error reading document";
        setLoadError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isDocx, url]);

  const handleDownload = () => {
    const extension = isDocx ? "docx" : "pdf";
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.${extension}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }
  };

  return (
    <div className={styles.viewerPage}>
      {/* Top Navigation Bar */}
      <header className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            onClick={handleClose}
            className={styles.backButton}
            title="Go back or close"
          >
            <ArrowLeft size={18} />
            <span>Close</span>
          </button>
          <div className={styles.titleGroup}>
            <div className={styles.formatBadge}>
              <FileText size={15} />
              <span>{isDocx ? "Word Document (.docx)" : "PDF Document"}</span>
            </div>
            <h1 className={styles.documentTitle}>{title}</h1>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            onClick={handleDownload}
            className={styles.downloadButton}
            title="Download local copy"
          >
            <Download size={15} />
            <span>Download Copy</span>
          </button>
        </div>
      </header>

      {/* Main Document Frame */}
      <main className={styles.viewerContainer}>
        {isPdf ? (
          <iframe
            src={`${url}#view=FitH&toolbar=1`}
            className={styles.pdfIframe}
            title={title}
          />
        ) : isLoading ? (
          <div className={styles.loadingContainer}>
            <Loader2 size={36} className={styles.spinner} />
            <p>Formatting Word document for reading...</p>
          </div>
        ) : loadError || !docxHtml ? (
          <div className={styles.fallbackContainer}>
            <iframe
              src={getOfficeViewerUrl(url)}
              className={styles.pdfIframe}
              title={title}
            />
          </div>
        ) : (
          <div className={styles.docxReaderScroll}>
            <div
              className={styles.docxReaderContent}
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function DocumentViewerPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "2rem", color: "#64748b", textAlign: "center" }}>
          Loading document reader...
        </div>
      }
    >
      <DocumentViewerContent />
    </Suspense>
  );
}
