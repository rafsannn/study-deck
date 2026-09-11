'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import {
  Flame,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Target,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Edit2,
  Award,
} from 'lucide-react';
import { UserStudyData, WeeklyStudyGoal, DailyActivityRecord } from '@/types/playlist';
import { formatDurationHuman, getLocalDateString, getYesterdayDateString } from '@/lib/utils';

interface StudyHeatmapProps {
  studyData: UserStudyData;
  onUpdateWeeklyGoal?: (goal: WeeklyStudyGoal) => void;
  onLogStudySession?: (date: string, minutes: number, topics: number, mode?: 'add' | 'set') => void;
  theme?: 'dark' | 'light';
}

interface DayCellData {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  minutes: number;
  seconds: number;
  topics: number;
  intensityLevel: number; // 0 to 4
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  monthName: string;
}

const emptySubscribe = () => () => {};

export function StudyHeatmap({
  studyData,
  onUpdateWeeklyGoal,
  onLogStudySession,
  theme = 'dark',
}: StudyHeatmapProps) {
  const isDark = theme === 'dark';

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [hoveredCell, setHoveredCell] = useState<DayCellData | null>(null);
  const [selectedCell, setSelectedCell] = useState<DayCellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [targetMinsInput, setTargetMinsInput] = useState(
    studyData.weeklyGoal?.targetMinutes || 300
  );
  const [targetTopicsInput, setTargetTopicsInput] = useState(
    studyData.weeklyGoal?.targetTopics || 8
  );
  const [showLogModal, setShowLogModal] = useState(false);
  const [logMinutes, setLogMinutes] = useState(30);
  const [logTopics, setLogTopics] = useState(1);
  const [logDate, setLogDate] = useState(() => getLocalDateString());
  const [logMode, setLogMode] = useState<'set' | 'add'>('set');

  // Comprehensive activity map: combines real-time logged daily activity and tracked video progress
  const combinedActivityMap = useMemo(() => {
    const map: Record<string, DailyActivityRecord> = {
      ...(studyData.dailyActivity || {}),
    };

    // If videoProgress exists, ensure any watch time with a date is represented
    if (studyData.videoProgress) {
      Object.entries(studyData.videoProgress).forEach(([_, p]) => {
        if (p.lastWatchedAt && p.currentTime > 0) {
          const dateStr = p.lastWatchedAt.slice(0, 10);
          const watchedSecs = Math.round(p.currentTime);
          const watchedMins = Math.max(1, Math.round(watchedSecs / 60));

          if (!map[dateStr]) {
            map[dateStr] = {
              minutes: watchedMins,
              seconds: watchedSecs,
              topics: 0,
            };
          } else {
            const currentSecs =
              map[dateStr].seconds !== undefined
                ? map[dateStr].seconds!
                : (map[dateStr].minutes || 0) * 60;
            const finalSecs = Math.max(currentSecs, watchedSecs);
            map[dateStr] = {
              ...map[dateStr],
              seconds: finalSecs,
              minutes: Math.max(map[dateStr].minutes || 0, Math.round(finalSecs / 60)),
            };
          }
        }
      });
    }

    // If active streak has a lastActiveDate, guarantee it shows at least baseline activity
    if (studyData.streak?.lastActiveDate && !map[studyData.streak.lastActiveDate]) {
      map[studyData.streak.lastActiveDate] = {
        minutes: 20,
        seconds: 1200,
        topics: 1,
      };
    }

    return map;
  }, [studyData.dailyActivity, studyData.videoProgress, studyData.streak]);

  // Today's exact study metrics
  const todayMetrics = useMemo(() => {
    const todayStr = getLocalDateString();
    const act = combinedActivityMap[todayStr];
    const seconds = act?.seconds !== undefined ? act.seconds : (act?.minutes || 0) * 60;
    const minutes = act?.minutes !== undefined && act.minutes > 0 ? act.minutes : Math.round(seconds / 60);
    const topics = act?.topics || 0;
    const isStudiedToday = seconds > 0 || minutes > 0 || topics > 0;

    return {
      todayStr,
      seconds,
      minutes,
      topics,
      isStudiedToday,
    };
  }, [combinedActivityMap]);

  // Compute 52 weeks of history (364 days / 1 full year) ending on the current week Saturday
  const { weeks, totalMinutesPastYear, activeDaysCount, maxDailyMinutes } = useMemo(() => {
    const today = new Date();
    // End on upcoming or current Saturday
    const currentDay = today.getDay(); // 0 is Sun, 6 is Sat
    const daysUntilSaturday = 6 - currentDay;

    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    endDate.setDate(endDate.getDate() + daysUntilSaturday);

    const totalWeeks = 52; // 52 weeks of rich GitHub-style 1-year matrix
    const totalDays = totalWeeks * 7;

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (totalDays - 1));

    const weeksList: DayCellData[][] = [];
    let currentWeek: DayCellData[] = [];
    let totalMins = 0;
    let activeDays = 0;
    let maxMins = 0;

    const tempDate = new Date(startDate);

    for (let i = 0; i < totalDays; i++) {
      const dateStr = getLocalDateString(tempDate);
      const activity = combinedActivityMap[dateStr];
      const seconds = activity?.seconds !== undefined ? activity.seconds : (activity?.minutes || 0) * 60;
      const minutes = activity?.minutes !== undefined && activity.minutes > 0 ? activity.minutes : Math.round(seconds / 60);
      const topics = activity?.topics || 0;

      if (seconds > 0 || minutes > 0 || topics > 0) {
        totalMins += Math.max(minutes, Math.ceil(seconds / 60));
        activeDays += 1;
        if (minutes > maxMins) maxMins = minutes;
      }

      // Calculate intensity (0 to 4)
      let level = 0;
      const effectiveMins = Math.max(minutes, Math.round(seconds / 60));
      if (effectiveMins > 0 || seconds > 0 || topics > 0) {
        if (effectiveMins >= 90 || topics >= 4) level = 4;
        else if (effectiveMins >= 45 || topics >= 2) level = 3;
        else if (effectiveMins >= 20 || topics >= 1) level = 2;
        else level = 1;
      }

      const cellData: DayCellData = {
        dateStr,
        dateObj: new Date(tempDate),
        minutes,
        seconds,
        topics,
        intensityLevel: level,
        dayOfWeek: tempDate.getDay(),
        monthName: tempDate.toLocaleString('default', { month: 'short' }),
      };

      currentWeek.push(cellData);

      if (currentWeek.length === 7) {
        weeksList.push(currentWeek);
        currentWeek = [];
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeksList.push(currentWeek);
    }

    return {
      weeks: weeksList,
      totalMinutesPastYear: totalMins,
      activeDaysCount: activeDays,
      maxDailyMinutes: maxMins,
    };
  }, [combinedActivityMap]);

  // Current Week Calculation
  const currentWeekMetrics = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday

    let weekMinutes = 0;
    let weekSeconds = 0;
    let weekTopics = 0;
    let activeDaysThisWeek = 0;

    for (let d = 0; d < 7; d++) {
      const temp = new Date(startOfWeek);
      temp.setDate(startOfWeek.getDate() + d);
      const str = getLocalDateString(temp);
      const act = combinedActivityMap[str];
      if (act) {
        const secs = act.seconds !== undefined ? act.seconds : (act.minutes || 0) * 60;
        const mins = act.minutes !== undefined && act.minutes > 0 ? act.minutes : Math.round(secs / 60);
        weekMinutes += mins;
        weekSeconds += secs;
        weekTopics += act.topics || 0;
        if (secs > 0 || mins > 0 || (act.topics || 0) > 0) {
          activeDaysThisWeek += 1;
        }
      }
    }

    const weeklyGoalMins = studyData.weeklyGoal?.targetMinutes || 300;
    const weeklyGoalTopics = studyData.weeklyGoal?.targetTopics || 8;
    const minsPercent = Math.min(100, Math.round((weekMinutes / weeklyGoalMins) * 100));
    const topicsPercent = Math.min(100, Math.round((weekTopics / weeklyGoalTopics) * 100));

    return {
      weekMinutes,
      weekSeconds,
      weekTopics,
      activeDaysThisWeek,
      weeklyGoalMins,
      weeklyGoalTopics,
      minsPercent,
      topicsPercent,
    };
  }, [combinedActivityMap, studyData.weeklyGoal]);

  // Month Labels for Heatmap Columns
  const monthLabels = useMemo(() => {
    const labels: { index: number; text: string }[] = [];
    let lastMonth = '';
    let lastIndex = -10;

    weeks.forEach((week, index) => {
      const firstDayOfMonth = week.find((day) => day.dateObj.getDate() <= 7);
      if (firstDayOfMonth && firstDayOfMonth.monthName !== lastMonth) {
        if (index - lastIndex >= 3) {
          labels.push({ index, text: firstDayOfMonth.monthName });
          lastMonth = firstDayOfMonth.monthName;
          lastIndex = index;
        }
      }
    });

    return labels;
  }, [weeks]);

  // Save weekly goal changes
  const handleSaveGoal = () => {
    if (onUpdateWeeklyGoal) {
      onUpdateWeeklyGoal({
        targetMinutes: Number(targetMinsInput) || 300,
        targetTopics: Number(targetTopicsInput) || 8,
      });
    }
    setIsEditingGoal(false);
  };

  // Submit manual session log / time adjustment
  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogStudySession) {
      onLogStudySession(
        logDate,
        Math.max(0, Number(logMinutes) || 0),
        Math.max(0, Number(logTopics) || 0),
        logMode
      );
    }
    setShowLogModal(false);
  };

  return (
    <div
      className={`p-5 sm:p-7 rounded-3xl border transition-all ${
        isDark
          ? 'bg-[#0c0c0e] border-zinc-800 shadow-xl'
          : 'bg-white border-zinc-200 shadow-sm'
      }`}
    >
      {/* Header & Weekly Target Progress Bar */}
      <div
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b ${
          isDark ? 'border-zinc-800/40' : 'border-zinc-200'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold">
              <TrendingUp className="w-3 h-3" />
              <span>Weekly Study Target &amp; Activity</span>
            </div>
          </div>
          <h3
            className={`text-lg sm:text-xl font-bold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            Study Heatmap &amp; Consistency
          </h3>
          <p className="text-xs text-zinc-500 max-w-lg">
            Track your daily learning intensity, visual study streaks, and weekly graduation targets.
          </p>
        </div>

        {/* Weekly Goal Widget & Quick Action Button */}
        <div className="flex items-center flex-wrap gap-3">
          <button
            onClick={() => setShowLogModal(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
            }`}
            title="Log offline practice or revision study session"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Log Study Time</span>
          </button>

          <button
            onClick={() => setIsEditingGoal(!isEditingGoal)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-indigo-300 hover:text-indigo-200'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>{isEditingGoal ? 'Close Target' : 'Edit Weekly Goal'}</span>
          </button>
        </div>
      </div>

      {/* Goal Edit Drawer (if active) */}
      {isEditingGoal && (
        <div
          className={`my-5 p-4 rounded-2xl border space-y-3 animate-fade-in ${
            isDark ? 'bg-zinc-900/60 border-zinc-700/80' : 'bg-indigo-50/50 border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Configure Weekly Goals</span>
            </span>
            <span className="text-[11px] text-zinc-500">Auto-saved to your personal study deck</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                Weekly Study Time Target (Minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  max="1800"
                  step="30"
                  value={targetMinsInput}
                  onChange={(e) => setTargetMinsInput(parseInt(e.target.value) || 0)}
                  className={`w-full text-xs font-mono p-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                      : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                />
                <span className="text-xs text-zinc-500 font-mono whitespace-nowrap">
                  ({Math.round(targetMinsInput / 60)} hrs/wk)
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                Weekly Completed Topics Target
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={targetTopicsInput}
                onChange={(e) => setTargetTopicsInput(parseInt(e.target.value) || 0)}
                className={`w-full text-xs font-mono p-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                    : 'bg-white border-zinc-300 text-zinc-900'
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditingGoal(false)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-300 text-zinc-600'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGoal}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
            >
              Update Goal
            </button>
          </div>
        </div>
      )}

      {/* Weekly & Daily Progress Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Today's Study Time */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
            isDark
              ? 'bg-zinc-900/50 border-zinc-800/80 hover:border-amber-500/40'
              : 'bg-zinc-50 border-zinc-200/90 hover:border-amber-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>Today&apos;s Study Time</span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                todayMetrics.isStudiedToday
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-500/10 text-zinc-500 border border-zinc-700/20'
              }`}
            >
              {todayMetrics.isStudiedToday ? 'Active Today' : 'Ready'}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-bold font-mono ${
                todayMetrics.isStudiedToday
                  ? isDark
                    ? 'text-amber-400'
                    : 'text-amber-600'
                  : isDark
                  ? 'text-zinc-400'
                  : 'text-zinc-600'
              }`}
            >
              {formatDurationHuman(todayMetrics.seconds || todayMetrics.minutes * 60)}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              / ~{formatDurationHuman(Math.max(15, Math.round(currentWeekMetrics.weeklyGoalMins / 7)) * 60)} daily pace
            </span>
          </div>

          <div
            className={`w-full h-2 rounded-full overflow-hidden ${
              isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            }`}
          >
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((todayMetrics.seconds > 0 ? todayMetrics.seconds / 60 : todayMetrics.minutes) /
                      Math.max(15, Math.round(currentWeekMetrics.weeklyGoalMins / 7))) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Weekly Minutes Progress */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
            isDark
              ? 'bg-zinc-900/50 border-zinc-800/80 hover:border-sky-500/40'
              : 'bg-zinc-50 border-zinc-200/90 hover:border-sky-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <div className="p-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <span>This Week&apos;s Time</span>
            </span>
            <span className="font-mono font-bold text-sky-400">
              {currentWeekMetrics.minsPercent}%
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {formatDurationHuman(currentWeekMetrics.weekMinutes * 60)}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              / {formatDurationHuman(currentWeekMetrics.weeklyGoalMins * 60)} goal
            </span>
          </div>

          <div
            className={`w-full h-2 rounded-full overflow-hidden ${
              isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            }`}
          >
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${currentWeekMetrics.minsPercent}%` }}
            />
          </div>
        </div>

        {/* Weekly Topics Completed */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
            isDark
              ? 'bg-zinc-900/50 border-zinc-800/80 hover:border-emerald-500/40'
              : 'bg-zinc-50 border-zinc-200/90 hover:border-emerald-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={`font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Topics Finished</span>
            </span>
            <span className="font-mono font-bold text-emerald-500">
              {currentWeekMetrics.topicsPercent}%
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-500">
              {currentWeekMetrics.weekTopics}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              / {currentWeekMetrics.weeklyGoalTopics} topics target
            </span>
          </div>

          <div
            className={`w-full h-2 rounded-full overflow-hidden ${
              isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            }`}
          >
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${currentWeekMetrics.topicsPercent}%` }}
            />
          </div>
        </div>

        {/* Active Days this Week */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
            isDark
              ? 'bg-zinc-900/50 border-zinc-800/80 hover:border-orange-500/40'
              : 'bg-zinc-50 border-zinc-200/90 hover:border-orange-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <div className="p-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Flame className="w-3.5 h-3.5 animate-flame" />
              </div>
              <span>Active Consistency</span>
            </span>
            <span className="text-xs font-mono text-orange-400 font-bold">
              {studyData.streak?.count || 0}d streak
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-orange-400">
              {currentWeekMetrics.activeDaysThisWeek}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              / 7 days active this week
            </span>
          </div>

          {/* Mini 7-day dot indicator */}
          <div className="flex items-center justify-between gap-1 pt-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, dIdx) => {
              const now = new Date();
              const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + dIdx);
              const dateStr = getLocalDateString(startOfWeek);
              const act = combinedActivityMap[dateStr];
              const hasAct = (act?.seconds || 0) > 0 || (act?.minutes || 0) > 0 || (act?.topics || 0) > 0;

              return (
                <div key={dIdx} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full h-1.5 rounded-full ${
                      hasAct
                        ? 'bg-orange-500'
                        : isDark
                        ? 'bg-zinc-800'
                        : 'bg-zinc-300'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-zinc-500">{dayChar}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* GitHub-Style Matrix Container */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Activity Matrix (Past 52 Weeks • 1 Year)
          </span>
          <span className="font-mono text-[11px]">
            {activeDaysCount} active days • {formatDurationHuman(totalMinutesPastYear * 60)} logged
          </span>
        </div>

        <div
          className={`p-4 sm:p-5 rounded-2xl border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-zinc-50/80 border-zinc-200'
          }`}
        >
          {/* Responsive SVG Contribution Graph that expands to fill available container space */}
          <div className="w-full">
            {!isMounted ? (
              <div className="w-full h-[120px] rounded-xl flex items-center justify-center animate-pulse bg-zinc-900/20">
                <span className="text-[11px] font-mono text-zinc-500">Loading activity matrix...</span>
              </div>
            ) : (
              <svg
                viewBox="0 0 812 131"
                className="w-full h-auto max-w-full select-none overflow-visible"
                aria-label="Activity Contribution Graph"
              >
                {/* Month Labels aligned to exact week index x-coordinates */}
                {monthLabels.map((m) => {
                  const step = 15; // 11.5 cellSize + 3.5 gap
                  const leftMargin = 28;
                  const x = leftMargin + m.index * step;
                  return (
                    <text
                      key={`${m.index}-${m.text}`}
                      x={x}
                      y={13}
                      fill={isDark ? '#71717a' : '#71717a'}
                      fontSize="9.5"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                      fontWeight="500"
                    >
                      {m.text}
                    </text>
                  );
                })}

                {/* Day Labels on Left */}
                <text
                  x="0"
                  y={20 + 0 * 15 + 9}
                  fill={isDark ? '#52525b' : '#71717a'}
                  fontSize="8.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  Sun
                </text>
                <text
                  x="0"
                  y={20 + 2 * 15 + 9}
                  fill={isDark ? '#52525b' : '#71717a'}
                  fontSize="8.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  Tue
                </text>
                <text
                  x="0"
                  y={20 + 4 * 15 + 9}
                  fill={isDark ? '#52525b' : '#71717a'}
                  fontSize="8.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  Thu
                </text>
                <text
                  x="0"
                  y={20 + 6 * 15 + 9}
                  fill={isDark ? '#52525b' : '#71717a'}
                  fontSize="8.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  Sat
                </text>

                {/* 52-Week Matrix of Day Rectangles */}
                {weeks.map((week, wIdx) => {
                  const step = 15;
                  const leftMargin = 28;
                  const topMargin = 20;
                  const cellSize = 11.5;
                  const colX = leftMargin + wIdx * step;

                  return (
                    <g key={wIdx}>
                      {week.map((day, dIdx) => {
                        const rowY = topMargin + dIdx * step;
                        const isToday = day.dateStr === getLocalDateString();

                        // Determine colors based on intensity
                        let fill = isDark ? '#18181b' : '#e4e4e7';
                        let stroke = isDark ? '#27272a' : '#d4d4d8';

                        if (day.intensityLevel === 1) {
                          fill = isDark ? '#064e3b' : '#a7f3d0';
                          stroke = isDark ? '#065f46' : '#6ee7b7';
                        } else if (day.intensityLevel === 2) {
                          fill = isDark ? '#047857' : '#34d399';
                          stroke = isDark ? '#059669' : '#10b981';
                        } else if (day.intensityLevel === 3) {
                          fill = isDark ? '#059669' : '#059669';
                          stroke = isDark ? '#10b981' : '#047857';
                        } else if (day.intensityLevel === 4) {
                          fill = isDark ? '#34d399' : '#047857';
                          stroke = isDark ? '#6ee7b7' : '#064e3b';
                        }

                        const isHovered = hoveredCell?.dateStr === day.dateStr;
                        const isSelected = selectedCell?.dateStr === day.dateStr;

                        return (
                          <g key={day.dateStr}>
                            {isToday && (
                              <rect
                                x={colX - 1.2}
                                y={rowY - 1.2}
                                width={cellSize + 2.4}
                                height={cellSize + 2.4}
                                rx={3.2}
                                ry={3.2}
                                fill="none"
                                stroke={isDark ? '#818cf8' : '#6366f1'}
                                strokeWidth={1.5}
                                pointerEvents="none"
                              />
                            )}
                            {isSelected && !isToday && (
                              <rect
                                x={colX - 1.2}
                                y={rowY - 1.2}
                                width={cellSize + 2.4}
                                height={cellSize + 2.4}
                                rx={3.2}
                                ry={3.2}
                                fill="none"
                                stroke={isDark ? '#38bdf8' : '#0284c7'}
                                strokeWidth={1.5}
                                pointerEvents="none"
                              />
                            )}
                            {isHovered && !isToday && !isSelected && (
                              <rect
                                x={colX - 1}
                                y={rowY - 1}
                                width={cellSize + 2}
                                height={cellSize + 2}
                                rx={3}
                                ry={3}
                                fill="none"
                                stroke={isDark ? '#38bdf8' : '#0284c7'}
                                strokeWidth={1.4}
                                pointerEvents="none"
                              />
                            )}
                            <rect
                              x={colX}
                              y={rowY}
                              width={cellSize}
                              height={cellSize}
                              rx={2.5}
                              ry={2.5}
                              fill={fill}
                              stroke={isHovered || isSelected ? (isDark ? '#38bdf8' : '#0284c7') : stroke}
                              strokeWidth={isHovered || isSelected ? 1.2 : 0.8}
                              className="cursor-pointer transition-opacity hover:opacity-85"
                              onClick={() => {
                                setSelectedCell(day);
                              }}
                              onDoubleClick={() => {
                                setSelectedCell(day);
                                setLogDate(day.dateStr);
                                setLogMinutes(day.minutes);
                                setLogTopics(day.topics);
                                setLogMode('set');
                                setShowLogModal(true);
                              }}
                              onMouseEnter={(e) => {
                                setHoveredCell(day);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltipPos({
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 10,
                                });
                              }}
                              onMouseLeave={() => {
                                setHoveredCell(null);
                                setTooltipPos(null);
                              }}
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Matrix Legend */}
          <div
            className={`flex items-center justify-between pt-3 mt-3 border-t text-[10px] text-zinc-500 font-mono ${
              isDark ? 'border-zinc-800/40' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>Learn every day to maintain streak • Click any day cell to view hours</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <div
                className={`w-3 h-3 rounded-[3px] ${
                  isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-200'
                }`}
              />
              <div
                className={`w-3 h-3 rounded-[3px] ${
                  isDark ? 'bg-emerald-950 border border-emerald-800' : 'bg-emerald-200'
                }`}
              />
              <div
                className={`w-3 h-3 rounded-[3px] ${
                  isDark ? 'bg-emerald-800' : 'bg-emerald-400'
                }`}
              />
              <div
                className={`w-3 h-3 rounded-[3px] ${
                  isDark ? 'bg-emerald-600' : 'bg-emerald-500'
                }`}
              />
              <div
                className={`w-3 h-3 rounded-[3px] ${
                  isDark ? 'bg-emerald-400' : 'bg-emerald-600'
                }`}
              />
              <span>More</span>
            </div>
          </div>

          {/* Selected Day Inspector */}
          {(() => {
            const displayCell =
              selectedCell ||
              weeks.flat().find((c) => c.dateStr === todayMetrics.todayStr) ||
              weeks[weeks.length - 1]?.[6] ||
              null;
            if (!displayCell) return null;

            const isToday = displayCell.dateStr === todayMetrics.todayStr;
            const isYesterday = displayCell.dateStr === getYesterdayDateString();
            const cellSecs =
              displayCell.seconds !== undefined && displayCell.seconds > 0
                ? displayCell.seconds
                : displayCell.minutes * 60;
            const hasActivity = cellSecs > 0 || displayCell.topics > 0;

            return (
              <div
                className={`mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 ${
                      hasActivity
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isDark
                        ? 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500'
                        : 'bg-zinc-200 border-zinc-300 text-zinc-400'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        {displayCell.dateObj.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          Today
                        </span>
                      )}
                      {isYesterday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-700/40 text-zinc-400 border border-zinc-700">
                          Yesterday
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                      <span>
                        Time Studied:{' '}
                        <strong className={`font-mono ${hasActivity ? 'text-sky-400' : 'text-zinc-500'}`}>
                          {hasActivity ? formatDurationHuman(cellSecs) : '0m'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Topics Mastered:{' '}
                        <strong className={`font-mono ${displayCell.topics > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {displayCell.topics}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Intensity:{' '}
                        <span className="font-semibold text-zinc-300">
                          {displayCell.intensityLevel === 4
                            ? 'Very High (90m+)'
                            : displayCell.intensityLevel === 3
                            ? 'High (45m+)'
                            : displayCell.intensityLevel === 2
                            ? 'Moderate (20m+)'
                            : displayCell.intensityLevel === 1
                            ? 'Active (< 20m)'
                            : 'Rest Day'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setLogDate(displayCell.dateStr);
                    setLogMinutes(displayCell.minutes);
                    setLogTopics(displayCell.topics);
                    setLogMode('set');
                    setShowLogModal(true);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0 ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200 hover:text-white'
                      : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700 hover:text-zinc-900 shadow-2xs'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Adjust or Log Time</span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredCell && tooltipPos && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 9999,
          }}
          className={`p-3 rounded-xl border text-xs shadow-2xl space-y-1.5 min-w-[180px] pointer-events-none select-none transition-all duration-75 ${
            isDark
              ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-black/80'
              : 'bg-white border-zinc-300 text-zinc-900 shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b pb-1 border-zinc-800/40">
            <span className="font-bold font-mono text-[11px] text-zinc-400">
              {hoveredCell.dateObj.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {hoveredCell.dateStr === getLocalDateString() && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                Today
              </span>
            )}
            {hoveredCell.dateStr === getYesterdayDateString() && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-700/40 text-zinc-400">
                Yesterday
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-400">Time Studied:</span>
            <span className="font-bold font-mono text-sky-400">
              {(() => {
                const effSecs =
                  hoveredCell.seconds !== undefined && hoveredCell.seconds > 0
                    ? hoveredCell.seconds
                    : hoveredCell.minutes * 60;
                return effSecs > 0 ? formatDurationHuman(effSecs) : 'No activity';
              })()}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-400">Completed Topics:</span>
            <span className="font-bold font-mono text-emerald-400">
              {hoveredCell.topics} {hoveredCell.topics === 1 ? 'topic' : 'topics'}
            </span>
          </div>

          <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/40 flex items-center gap-1">
            <span>💡 Click to select • Double-click to adjust</span>
          </div>
        </div>
      )}

      {/* Manual Study Session Log / Adjustment Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
              isDark
                ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">Adjust / Log Study Time</h4>
                  <p className="text-[11px] text-zinc-500">
                    Fix inflated time, restore missed sessions, or record offline work
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Date Switcher Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400">Quick Date:</span>
              <button
                type="button"
                onClick={() => {
                  const today = getLocalDateString();
                  setLogDate(today);
                  const cur = combinedActivityMap[today];
                  if (cur) {
                    setLogMinutes(cur.minutes);
                    setLogTopics(cur.topics);
                    setLogMode('set');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  logDate === getLocalDateString()
                    ? 'bg-indigo-600 text-white font-semibold'
                    : isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const yest = getYesterdayDateString();
                  setLogDate(yest);
                  const cur = combinedActivityMap[yest];
                  if (cur) {
                    setLogMinutes(cur.minutes);
                    setLogTopics(cur.topics);
                    setLogMode('set');
                  } else {
                    setLogMinutes(30);
                    setLogTopics(1);
                    setLogMode('set');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  logDate === getYesterdayDateString()
                    ? 'bg-indigo-600 text-white font-semibold'
                    : isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                Yesterday
              </button>
            </div>

            {/* Current status on this date */}
            {combinedActivityMap[logDate] && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                }`}
              >
                <span className="text-[11px] text-zinc-400">Recorded for this day:</span>
                <span className="font-mono font-bold text-sky-400">
                  {formatDurationHuman((combinedActivityMap[logDate]?.minutes || 0) * 60)} • {combinedActivityMap[logDate]?.topics || 0} topics
                </span>
              </div>
            )}

            {/* Mode selection: Set exact vs Add */}
            <div className="flex rounded-xl p-1 bg-zinc-900 border border-zinc-800 gap-1">
              <button
                type="button"
                onClick={() => setLogMode('set')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-all ${
                  logMode === 'set'
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Set Exact Time (Correct/Replace)
              </button>
              <button
                type="button"
                onClick={() => setLogMode('add')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-all ${
                  logMode === 'add'
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                + Add Time to Day
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setLogDate(newDate);
                    const cur = combinedActivityMap[newDate];
                    if (cur && logMode === 'set') {
                      setLogMinutes(cur.minutes);
                      setLogTopics(cur.topics);
                    }
                  }}
                  className={`w-full text-xs font-mono p-2.5 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">
                    {logMode === 'set' ? 'Total Minutes on this Date' : 'Minutes to Add'}
                  </label>
                  <span className="text-[11px] font-mono text-sky-400">
                    {formatDurationHuman(logMinutes * 60)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  step="5"
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-full text-xs font-mono p-2.5 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                  required
                />

                {/* Quick Minute Preset Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-500 font-mono">Presets:</span>
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setLogMinutes(mins)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                        logMinutes === mins
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                          : isDark
                          ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">
                  {logMode === 'set' ? 'Total Topics Mastered' : 'Topics Mastered to Add'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={logTopics}
                  onChange={(e) => setLogTopics(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-full text-xs font-mono p-2.5 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/40">
                {combinedActivityMap[logDate] && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onLogStudySession) {
                        onLogStudySession(logDate, 0, 0, 'set');
                      }
                      setShowLogModal(false);
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    Clear Day (0 mins)
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                      isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-300 text-zinc-600'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
