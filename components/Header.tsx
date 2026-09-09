'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Layers, BarChart3, Sun, Moon, LayoutDashboard, Sparkles, BookOpen, Target, Keyboard } from 'lucide-react';
import { PlaylistCourse } from '@/types/playlist';
import { AppLogo } from '@/components/Logo';

interface HeaderProps {
  currentCourse: PlaylistCourse | null;
  allCourses: PlaylistCourse[];
  onSelectCourse: (course: PlaylistCourse) => void;
  onOpenImportModal: () => void;
  onOpenStatsModal: () => void;
  onOpenTargetEstimator?: () => void;
  onOpenShortcuts?: () => void;
  onGoToDashboard: () => void;
  isDashboard: boolean;
  streakCount: number;
  completedCount: number;
  totalCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function Header({
  currentCourse,
  allCourses,
  onSelectCourse,
  onOpenImportModal,
  onOpenStatsModal,
  onOpenTargetEstimator,
  onOpenShortcuts,
  onGoToDashboard,
  isDashboard,
  streakCount,
  completedCount,
  totalCount,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const [timeString, setTimeString] = useState<string>('');
  const isDark = theme === 'dark';

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <header
      className={`h-14 sm:h-16 border-b flex items-center justify-between px-3.5 sm:px-6 backdrop-blur-xl shrink-0 sticky top-0 z-40 transition-all duration-300 ${
        isDark
          ? 'border-white/[0.08] bg-[#09090b]/80 shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
          : 'border-zinc-200/80 bg-white/85 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
      }`}
    >
      {/* App Identity & Brand Title (Clickable -> Returns to Main Dashboard) */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <div
          onClick={onGoToDashboard}
          className="flex items-center gap-2.5 cursor-pointer group select-none transition-all duration-200 hover:opacity-95 active:scale-[0.98] min-w-0"
          title="Go to Main Dashboard"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onGoToDashboard();
            }
          }}
        >
          <div className="flex items-center justify-center shrink-0 p-1 rounded-xl group-hover:scale-105 transition-transform duration-200">
            <AppLogo size={32} className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1
              className={`text-sm sm:text-base font-bold tracking-tight truncate transition-colors ${
                isDark
                  ? 'text-white group-hover:text-indigo-400'
                  : 'text-zinc-900 group-hover:text-indigo-600'
              }`}
            >
              Study Deck
            </h1>
            {isDashboard ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-semibold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span>Dashboard</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Studio</span>
              </span>
            )}
          </div>
        </div>

        {/* Course Track Quick Selector (Visible when inside a course) */}
        {!isDashboard && allCourses.length > 0 && currentCourse && (
          <div className="hidden lg:flex items-center pl-2.5 border-l border-zinc-700/40">
            <div
              className={`relative flex items-center border rounded-xl px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:border-zinc-600 ${
                isDark
                  ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300 shadow-inner'
                  : 'bg-zinc-100/90 border-zinc-200 text-zinc-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 text-indigo-400 shrink-0" />
              <select
                value={currentCourse.id}
                onChange={(e) => {
                  const selected = allCourses.find((c) => c.id === e.target.value);
                  if (selected) onSelectCourse(selected);
                }}
                className="bg-transparent text-xs focus:outline-none cursor-pointer appearance-none pr-5 max-w-[170px] truncate font-medium"
                title="Switch Course Track"
              >
                {allCourses.map((course) => (
                  <option
                    key={course.id}
                    value={course.id}
                    className={isDark ? 'bg-zinc-900 text-zinc-200' : 'bg-white text-zinc-800'}
                  >
                    {course.title}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 text-[8px] opacity-60">▼</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls & Utilities */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Dashboard Switch Button */}
        {!isDashboard && (
          <button
            onClick={onGoToDashboard}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer ${
              isDark
                ? 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 text-zinc-200 hover:text-white hover:border-zinc-700'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 hover:text-zinc-900 shadow-xs'
            }`}
            title="View Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
        )}

        {/* Daily Target & Date Estimator */}
        {onOpenTargetEstimator && (
          <button
            id="target-estimator-btn"
            onClick={onOpenTargetEstimator}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer ${
              isDark
                ? 'bg-indigo-950/40 hover:bg-indigo-900/50 border-indigo-500/30 text-indigo-300 hover:text-indigo-200 hover:border-indigo-500/50'
                : 'bg-indigo-50/70 hover:bg-indigo-100/80 border-indigo-200 text-indigo-700 hover:text-indigo-800'
            }`}
            title="Daily Target & Pace Estimator"
            aria-label="Daily Target & Pace Estimator"
          >
            <Target className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="hidden md:inline">Targets</span>
          </button>
        )}

        {/* Streamlined Living Single-Line Streak & Progress Chip */}
        <div
          onClick={onOpenStatsModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
            isDark
              ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300 shadow-sm'
              : 'bg-zinc-100/90 border-zinc-200 hover:border-zinc-300 text-zinc-700 shadow-xs'
          }`}
          title="Click to view full analytics & statistics"
          role="button"
          tabIndex={0}
        >
          <span className="flex items-center gap-1 text-xs font-bold text-amber-400 font-mono">
            <span className="animate-flame inline-block">🔥</span>
            <span>{streakCount}d</span>
          </span>
          <span className={`w-px h-3.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-300'}`} />
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono">
            <BarChart3 className="w-3 h-3 text-emerald-400" />
            <span>{progressPercent}%</span>
          </span>
          {timeString && (
            <>
              <span className={`hidden xl:inline-block w-px h-3.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-300'}`} />
              <span
                suppressHydrationWarning
                className="hidden xl:inline-block text-[11px] font-mono text-zinc-400"
              >
                {timeString}
              </span>
            </>
          )}
        </div>

        {/* Import Playlist Action Button */}
        <button
          id="import-playlist-btn"
          onClick={onOpenImportModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
          title="Import YouTube Playlist"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* Keyboard Shortcuts Helper Button */}
        {onOpenShortcuts && (
          <button
            id="shortcuts-btn"
            onClick={onOpenShortcuts}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border text-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer ${
              isDark
                ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-600 hover:text-zinc-900'
            }`}
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border text-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer ${
            isDark
              ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-amber-400 hover:text-amber-300 hover:border-zinc-700'
              : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 hover:text-zinc-900'
          }`}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
          )}
        </button>
      </div>
    </header>
  );
}
