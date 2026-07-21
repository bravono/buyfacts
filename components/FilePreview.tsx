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
    /\.pdf$/i.test(fileName);

  return (
    <div className={`glass-card p-5 border border-[var(--border-color)] rounded-xl space-y-4 bg-white/80 dark:bg-zinc-900/80 shadow-md ${className}`}>
      {/* Top Bar: File Info & Actions */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-lg bg-[var(--interactive-blue)]/10 text-[var(--interactive-blue)] shrink-0">
            {isImage && <ImageIcon className="w-5 h-5" />}
            {isVideo && <Film className="w-5 h-5" />}
            {isAudio && <Music className="w-5 h-5" />}
            {isPdf && <FileText className="w-5 h-5" />}
            {!isImage && !isVideo && !isAudio && !isPdf && <GenericFileIcon className="w-5 h-5" />}
          </div>
          <div className="truncate">
            <h4 className="font-semibold text-sm truncate text-[var(--text-color)]" title={fileName}>
              {fileName}
            </h4>
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
              {fileType || 'Unknown type'}
              {fileSize && <span>• {formatBytes(fileSize)}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 text-xs font-medium rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-alt)] transition-colors flex items-center gap-1.5 text-[var(--text-color)]"
            title="Copy Direct URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-xs font-medium rounded-lg bg-[var(--interactive-orange)] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open</span>
          </a>
        </div>
      </div>

      {/* Direct Content Viewer / Player */}
      <div className="mt-3 flex justify-center bg-[var(--bg-alt)] rounded-lg overflow-hidden p-2 min-h-[160px] items-center border border-[var(--border-color)]">
        {/* IMAGE PREVIEW */}
        {isImage && (
          <div className="relative group max-h-[400px] overflow-hidden rounded-md flex justify-center items-center w-full">
            <img
              src={url}
              alt={fileName}
              className="max-h-[380px] w-auto object-contain rounded-md transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        )}

        {/* VIDEO PLAYER */}
        {isVideo && (
          <div className="w-full max-w-3xl flex justify-center">
            <video
              src={url}
              controls
              preload="metadata"
              className="w-full max-h-[400px] rounded-md shadow-inner bg-black"
            >
              Your browser does not support playing this video directly.
            </video>
          </div>
        )}

        {/* AUDIO PLAYER */}
        {isAudio && (
          <div className="w-full max-w-xl p-4 space-y-3 text-center">
            <div className="flex justify-center items-center gap-3 text-[var(--interactive-blue)]">
              <Music className="w-10 h-10 animate-bounce" />
            </div>
            <audio src={url} controls className="w-full rounded-md shadow-sm">
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* PDF VIEWING IFRAME */}
        {isPdf && (
          <div className="w-full h-[450px] flex flex-col space-y-2">
            {!pdfError ? (
              <iframe
                src={`${url}#toolbar=0`}
                className="w-full h-full rounded-md border border-[var(--border-color)] bg-white"
                onError={() => setPdfError(true)}
                title={fileName}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
                <FileText className="w-12 h-12 text-[var(--interactive-blue)]" />
                <p className="text-sm font-medium">PDF Preview not available in frame.</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary text-xs"
                >
                  <Eye className="w-4 h-4 mr-1" /> View Full PDF
                </a>
              </div>
            )}
          </div>
        )}

        {/* GENERIC DOCUMENT / OTHER FILES */}
        {!isImage && !isVideo && !isAudio && !isPdf && (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <GenericFileIcon className="w-12 h-12 text-[var(--interactive-blue)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-color)]">{fileName}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Direct view not available in inline player for this file format.
              </p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary text-xs flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Open File
            </a>
          </div>
        )}
      </div>

      {/* Database Integration Helper Note */}
      <div className="bg-[var(--bg-alt)] p-3 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-muted)] font-mono flex items-center justify-between">
        <span className="truncate mr-2">Public URL: {url}</span>
        <span className="text-[10px] uppercase font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded shrink-0">
          Ready for DB
        </span>
      </div>
    </div>
  );
};
