'use client';

import React, { useState } from 'react';
import { FileUploader, UploadSuccessResult } from '@/components/FileUploader';
import { FilePreview } from '@/components/FilePreview';
import { Database, Upload, Server, ShieldCheck, Terminal, Copy, Check, Info } from 'lucide-react';

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
  const [copiedEnv, setCopiedEnv] = useState(false);

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

    // Store returned public URL in state (simulating database save)
    setSavedRecords((prev) => [newRecord, ...prev]);
  };

  const sampleEnvText = `MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=uploads
# Optional custom public URL if using CDN or domain:
MINIO_PUBLIC_URL=http://localhost:9000`;

  const copyEnvToClipboard = () => {
    navigator.clipboard.writeText(sampleEnvText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] p-4 sm:p-8 md:p-12 space-y-12">
      {/* Background Decorator */}
      <div className="glow-blob blob-blue" />
      <div className="glow-blob blob-green" />

      {/* Page Header */}
      <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--interactive-orange)]/10 text-[var(--interactive-orange)] text-xs font-semibold uppercase tracking-wider">
          <Upload className="w-3.5 h-3.5" /> Next.js 15+ & MinIO Integration
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gradient">
          Production File Upload & Direct Preview
        </h1>
        <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
          Upload images, videos, audio, PDFs, and documents directly to MinIO using AWS SDK v3 with React Hook Form validation, live progress tracking, and instant browser playback.
        </p>
      </div>

      {/* Main Grid: Upload Component & Saved Database Records */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Upload Component */}
        <div className="lg:col-span-7 space-y-6">
          <FileUploader onUploadSuccess={handleUploadSuccess} folderPrefix="media" />
        </div>

        {/* Right Column: Environment Setup & Saved Database URLs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Database Saved URLs List */}
          <div className="glass-panel p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-[var(--text-color)]">
                <Database className="w-5 h-5 text-[var(--interactive-blue)]" />
                Saved Database URLs ({savedRecords.length})
              </h3>
              {savedRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSavedRecords([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear List
                </button>
              )}
            </div>

            {savedRecords.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-[var(--text-muted)] space-y-2 border border-dashed border-[var(--border-color)] rounded-xl">
                <Server className="w-8 h-8 mx-auto opacity-40" />
                <p>No files saved to database yet.</p>
                <p className="opacity-75">Upload a file on the left to see returned public URLs saved here.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {savedRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 bg-[var(--bg-alt)] border border-[var(--border-color)] rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold truncate max-w-[200px]" title={record.fileName}>
                        {record.fileName}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{record.uploadedAt}</span>
                    </div>

                    <div className="p-2 bg-white dark:bg-zinc-950 rounded border border-[var(--border-color)] font-mono text-[11px] truncate text-emerald-600 dark:text-emerald-400 select-all">
                      {record.publicUrl}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
                      <span>{record.fileType}</span>
                      <a
                        href={record.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--interactive-orange)] hover:underline font-semibold"
                      >
                        Test Link &rarr;
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Setup Card */}
          <div className="glass-panel p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-lg text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
              <h4 className="font-bold flex items-center gap-2 text-[var(--text-color)] text-sm">
                <Terminal className="w-4 h-4 text-[var(--interactive-orange)]" />
                Environment Variables
              </h4>
              <button
                type="button"
                onClick={copyEnvToClipboard}
                className="p-1 px-2 text-[10px] font-semibold rounded bg-[var(--bg-alt)] border border-[var(--border-color)] hover:border-[var(--text-muted)] flex items-center gap-1"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copiedEnv ? 'Copied' : 'Copy'}
              </button>
            </div>

            <pre className="p-3 bg-zinc-900 text-zinc-100 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed">
              {sampleEnvText}
            </pre>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Bucket Access Policy
              </p>
              <p className="text-[11px] leading-normal opacity-95">
                Ensure your MinIO bucket access policy is set to <strong>Download (Public)</strong> and CORS is enabled so browsers can display files directly via URL.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
