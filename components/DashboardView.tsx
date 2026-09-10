'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AppLogo } from '@/components/Logo';
import {
  Play,
  CheckCircle2,
  Flame,
  Plus,
  BarChart3,
  Clock,
  FileText,
  BookOpen,
  ArrowRight,
  Trash2,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
  ExternalLink,
  Code2,
  Hourglass,
  Target,
  Calendar,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PlaylistCourse, UserStudyData, WeeklyStudyGoal } from '@/types/playlist';
import { calculateCourseDurations, formatDurationHuman, formatTime } from '@/lib/utils';
import { StudyHeatmap } from '@/components/StudyHeatmap';

interface DashboardViewProps {
  studyData: UserStudyData;
  courses: PlaylistCourse[];
  activeCourse: PlaylistCourse | null;
  onSelectCourse: (course: PlaylistCourse, videoId?: string) => void;
  onOpenImportModal: () => void;
  onOpenTargetEstimator?: () => void;
  onDeleteCourse: (courseId: string) => void;
  onResetCourseProgress: (courseId: string) => void;
  onTogglePlaylistTracking: (courseId: string) => void;
  onUpdateWeeklyGoal?: (goal: WeeklyStudyGoal) => void;
  onLogStudySession?: (date: string, minutes: number, topics: number, mode?: 'add' | 'set') => void;
  theme?: 'dark' | 'light';
}

type DashboardTab = 'overview' | 'playlists' | 'heatmap';

export function DashboardView({
  studyData,
  courses,
  activeCourse,
  onSelectCourse,
  onOpenImportModal,
  onOpenTargetEstimator,
  onDeleteCourse,
  onResetCourseProgress,
  onTogglePlaylistTracking,
  onUpdateWeeklyGoal,
  onLogStudySession,
  theme = 'dark',
}: DashboardViewProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [playlistFilter, setPlaylistFilter] = useState<'all' | 'tracked' | 'disabled'>('tracked');

  // Tracking System Calculation: Disabled playlists are excluded from overall tracking metrics
  const disabledIds = new Set(studyData.disabledPlaylistIds || []);
  const activeTrackedCourses = courses.filter(
    (c) => !c.disabledFromTracking && !disabledIds.has(c.id)
  );
  const disabledCoursesCount = courses.length - activeTrackedCourses.length;

  // Fallback filter if all imported playlists are disabled
  const effectiveFilter =
    playlistFilter === 'tracked' && activeTrackedCourses.length === 0 && courses.length > 0
      ? 'all'
      : playlistFilter;

  const totalCourses = activeTrackedCourses.length;
  let totalTopics = 0;
  let totalCompletedTopics = 0;
  let totalWatchedSeconds = 0;
  let totalRequiredSeconds = 0;
  let totalInProgressTopics = 0;

  const watchProgressMap = studyData.videoProgress || {};

  activeTrackedCourses.forEach((c) => {
    totalTopics += c.items.length;
    const completedSet = new Set(studyData.completedVideos[c.id] || []);
    totalCompletedTopics += completedSet.size;

    const { watchedSecs, totalSecs } = calculateCourseDurations(
      c,
      studyData.completedVideos[c.id] || [],
      watchProgressMap
    );

    totalWatchedSeconds += watchedSecs;
    totalRequiredSeconds += totalSecs;

    c.items.forEach((it) => {
      const prog = watchProgressMap[it.videoId];
      if (!completedSet.has(it.videoId) && prog && prog.currentTime > 0 && prog.percent > 0 && prog.percent < 100) {
        totalInProgressTopics += 1;
      }
    });
  });

  const totalRemainingSeconds = Math.max(0, totalRequiredSeconds - totalWatchedSeconds);

  const overallProgress =
    totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

  const notesCount = Object.keys(studyData.videoNotes || {}).filter(
    (k) => studyData.videoNotes[k]?.trim()
  ).length;

  const streakDays = studyData.streak?.count || 0;

  // Find recent active item for Quick Resume - strictly from TRACKED courses only
  // Disabling the playlist acts like it's entirely not there.
  const isCourseTracked = (c: PlaylistCourse | null | undefined): c is PlaylistCourse =>
    Boolean(c && !c.disabledFromTracking && !disabledIds.has(c.id));

  const resumeCourse: PlaylistCourse | null =
    isCourseTracked(activeCourse)
      ? activeCourse
      : (activeTrackedCourses.find((c) => c.id === studyData.activePlaylistId) ||
         activeTrackedCourses[0] ||
         null);

  const resumeVideo =
    resumeCourse && resumeCourse.items && resumeCourse.items.length > 0
      ? resumeCourse.items.find((i) => i.videoId === studyData.activeVideoId) ||
        resumeCourse.items[0]
      : null;

  const resumeVideoProgress = resumeVideo ? watchProgressMap[resumeVideo.videoId] : undefined;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-8 animate-fade-in">
      {/* Top Banner / Hero Summary */}
      <div
        className={`relative overflow-hidden p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
          isDark
            ? 'bg-gradient-to-br from-[#0e0e12] via-[#121218] to-[#0c0c0e] border-white/[0.08] shadow-2xl'
            : 'bg-gradient-to-br from-white via-indigo-50/40 to-white border-zinc-200/90 shadow-md'
        }`}
      >
        {/* Subtle ambient background glow */}
        <div
          className={`pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20 ${
            isDark ? 'bg-indigo-500' : 'bg-indigo-300'
          }`}
        />
        <div
          className={`pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-15 ${
            isDark ? 'bg-emerald-500' : 'bg-emerald-300'
          }`}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <AppLogo size={42} className="w-10 h-10 shrink-0 drop-shadow-md" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-mono font-semibold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Sparkles className="w-3.5 h-3.5" />
                <span>Command Center</span>
              </div>
              {disabledCoursesCount > 0 && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${
                    isDark
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                  title={`${disabledCoursesCount} playlist${disabledCoursesCount > 1 ? 's' : ''} excluded from tracking metrics`}
                >
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {activeTrackedCourses.length} active • {disabledCoursesCount} excluded
                  </span>
                </div>
              )}
            </div>
            <h2
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Main Overview &amp; Learning Dashboard
            </h2>
            <p
              className={`text-xs sm:text-sm max-w-xl leading-relaxed ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              Track daily study heatmap intensity, follow curated developer roadmaps, complete topic checklists, and manage multi-course tracks with automatic progress saving.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="relative flex items-center flex-wrap gap-2.5 sm:gap-3">
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Import Playlist</span>
            </button>

            {onOpenTargetEstimator && (
              <button
                onClick={onOpenTargetEstimator}
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700 text-indigo-300 hover:text-indigo-200 shadow-sm'
                    : 'bg-white hover:bg-zinc-100 border-zinc-200 text-indigo-700 shadow-xs'
                }`}
                title="Calculate Completion Date & Daily Goal"
              >
                <Target className="w-4 h-4 text-indigo-400" />
                <span>Target Estimator</span>
              </button>
            )}

            {resumeCourse && (
              <button
                onClick={() => onSelectCourse(resumeCourse, resumeVideo?.videoId)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl border text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700 text-zinc-100 shadow-sm'
                    : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-800 shadow-xs'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-500" />
                <span>Resume Study</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Living Metric Counter Cards */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 mt-8">
          {/* Total Watch Time Card */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isDark
                ? 'bg-zinc-900/70 border-zinc-800 hover:border-sky-500/40'
                : 'bg-white/90 border-zinc-200/90 hover:border-sky-400 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Watch Time
              </span>
              <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
              <span
                className={`text-2xl font-bold font-mono tracking-tight ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {formatDurationHuman(totalWatchedSeconds)}
              </span>
              <span className="text-[10px] text-zinc-500">Studied</span>
            </div>
            <div className="mt-2 flex flex-col text-[11px] text-zinc-500 gap-0.5 font-mono pt-2 border-t border-zinc-800/30">
              <span>Total: <strong className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{formatDurationHuman(totalRequiredSeconds)}</strong></span>
              <span className="text-[10px] text-sky-400 font-semibold">
                {formatDurationHuman(totalRemainingSeconds)} remaining
                {totalInProgressTopics > 0 && ` (${totalInProgressTopics} in-prog)`}
              </span>
            </div>
          </div>

          {/* Topics Completed Card */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isDark
                ? 'bg-zinc-900/70 border-zinc-800 hover:border-emerald-500/40'
                : 'bg-white/90 border-zinc-200/90 hover:border-emerald-400 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Completed
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                {totalCompletedTopics}
              </span>
              <span className="text-[10px] text-zinc-500">/ {totalTopics} Topics</span>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800/30">
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className="text-zinc-500">Progress</span>
                <span className="text-emerald-400 font-bold">{overallProgress}%</span>
              </div>
              <div
                className={`w-full h-1.5 rounded-full overflow-hidden ${
                  isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                }`}
              >
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Active Streak Card */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isDark
                ? 'bg-zinc-900/70 border-zinc-800 hover:border-amber-500/40'
                : 'bg-white/90 border-zinc-200/90 hover:border-amber-400 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Streak
              </span>
              <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-3.5 h-3.5 animate-flame" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
                {streakDays}
              </span>
              <span className="text-[10px] text-zinc-500">
                {streakDays === 1 ? 'Day Active' : 'Days Active'}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800/30 flex items-center gap-1 text-[10px] text-amber-400 font-medium">
              <span>🔥 Keep momentum going!</span>
            </div>
          </div>

          {/* Notes Taken Card */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isDark
                ? 'bg-zinc-900/70 border-zinc-800 hover:border-indigo-500/40'
                : 'bg-white/90 border-zinc-200/90 hover:border-indigo-400 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Key Notes
              </span>
              <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold font-mono tracking-tight ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {notesCount}
              </span>
              <span className="text-[10px] text-zinc-500">Saved Lessons</span>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800/30 flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
              <span>Local notes auto-synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Navigation Tabs */}
      <div
        className={`flex items-center justify-between border-b pb-3 flex-wrap gap-3 ${
          isDark ? 'border-zinc-800/60' : 'border-zinc-200'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 p-1 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-zinc-900/60 border-zinc-800/80'
              : 'bg-zinc-100 border-zinc-200/80 shadow-xs'
          }`}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Playlists ({activeTrackedCourses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'heatmap'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Heatmap</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'playlists' && (
            <button
              onClick={() => setActiveTab('playlists')}
              className={`text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              }`}
            >
              <span>View All Tracks</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Resume Hero (if courses exist) */}
      {(activeTab === 'overview' || activeTab === 'playlists') && resumeCourse && resumeVideo && (
        <div
          className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 ${
            isDark
              ? 'bg-[#0c0c0e]/90 border-zinc-800/80 shadow-xl'
              : 'bg-white border-zinc-200/90 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>Continue Where You Left Off</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <button
              onClick={() => onSelectCourse(resumeCourse, resumeVideo.videoId)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={() => onSelectCourse(resumeCourse, resumeVideo.videoId)}
            className={`flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 p-4 rounded-2xl border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 ${
              isDark
                ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-900/80 hover:shadow-lg'
                : 'bg-zinc-50 border-zinc-200/80 hover:border-indigo-300 hover:bg-zinc-100/90 hover:shadow-md'
            }`}
          >
            <div className="w-full md:w-56 h-32 rounded-xl bg-zinc-800 relative overflow-hidden shrink-0 shadow-md">
              <Image
                src={resumeVideo.thumbnail || resumeCourse.thumbnail}
                alt={resumeVideo.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-200">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
              {/* Thumbnail Progress Bar */}
              {resumeVideoProgress && (
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/60">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${resumeVideoProgress.percent}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-semibold">
                  {resumeCourse.title}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Topic {resumeVideo.position} of {resumeCourse.items.length}
                </span>
                {resumeVideoProgress && resumeVideoProgress.currentTime > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                    {resumeVideoProgress.percent}% watched ({formatTime(resumeVideoProgress.currentTime)})
                  </span>
                )}
              </div>

              <h4
                className={`text-base sm:text-lg font-bold tracking-tight line-clamp-2 transition-colors ${
                  isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900 group-hover:text-black'
                }`}
              >
                {resumeVideo.title}
              </h4>

              <p className="text-xs text-zinc-500 line-clamp-1">
                Channel: {resumeCourse.channelTitle || 'YouTube Creator'}
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCourse(resumeCourse, resumeVideo.videoId);
                }}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-white" />
                <span>Continue Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Study Heatmap Component */}
      {(activeTab === 'overview' || activeTab === 'heatmap') && (
        <StudyHeatmap
          studyData={studyData}
          onUpdateWeeklyGoal={onUpdateWeeklyGoal}
          onLogStudySession={onLogStudySession}
          theme={theme}
        />
      )}

      {/* Playlist Library Section */}
      {(activeTab === 'overview' || activeTab === 'playlists') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3
                className={`text-lg font-bold tracking-tight ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                My Playlist Tracks ({activeTrackedCourses.length})
              </h3>
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Select any playlist track to learn, or toggle tracking to exclude casual playlists from your stats and streaks.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {courses.length > 0 && (
                <div
                  className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
                    isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                  }`}
                >
                  <button
                    onClick={() => setPlaylistFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      playlistFilter === 'all'
                        ? isDark
                          ? 'bg-zinc-800 text-white shadow-xs'
                          : 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    All ({courses.length})
                  </button>
                  <button
                    onClick={() => setPlaylistFilter('tracked')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      playlistFilter === 'tracked'
                        ? isDark
                          ? 'bg-zinc-800 text-emerald-400 shadow-xs'
                          : 'bg-white text-emerald-600 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Tracked ({activeTrackedCourses.length})
                  </button>
                  {disabledCoursesCount > 0 && (
                    <button
                      onClick={() => setPlaylistFilter('disabled')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        playlistFilter === 'disabled'
                          ? isDark
                            ? 'bg-zinc-800 text-amber-400 shadow-xs'
                            : 'bg-white text-amber-600 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Excluded ({disabledCoursesCount})
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={onOpenImportModal}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 shadow-xs'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Add Playlist</span>
              </button>
            </div>
          </div>

          {courses.length === 0 ? (
            /* Empty State */
            <div
              className={`flex flex-col items-center justify-center p-8 sm:p-14 rounded-3xl border text-center transition-colors ${
                isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mb-4 shadow-lg shadow-indigo-500/5">
                <Layers className="w-8 h-8" />
              </div>

              <h4
                className={`text-xl font-bold tracking-tight ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                No Playlists Imported Yet
              </h4>
              <p
                className={`text-xs sm:text-sm max-w-md mt-2 leading-relaxed ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                Ready to learn? Paste any public or unlisted YouTube playlist link to create your interactive study track with live watch tracking.
              </p>

              <button
                onClick={onOpenImportModal}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Import Your First Playlist</span>
              </button>
            </div>
          ) : (
            /* Grid of Courses */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses
                .filter((c) => {
                  const isExcluded = Boolean(c.disabledFromTracking || disabledIds.has(c.id));
                  if (effectiveFilter === 'tracked') return !isExcluded;
                  if (effectiveFilter === 'disabled') return isExcluded;
                  return true;
                })
                .map((course) => {
                const isCourseDisabled = Boolean(
                  course.disabledFromTracking || disabledIds.has(course.id)
                );
                const completedInCourse = (
                  studyData.completedVideos[course.id] || []
                ).length;
                const courseProgress =
                  course.items.length > 0
                    ? Math.round((completedInCourse / course.items.length) * 100)
                    : 0;
                const isActive = activeCourse?.id === course.id;

                const { watchedSecs, totalSecs, remainingSecs } = calculateCourseDurations(
                  course,
                  studyData.completedVideos[course.id] || [],
                  watchProgressMap
                );

                const getTargetVideoForCourse = () => {
                  if (course.id === studyData.activePlaylistId && studyData.activeVideoId) {
                    return studyData.activeVideoId;
                  }
                  const completed = new Set(studyData.completedVideos[course.id] || []);
                  const inProg = course.items.find(
                    (it) => !completed.has(it.videoId) && (watchProgressMap[it.videoId]?.currentTime || 0) > 0
                  );
                  if (inProg) return inProg.videoId;
                  const uncompleted = course.items.find((it) => !completed.has(it.videoId));
                  if (uncompleted) return uncompleted.videoId;
                  return course.items[0]?.videoId;
                };

                return (
                  <div
                    key={course.id}
                    className={`flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden group hover:-translate-y-1.5 ${
                      isCourseDisabled
                        ? isDark
                          ? 'bg-[#0b0b0e]/70 border-amber-900/30 opacity-90 hover:opacity-100 hover:border-amber-700/50'
                          : 'bg-amber-50/20 border-amber-200/60 hover:border-amber-300'
                        : isActive
                        ? isDark
                          ? 'bg-[#0f0f14] border-indigo-500/50 ring-1 ring-indigo-500/40 shadow-2xl shadow-indigo-950/40'
                          : 'bg-white border-indigo-300 ring-1 ring-indigo-200 shadow-xl shadow-indigo-100'
                        : isDark
                        ? 'bg-[#0c0c0e]/90 border-zinc-800/80 hover:border-zinc-700 hover:shadow-2xl'
                        : 'bg-white border-zinc-200/90 hover:border-zinc-300 hover:shadow-lg'
                    }`}
                  >
                    {/* Card Thumbnail Top */}
                    <div
                      onClick={() => onSelectCourse(course, getTargetVideoForCourse())}
                      className="relative w-full h-44 bg-zinc-900 overflow-hidden cursor-pointer shrink-0"
                    >
                      <Image
                        src={
                          course.thumbnail ||
                          `https://i.ytimg.com/vi/${course.items[0]?.videoId}/hqdefault.jpg`
                        }
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-between p-3.5">
                        <div className="flex items-center justify-between gap-1.5">
                          {isCourseDisabled ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-bold shadow-md">
                              <EyeOff className="w-3 h-3" />
                              Excluded from Tracking
                            </span>
                          ) : isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500 text-black font-bold shadow-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                              Active Track
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-zinc-200 ml-auto border border-white/10">
                            {course.items.length} Lectures
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-indigo-500 transition-all duration-200">
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          </div>
                          <span className="text-xs font-semibold drop-shadow">
                            Open Course
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            onClick={() => onSelectCourse(course, getTargetVideoForCourse())}
                            className={`text-sm font-bold tracking-tight line-clamp-2 cursor-pointer transition-colors ${
                              isDark
                                ? 'text-zinc-100 group-hover:text-indigo-300'
                                : 'text-zinc-900 group-hover:text-indigo-600'
                            }`}
                          >
                            {course.title}
                          </h4>
                        </div>
                        <p className="text-xs text-zinc-500 truncate">
                          {course.channelTitle || 'YouTube Creator'}
                        </p>
                        {isCourseDisabled && (
                          <div className="pt-1 flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                            <EyeOff className="w-3 h-3 shrink-0" />
                            <span>Disabled from overall stats & goals</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar & Details */}
                      <div
                        className={`space-y-2.5 pt-3 border-t ${
                          isDark ? 'border-zinc-800/60' : 'border-zinc-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-medium ${
                              isDark ? 'text-zinc-400' : 'text-zinc-600'
                            }`}
                          >
                            {completedInCourse} / {course.items.length} Completed
                          </span>
                          <span className={`font-mono font-bold ${isCourseDisabled ? 'text-zinc-400' : 'text-emerald-400'}`}>
                            {courseProgress}%
                          </span>
                        </div>

                        <div
                          className={`w-full h-2 rounded-full overflow-hidden ${
                            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCourseDisabled ? 'bg-amber-500/70' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${courseProgress}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>{formatDurationHuman(watchedSecs)} / {formatDurationHuman(totalSecs)}</span>
                          </span>
                          <span className="text-indigo-400 font-semibold">
                            {formatDurationHuman(remainingSecs)} left
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div
                        className={`flex items-center justify-between pt-3 border-t ${
                          isDark ? 'border-zinc-800/60' : 'border-zinc-100'
                        }`}
                      >
                        <button
                          onClick={() => onSelectCourse(course)}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Start Studying</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle Tracking Action Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePlaylistTracking(course.id);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isCourseDisabled
                                ? isDark
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                                : isDark
                                  ? 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                            }`}
                            title={
                              isCourseDisabled
                                ? 'Currently excluded from tracking. Click to enable and count towards your tracking system.'
                                : 'Currently tracked. Click to disable/exclude so it does not affect your tracking system.'
                            }
                          >
                            {isCourseDisabled ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                                <span>Excluded</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Tracked</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              onResetCourseProgress(course.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark
                                ? 'text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10'
                                : 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title="Reset Progress"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              onDeleteCourse(course.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark
                                ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                                : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Remove Playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
