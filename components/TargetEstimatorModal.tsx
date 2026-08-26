'use client';

import React, { useState } from 'react';
import {
  X,
  Target,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Award,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { PlaylistCourse, StudyGoal, UserStudyData } from '@/types/playlist';
import { calculateCourseDurations } from '@/lib/utils';

interface TargetEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: PlaylistCourse[];
  activeCourse: PlaylistCourse | null;
  studyData: UserStudyData;
  onUpdateGoal: (goal: StudyGoal) => void;
  theme?: 'dark' | 'light';
}

function formatDurationHuman(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0 mins';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  }
  return `${mins} min${mins !== 1 ? 's' : ''}`;
}

export function TargetEstimatorModal({
  isOpen,
  onClose,
  courses,
  activeCourse,
  studyData,
  onUpdateGoal,
  theme = 'dark',
}: TargetEstimatorModalProps) {
  const isDark = theme === 'dark';

  const defaultGoal: StudyGoal = studyData.studyGoal || {
    dailyTopics: 2,
    dailyMinutes: 45,
  };

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    activeCourse?.id || courses[0]?.id || 'all'
  );
  const [dailyTopics, setDailyTopics] = useState<number>(defaultGoal.dailyTopics || 2);
  const [dailyMinutes, setDailyMinutes] = useState<number>(defaultGoal.dailyMinutes || 45);
  const [goalType, setGoalType] = useState<'topics' | 'time'>('topics');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // Selected Scope Calculation
  let totalTopicsInScope = 0;
  let completedTopicsInScope = 0;
  let totalDurationSecondsInScope = 0;
  let completedDurationSecondsInScope = 0;

  const coursesToAnalyze =
    selectedCourseId === 'all'
      ? courses
      : courses.filter((c) => c.id === selectedCourseId);

  coursesToAnalyze.forEach((course) => {
    const completedSet = new Set(studyData.completedVideos[course.id] || []);
    totalTopicsInScope += course.items.length;
    completedTopicsInScope += course.items.filter((it) => completedSet.has(it.videoId)).length;

    const { watchedSecs, totalSecs } = calculateCourseDurations(
      course,
      studyData.completedVideos[course.id] || [],
      studyData.videoProgress || {}
    );

    totalDurationSecondsInScope += totalSecs;
    completedDurationSecondsInScope += watchedSecs;
  });

  const remainingTopics = Math.max(0, totalTopicsInScope - completedTopicsInScope);
  const remainingSeconds = Math.max(0, totalDurationSecondsInScope - completedDurationSecondsInScope);
  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  // Completion calculation
  const daysNeeded =
    goalType === 'topics'
      ? Math.ceil(remainingTopics / Math.max(1, dailyTopics))
      : Math.ceil(remainingMinutes / Math.max(5, dailyMinutes));

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysNeeded);

  const formattedTargetDate =
    remainingTopics === 0
      ? 'Course Completed! 🎉'
      : targetDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

  const handleSave = () => {
    onUpdateGoal({
      dailyTopics,
      dailyMinutes,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div
      id="target-estimator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-3xl border p-6 sm:p-7 shadow-2xl relative transition-all ${
          isDark
            ? 'bg-[#0e0e11] border-zinc-800 text-zinc-100 shadow-indigo-950/30'
            : 'bg-white border-zinc-200 text-zinc-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Daily Target &amp; Completion Estimator</h3>
              <p className="text-[11px] text-zinc-500">
                Plan your pace and project your course graduation date
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Selector */}
        <div className="my-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Course Scope
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium focus:outline-none cursor-pointer ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-zinc-100 border-zinc-200 text-zinc-800'
              }`}
            >
              <option value="all">All Combined Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.items.length} topics)
                </option>
              ))}
            </select>
          </div>

          {/* Goal Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-950/40 border border-zinc-800/40 text-xs font-semibold">
            <button
              onClick={() => setGoalType('topics')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                goalType === 'topics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Target by Topics per Day</span>
            </button>

            <button
              onClick={() => setGoalType('time')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                goalType === 'time'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Target by Study Time / Day</span>
            </button>
          </div>

          {/* Target Slider & Input */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            {goalType === 'topics' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-300">Daily Topic Target</span>
                  <span className="text-sm font-bold font-mono text-indigo-400">
                    {dailyTopics} {dailyTopics === 1 ? 'topic' : 'topics'} / day
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={dailyTopics}
                  onChange={(e) => setDailyTopics(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>1 topic (Relaxed)</span>
                  <span>3 topics (Consistent)</span>
                  <span>5+ topics (Intense)</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-300">Daily Study Duration</span>
                  <span className="text-sm font-bold font-mono text-indigo-400">
                    {dailyMinutes} minutes / day
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="180"
                  step="15"
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>15 mins</span>
                  <span>45 mins</span>
                  <span>90 mins</span>
                  <span>3 hrs</span>
                </div>
              </div>
            )}
          </div>

          {/* Estimation Projection Result Card */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col gap-3 relative overflow-hidden ${
              isDark
                ? 'bg-gradient-to-br from-indigo-950/40 via-[#0e0e11] to-emerald-950/20 border-indigo-500/30'
                : 'bg-gradient-to-br from-indigo-50 via-white to-emerald-50 border-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Estimated Completion Date
              </span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                    : 'bg-white border-zinc-200 text-zinc-700'
                }`}
              >
                {daysNeeded} {daysNeeded === 1 ? 'day' : 'days'} remaining
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className={isDark ? 'text-white' : 'text-zinc-900'}>{formattedTargetDate}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800/40 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">Remaining Topics</span>
                <span className="font-mono font-bold text-zinc-300">
                  {remainingTopics} of {totalTopicsInScope}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">Remaining Content</span>
                <span className="font-mono font-bold text-zinc-300">
                  {formatDurationHuman(remainingSeconds)}
                </span>
              </div>

              <div className="flex flex-col col-span-2 sm:col-span-1">
                <span className="text-[10px] text-zinc-500 uppercase">Completion Rate</span>
                <span className="font-mono font-bold text-emerald-400">
                  {totalTopicsInScope > 0
                    ? Math.round((completedTopicsInScope / totalTopicsInScope) * 100)
                    : 0}
                  % done
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-600'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Target Saved!</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                <span>Save Study Goal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
