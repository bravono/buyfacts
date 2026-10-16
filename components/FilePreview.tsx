'use client';

import React, { useState } from 'react';
import {
  FileText,
  FileCode,
  FileArchive,
  File as GenericFileIcon,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Film,
  Music,
  Image as ImageIcon,
} from 'lucide-react';
import styles from './FilePreview.module.css';
import {
  isPdfUrl,
  isDocxUrl,
  fetchAndConvertDocx,
  getOfficeViewerUrl,
} from '../lib/document-parser';

interface FilePreviewProps {
  url: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  url,
  fileName = 'Uploaded File',
  fileType = '',
  fileSize,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Format file size in human-readable string
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine media category based on MIME type or file extension
  const isImage =
    fileType.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(fileName);
  const isVideo =
    fileType.startsWith('video/') ||
    /\.(mp4|webm|ogg|mov|mkv)$/i.test(fileName);
  const isAudio =
    fileType.startsWith('audio/') ||
    /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(fileName);
  const isPdf =
    fileType === 'application/pdf' ||
    isPdfUrl(fileName) ||
    isPdfUrl(url);
  const isDocx =
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword' ||
    isDocxUrl(fileName) ||
    isDocxUrl(url);

  React.useEffect(() => {
    if (!isDocx || !url) {
      setDocxHtml(null);
      setIsLoadingDoc(false);
      setDocError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDoc(true);
    setDocError(null);

    fetchAndConvertDocx(url)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.html) {
          setDocxHtml(res.html);
        } else {
          setDocError(res.error || 'Failed to render document');
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Error converting document';
        setDocError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDoc(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isDocx, url]);

  return (
    <div className={`${styles.previewContainer} ${className}`}>
      {/* Top Bar: File Info & Actions */}
      <div className={styles.topBar}>
        <div className={styles.fileInfo}>
          <div className={styles.iconWrapper}>
            {isImage && <ImageIcon className="w-4 h-4" />}
            {isVideo && <Film className="w-4 h-4" />}
            {isAudio && <Music className="w-4 h-4" />}
            {(isPdf || isDocx) && <FileText className="w-4 h-4" />}
            {!isImage && !isVideo && !isAudio && !isPdf && !isDocx && <GenericFileIcon className="w-4 h-4" />}
          </div>
          <div className={styles.details}>
            <h4 className={styles.fileName} title={fileName}>
              {fileName}
            </h4>
            <p className={styles.fileMeta}>
              {fileType || 'Unknown type'}
              {fileSize && <span>• {formatBytes(fileSize)}</span>}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleCopyLink}
            className={styles.actionBtn}
            title="Copy Direct URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open</span>
          </a>
        </div>
      </div>

      {/* Direct Content Viewer / Player */}
      <div className={styles.viewerArea}>
        {/* IMAGE PREVIEW */}
        {isImage && (
          <div className={styles.imageWrapper}>
            <img
              src={url}
              alt={fileName}
              className={styles.image}
              loading="lazy"
            />
          </div>
        )}

        {/* VIDEO PLAYER */}
        {isVideo && (
          <video
            src={url}
            controls
            preload="metadata"
            className={styles.video}
          >
            Your browser does not support playing this video directly.
          </video>
        )}

        {/* AUDIO PLAYER */}
        {isAudio && (
          <div className={styles.audioWrapper}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--interactive-blue)' }}>
              <Music className="w-8 h-8 animate-bounce" />
            </div>
            <audio src={url} controls className={styles.audio}>
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* PDF VIEWING IFRAME */}
        {isPdf && (
          <div className={styles.pdfWrapper}>
            {!pdfError ? (
              <iframe
                src={`${url}#view=FitH&toolbar=0`}
                className={styles.iframe}
                onError={() => setPdfError(true)}
                title={fileName}
              />
            ) : (
              <div className={styles.fallbackBox}>
                <FileText className="w-10 h-10" style={{ color: 'var(--interactive-blue)' }} />
                <p className={styles.fallbackTitle}>PDF Preview not available in frame.</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View Full PDF
                </a>
              </div>
            )}
          </div>
        )}

        {/* DOCX VIEWING CONTAINER */}
        {isDocx && (
          <div className={styles.pdfWrapper}>
            {isLoadingDoc && (
              <div className={styles.fallbackBox}>
                <FileText className="w-8 h-8 animate-pulse" style={{ color: 'var(--interactive-blue)' }} />
                <p className={styles.fallbackTitle}>Converting Word document for viewing...</p>
              </div>
            )}
            {!isLoadingDoc && !docError && docxHtml && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  overflowY: 'auto',
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #E6E6E6)',
                  color: '#334155',
                  fontSize: '0.88rem',
                  lineHeight: '1.6',
                }}
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            )}
            {!isLoadingDoc && (docError || !docxHtml) && (
              <iframe
                src={getOfficeViewerUrl(url)}
                className={styles.iframe}
                title={fileName}
              />
            )}
          </div>
        )}

        {/* GENERIC DOCUMENT / OTHER FILES */}
        {!isImage && !isVideo && !isAudio && !isPdf && !isDocx && (
          <div className={styles.fallbackBox}>
            <GenericFileIcon className="w-10 h-10" style={{ color: 'var(--interactive-blue)' }} />
            <div>
              <p className={styles.fallbackTitle}>{fileName}</p>
              <p className={styles.fallbackDesc}>
                Direct view not available in inline player for this file format.
              </p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open File
            </a>
          </div>
        )}
      </div>

      {/* Database Integration Helper Note */}
      <div className={styles.dbBox}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Public URL: {url}</span>
        <span className={styles.dbBadge}>
          Ready for DB
        </span>
      </div>
    </div>
  );
};
