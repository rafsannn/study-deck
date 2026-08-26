'use client';

import React, { useState } from 'react';
import { AppLogo } from '@/components/Logo';
import {
  X,
  Flame,
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  FileText,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react';
import { PlaylistCourse, UserStudyData } from '@/types/playlist';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyData: UserStudyData;
  courses: PlaylistCourse[];
  onImportBackup: (backupData: UserStudyData) => void;
  onResetAllData: () => void;
  theme?: 'dark' | 'light';
}

function formatDurationHuman(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '0 mins';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  }
  return `${mins} min${mins !== 1 ? 's' : ''}`;
}

export function StatsModal({
  isOpen,
  onClose,
  studyData,
  courses,
  onImportBackup,
  onResetAllData,
  theme = 'dark',
}: StatsModalProps) {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [confirmResetMode, setConfirmResetMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  // Calculate stats
  let totalCompletedLessons = 0;
  Object.values(studyData.completedVideos).forEach((arr) => {
    totalCompletedLessons += arr.length;
  });

  const notesCount = Object.values(studyData.videoNotes).filter((n) => n.trim().length > 0).length;

  // Calculate total watch time across videos
  let totalWatchSeconds = 0;
  let inProgressCount = 0;
  const progressMap = studyData.videoProgress || {};

  courses.forEach((c) => {
    const completedSet = new Set(studyData.completedVideos[c.id] || []);
    c.items.forEach((it) => {
      const p = progressMap[it.videoId];
      if (completedSet.has(it.videoId)) {
        totalWatchSeconds += p?.duration || 600;
      } else if (p && p.currentTime > 0) {
        totalWatchSeconds += p.currentTime;
        if (p.percent > 0 && p.percent < 100) {
          inProgressCount += 1;
        }
      }
    });
  });

  // Export JSON backup
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(studyData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rafsan_study_deck_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'Backup downloaded successfully!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage({ type: 'error', text: 'Could not export backup.' });
    }
  };

  const handleImportSubmit = () => {
    try {
      const parsed = JSON.parse(importText);
      if (parsed.completedVideos && typeof parsed.completedVideos === 'object') {
        onImportBackup(parsed);
        setShowImport(false);
        setImportText('');
        setStatusMessage({ type: 'success', text: 'Study deck data restored successfully!' });
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage({ type: 'error', text: 'Invalid backup structure. Please check JSON.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Could not parse JSON. Please check file formatting.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className={`relative w-full max-w-xl border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto transition-colors ${
          isDark
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute right-4 top-4 p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-zinc-200'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <AppLogo size={42} className="w-10 h-10 shrink-0" />
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-mono font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>Engineering Study Profile</span>
            </div>
            <h2
              className={`text-xl font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Study Statistics &amp; Backup
            </h2>
            <p className="text-xs text-zinc-500">
              Real-time track progress, watch time analytics, and local data persistence.
            </p>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium border animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Highlight Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            className={`p-3 rounded-xl border text-center space-y-1 ${
              isDark
                ? 'bg-zinc-900/60 border-zinc-800'
                : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-amber-500 text-xs font-medium">
              <Flame className="w-3.5 h-3.5" />
              <span>Streak</span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-500">
              {studyData.streak?.count || 0}d
            </div>
            <div className="text-[10px] text-zinc-500">
              {studyData.streak?.lastActiveDate
                ? `Last: ${studyData.streak.lastActiveDate}`
                : 'Start today!'}
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border text-center space-y-1 ${
              isDark
                ? 'bg-zinc-900/60 border-zinc-800'
                : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-emerald-500 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finished</span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-500">
              {totalCompletedLessons}
            </div>
            <div className="text-[10px] text-zinc-500">Lectures Done</div>
          </div>

          <div
            className={`p-3 rounded-xl border text-center space-y-1 ${
              isDark
                ? 'bg-zinc-900/60 border-zinc-800'
                : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-sky-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Watch Time</span>
            </div>
            <div className="text-sm font-bold font-mono text-sky-400 pt-1">
              {formatDurationHuman(totalWatchSeconds)}
            </div>
            <div className="text-[10px] text-zinc-500">
              {inProgressCount} in progress
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border text-center space-y-1 ${
              isDark
                ? 'bg-zinc-900/60 border-zinc-800'
                : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-indigo-500 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-500">
              {notesCount}
            </div>
            <div className="text-[10px] text-zinc-500">Formulas Logged</div>
          </div>
        </div>

        {/* Per-Track Detailed Breakdown */}
        <div className="space-y-2">
          <h3
            className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            Tracks Breakdown
          </h3>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {courses.map((c) => {
              const comp = studyData.completedVideos[c.id]?.length || 0;
              const total = c.items.length;
              const pct = total > 0 ? Math.round((comp / total) * 100) : 0;
              return (
                <div
                  key={c.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    isDark
                      ? 'bg-zinc-900/40 border-zinc-800/80'
                      : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{c.title}</div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                      <span>{comp} / {total} Completed</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-500">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-20 sm:w-24 bg-zinc-800 h-2 rounded-full overflow-hidden shrink-0">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Persistence & Backup Tools */}
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}
            >
              Data Backup &amp; Portability
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                  isDark
                    ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <Download className="w-3 h-3" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => setShowImport(!showImport)}
                className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                  isDark
                    ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Import Backup</span>
              </button>
            </div>
          </div>

          {showImport && (
            <div className="space-y-2 pt-2 border-t border-zinc-800/80 animate-fade-in">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your exported JSON backup string here..."
                rows={3}
                className={`w-full text-xs font-mono p-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-zinc-950 text-zinc-200 border-zinc-800'
                    : 'bg-white text-zinc-900 border-zinc-300'
                }`}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImport(false)}
                  className={`text-xs px-3 py-1 rounded-lg border cursor-pointer ${
                    isDark
                      ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                      : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Apply Backup
                </button>
              </div>
            </div>
          )}

          {/* Danger zone: reset all */}
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Need to start fresh?</span>
            {confirmResetMode ? (
              <div className="flex items-center gap-2">
                <span className="text-rose-400 font-medium text-[11px]">Confirm wipe?</span>
                <button
                  onClick={() => {
                    onResetAllData();
                    setConfirmResetMode(false);
                    onClose();
                  }}
                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Yes, Reset All
                </button>
                <button
                  onClick={() => setConfirmResetMode(false)}
                  className="px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmResetMode(true)}
                className="text-rose-500 hover:text-rose-400 inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset all progress</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
