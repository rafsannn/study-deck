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
  Compass,
  TrendingUp,
} from 'lucide-react';
import { PlaylistCourse, UserStudyData, WeeklyStudyGoal } from '@/types/playlist';
import { calculateCourseDurations, formatDurationHuman, formatTime } from '@/lib/utils';
import { StudyHeatmap } from '@/components/StudyHeatmap';
import { LearningRoadmaps } from '@/components/LearningRoadmaps';

interface DashboardViewProps {
  studyData: UserStudyData;
  courses: PlaylistCourse[];
  activeCourse: PlaylistCourse | null;
  onSelectCourse: (course: PlaylistCourse, videoId?: string) => void;
  onOpenImportModal: () => void;
  onOpenTargetEstimator?: () => void;
  onDeleteCourse: (courseId: string) => void;
  onResetCourseProgress: (courseId: string) => void;
  onUpdateWeeklyGoal?: (goal: WeeklyStudyGoal) => void;
  onLogStudySession?: (date: string, minutes: number, topics: number) => void;
  onToggleEnrollRoadmap?: (roadmapId: string) => void;
  onToggleMilestoneComplete?: (milestoneId: string) => void;
  theme?: 'dark' | 'light';
}

type DashboardTab = 'overview' | 'playlists' | 'heatmap' | 'roadmaps';

export function DashboardView({
  studyData,
  courses,
  activeCourse,
  onSelectCourse,
  onOpenImportModal,
  onOpenTargetEstimator,
  onDeleteCourse,
  onResetCourseProgress,
  onUpdateWeeklyGoal,
  onLogStudySession,
  onToggleEnrollRoadmap,
  onToggleMilestoneComplete,
  theme = 'dark',
}: DashboardViewProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Overall Statistics Calculation
  const totalCourses = courses.length;
  let totalTopics = 0;
  let totalCompletedTopics = 0;
  let totalWatchedSeconds = 0;
  let totalRequiredSeconds = 0;
  let totalInProgressTopics = 0;

  const watchProgressMap = studyData.videoProgress || {};

  courses.forEach((c) => {
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

  // Find recent active item for Quick Resume
  const resumeCourse = activeCourse || courses[0] || null;
  const resumeVideo =
    resumeCourse && resumeCourse.items
      ? resumeCourse.items.find((i) => i.videoId === studyData.activeVideoId) ||
        resumeCourse.items[0]
      : null;

  const resumeVideoProgress = resumeVideo ? watchProgressMap[resumeVideo.videoId] : undefined;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-8 animate-fade-in">
      {/* Top Banner / Hero Summary */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border transition-all ${
          isDark
            ? 'bg-gradient-to-br from-[#0c0c0e] via-[#111116] to-[#0c0c0e] border-zinc-800 shadow-2xl'
            : 'bg-gradient-to-br from-white via-indigo-50/30 to-white border-zinc-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <AppLogo size={42} className="w-10 h-10 shrink-0" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Study Command Center</span>
              </div>
            </div>
            <h2
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Main Overview &amp; Learning Dashboard
            </h2>
            <p
              className={`text-xs sm:text-sm max-w-xl ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              Track daily study heatmap intensity, follow curated developer roadmaps, complete topic checklists, and manage multi-course tracks.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center flex-wrap gap-3">
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Import Playlist</span>
            </button>

            {onOpenTargetEstimator && (
              <button
                onClick={onOpenTargetEstimator}
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-indigo-300 hover:text-indigo-200'
                    : 'bg-white hover:bg-zinc-100 border-zinc-200 text-indigo-700 shadow-sm'
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
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                    : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-800 shadow-sm'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-500" />
                <span>Resume Study</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Metric Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 mt-8">
          {/* Total Watch Time Card */}
          <div
            className={`p-4 rounded-2xl border transition-colors ${
              isDark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Watch Time
              </span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
              <span
                className={`text-2xl font-bold font-mono ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {formatDurationHuman(totalWatchedSeconds)}
              </span>
              <span className="text-[10px] text-zinc-500">Studied</span>
            </div>
            <div className="mt-1 flex flex-col text-[11px] text-zinc-500 gap-0.5 font-mono">
              <span>Total Required: <strong className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{formatDurationHuman(totalRequiredSeconds)}</strong></span>
              <span className="text-[10px] text-indigo-400 font-semibold">
                {formatDurationHuman(totalRemainingSeconds)} remaining
                {totalInProgressTopics > 0 && ` (${totalInProgressTopics} in-progress)`}
              </span>
            </div>
          </div>

          {/* Topics Completed Card */}
          <div
            className={`p-4 rounded-2xl border transition-colors ${
              isDark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Completed
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-500">
                {totalCompletedTopics}
              </span>
              <span className="text-[10px] text-zinc-500">/ {totalTopics} Topics</span>
            </div>
            <div className="mt-2 w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Active Streak Card */}
          <div
            className={`p-4 rounded-2xl border transition-colors ${
              isDark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Streak
              </span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-amber-500">
                {streakDays}
              </span>
              <span className="text-[10px] text-zinc-500">
                {streakDays === 1 ? 'Day Active' : 'Days Active'}
              </span>
            </div>
          </div>

          {/* Notes Taken Card */}
          <div
            className={`p-4 rounded-2xl border transition-colors ${
              isDark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Key Notes
              </span>
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold font-mono ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {notesCount}
              </span>
              <span className="text-[10px] text-zinc-500">Saved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
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
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Playlists ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'heatmap'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('roadmaps')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'roadmaps'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Learning Roadmaps</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'playlists' && (
            <button
              onClick={() => setActiveTab('playlists')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
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
          className={`p-5 sm:p-6 rounded-3xl border transition-colors ${
            isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Continue Where You Left Off</span>
            </h3>
            <button
              onClick={() => onSelectCourse(resumeCourse, resumeVideo.videoId)}
              className="text-xs text-indigo-500 hover:text-indigo-400 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={() => onSelectCourse(resumeCourse, resumeVideo.videoId)}
            className={`flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 p-4 rounded-2xl border transition-all cursor-pointer group ${
              isDark
                ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-900/80'
                : 'bg-zinc-50 border-zinc-200/80 hover:border-indigo-300 hover:bg-zinc-100/80'
            }`}
          >
            <div className="w-full md:w-56 h-32 rounded-xl bg-zinc-800 relative overflow-hidden shrink-0 shadow-md">
              <Image
                src={resumeVideo.thumbnail || resumeCourse.thumbnail}
                alt={resumeVideo.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
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
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
                  {resumeCourse.title}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Topic {resumeVideo.position} of {resumeCourse.items.length}
                </span>
                {resumeVideoProgress && resumeVideoProgress.currentTime > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-semibold">
                    {resumeVideoProgress.percent}% watched ({formatTime(resumeVideoProgress.currentTime)})
                  </span>
                )}
              </div>

              <h4
                className={`text-base sm:text-lg font-bold tracking-tight line-clamp-2 ${
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
                className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Continue Now
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

      {/* Curated Learning Roadmaps Component */}
      {(activeTab === 'overview' || activeTab === 'roadmaps') && (
        <LearningRoadmaps
          studyData={studyData}
          courses={courses}
          onSelectCourse={(c) => onSelectCourse(c)}
          onOpenImportModal={onOpenImportModal}
          onToggleEnrollRoadmap={onToggleEnrollRoadmap || (() => {})}
          onToggleMilestoneComplete={onToggleMilestoneComplete || (() => {})}
          theme={theme}
        />
      )}

      {/* Playlist Library Section */}
      {(activeTab === 'overview' || activeTab === 'playlists') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3
                className={`text-lg font-bold tracking-tight ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                My Playlist Tracks ({courses.length})
              </h3>
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Select any playlist track to start learning with embedded playback, timestamp resumption, and topic checklists.
              </p>
            </div>

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
              {courses.map((course) => {
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
                    className={`flex flex-col rounded-2xl border transition-all overflow-hidden group ${
                      isActive
                        ? isDark
                          ? 'bg-zinc-900/80 border-indigo-500/50 ring-1 ring-indigo-500/40 shadow-xl'
                          : 'bg-white border-indigo-300 ring-1 ring-indigo-200 shadow-md'
                        : isDark
                        ? 'bg-[#0c0c0e] border-zinc-800/80 hover:border-zinc-700 shadow-lg'
                        : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
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
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-3.5">
                        <div className="flex items-center justify-between">
                          {isActive && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500 text-black font-bold">
                              Active Track
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-zinc-200 ml-auto">
                            {course.items.length} Lectures
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/90 flex items-center justify-center shadow-md">
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
                        <p className="text-xs text-zinc-500 truncate">
                          {course.channelTitle || 'YouTube Creator'}
                        </p>
                      </div>

                      {/* Progress Bar & Details */}
                      <div className="space-y-2 pt-2 border-t border-zinc-800/40">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-medium ${
                              isDark ? 'text-zinc-400' : 'text-zinc-600'
                            }`}
                          >
                            {completedInCourse} / {course.items.length} Completed
                          </span>
                          <span className="font-mono font-bold text-emerald-500">
                            {courseProgress}%
                          </span>
                        </div>

                        <div
                          className={`w-full h-2 rounded-full overflow-hidden ${
                            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                          }`}
                        >
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
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
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                        <button
                          onClick={() => onSelectCourse(course)}
                          className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Start Studying</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onResetCourseProgress(course.id);
                            }}
                            className={`p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer`}
                            title="Reset Progress"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              onDeleteCourse(course.id);
                            }}
                            className={`p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer`}
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
