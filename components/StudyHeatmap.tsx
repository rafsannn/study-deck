'use client';

import React, { useState, useMemo } from 'react';
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
import { formatDurationHuman } from '@/lib/utils';

interface StudyHeatmapProps {
  studyData: UserStudyData;
  onUpdateWeeklyGoal?: (goal: WeeklyStudyGoal) => void;
  onLogStudySession?: (date: string, minutes: number, topics: number) => void;
  theme?: 'dark' | 'light';
}

interface DayCellData {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  minutes: number;
  topics: number;
  intensityLevel: number; // 0 to 4
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  monthName: string;
}

export function StudyHeatmap({
  studyData,
  onUpdateWeeklyGoal,
  onLogStudySession,
  theme = 'dark',
}: StudyHeatmapProps) {
  const isDark = theme === 'dark';

  const [hoveredCell, setHoveredCell] = useState<DayCellData | null>(null);
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
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Pre-aggregate watch progress history into activity if needed
  const combinedActivityMap = useMemo(() => {
    const map: Record<string, DailyActivityRecord> = {
      ...(studyData.dailyActivity || {}),
    };

    // If streak exists and has lastActiveDate, ensure today or streak date is represented
    if (studyData.streak?.lastActiveDate && !map[studyData.streak.lastActiveDate]) {
      map[studyData.streak.lastActiveDate] = {
        minutes: 25,
        seconds: 1500,
        topics: 1,
      };
    }

    // Auto-extract dates from videoProgress lastWatchedAt to ensure unfinished watch time is represented
    if (studyData.videoProgress) {
      Object.entries(studyData.videoProgress).forEach(([_, p]) => {
        if (p.lastWatchedAt && p.currentTime > 0) {
          const d = p.lastWatchedAt.slice(0, 10);
          const currentMins = Math.max(1, Math.round(p.currentTime / 60));
          if (!map[d]) {
            map[d] = {
              minutes: currentMins,
              seconds: p.currentTime,
              topics: p.percent >= 90 ? 1 : 0,
            };
          } else {
            // Keep the maximum of recorded activity minutes or watched progress minutes for that date
            map[d] = {
              ...map[d],
              minutes: Math.max(map[d].minutes || 0, currentMins),
              seconds: Math.max(map[d].seconds || (map[d].minutes * 60) || 0, p.currentTime),
            };
          }
        }
      });
    }

    return map;
  }, [studyData.dailyActivity, studyData.streak, studyData.videoProgress]);

  // Compute 20 weeks of history (140 days) ending on the current week Saturday
  const { weeks, totalMinutesPastYear, activeDaysCount, maxDailyMinutes } = useMemo(() => {
    const today = new Date();
    // End on upcoming or current Saturday
    const currentDay = today.getDay(); // 0 is Sun, 6 is Sat
    const daysUntilSaturday = 6 - currentDay;

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysUntilSaturday);

    const totalWeeks = 20; // 20 weeks of rich GitHub-style matrix
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
      const dateStr = tempDate.toISOString().slice(0, 10);
      const activity = combinedActivityMap[dateStr];
      const minutes = activity?.minutes || 0;
      const topics = activity?.topics || 0;

      if (minutes > 0 || topics > 0) {
        totalMins += minutes;
        activeDays += 1;
        if (minutes > maxMins) maxMins = minutes;
      }

      // Calculate intensity (0 to 4)
      let level = 0;
      if (minutes > 0 || topics > 0) {
        if (minutes >= 90 || topics >= 4) level = 4;
        else if (minutes >= 45 || topics >= 2) level = 3;
        else if (minutes >= 20 || topics >= 1) level = 2;
        else level = 1;
      }

      const cellData: DayCellData = {
        dateStr,
        dateObj: new Date(tempDate),
        minutes,
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
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    let weekMinutes = 0;
    let weekTopics = 0;
    let activeDaysThisWeek = 0;

    for (let d = 0; d < 7; d++) {
      const temp = new Date(startOfWeek);
      temp.setDate(startOfWeek.getDate() + d);
      const str = temp.toISOString().slice(0, 10);
      const act = combinedActivityMap[str];
      if (act) {
        weekMinutes += act.minutes || 0;
        weekTopics += act.topics || 0;
        if (act.minutes > 0 || act.topics > 0) {
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

    weeks.forEach((week, index) => {
      const firstDayOfMonth = week.find((day) => day.dateObj.getDate() <= 7);
      if (firstDayOfMonth && firstDayOfMonth.monthName !== lastMonth) {
        labels.push({ index, text: firstDayOfMonth.monthName });
        lastMonth = firstDayOfMonth.monthName;
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

  // Submit manual session log
  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogStudySession) {
      onLogStudySession(logDate, Number(logMinutes) || 0, Number(logTopics) || 0);
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-zinc-800/40">
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

      {/* Weekly Progress Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Weekly Minutes Progress */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
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

          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${currentWeekMetrics.minsPercent}%` }}
            />
          </div>
        </div>

        {/* Weekly Topics Completed */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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

          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${currentWeekMetrics.topicsPercent}%` }}
            />
          </div>
        </div>

        {/* Active Days this Week */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Active Consistency</span>
            </span>
            <span className="text-xs font-mono text-amber-500 font-bold">
              {studyData.streak?.count || 0}d streak
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-500">
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
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay() + dIdx);
              const dateStr = startOfWeek.toISOString().slice(0, 10);
              const act = combinedActivityMap[dateStr];
              const hasAct = (act?.minutes || 0) > 0 || (act?.topics || 0) > 0;

              return (
                <div key={dIdx} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full h-1.5 rounded-full ${
                      hasAct
                        ? 'bg-amber-500'
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
            Activity Matrix (Past 20 Weeks)
          </span>
          <span className="font-mono text-[11px]">
            {activeDaysCount} active days • {formatDurationHuman(totalMinutesPastYear * 60)} logged
          </span>
        </div>

        <div
          className={`p-4 rounded-2xl border overflow-x-auto ${
            isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-zinc-50/80 border-zinc-200'
          }`}
        >
          <div className="min-w-[640px]">
            {/* Months Header */}
            <div className="flex text-[10px] font-mono text-zinc-500 mb-1.5 pl-6">
              {weeks.map((week, wIdx) => {
                const firstDay = week[0];
                const matchingMonth = monthLabels.find((m) => m.index === wIdx);
                return (
                  <div key={wIdx} className="w-3.5 sm:w-4 mr-1 text-left shrink-0">
                    {matchingMonth ? matchingMonth.text : ''}
                  </div>
                );
              })}
            </div>

            {/* Grid with Day of Week Rows (Sun to Sat) */}
            <div className="flex">
              {/* Day Labels on Left */}
              <div className="flex flex-col justify-between text-[9px] font-mono text-zinc-500 pr-2 select-none h-[116px]">
                <span className="h-3 leading-3">Sun</span>
                <span className="h-3 leading-3">Tue</span>
                <span className="h-3 leading-3">Thu</span>
                <span className="h-3 leading-3">Sat</span>
              </div>

              {/* Matrix Columns (Weeks) */}
              <div className="flex gap-1">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                    {week.map((day) => {
                      const isToday =
                        day.dateStr === new Date().toISOString().slice(0, 10);

                      // Determine square background based on intensity
                      let bgClass = isDark
                        ? 'bg-zinc-900 border border-zinc-800/60'
                        : 'bg-zinc-200/80 border border-zinc-300/40';

                      if (day.intensityLevel === 1) {
                        bgClass = isDark
                          ? 'bg-emerald-950 border border-emerald-800/60 text-emerald-300'
                          : 'bg-emerald-200 border border-emerald-300 text-emerald-800';
                      } else if (day.intensityLevel === 2) {
                        bgClass = isDark
                          ? 'bg-emerald-800 border border-emerald-700 text-emerald-200'
                          : 'bg-emerald-400 border border-emerald-500 text-white';
                      } else if (day.intensityLevel === 3) {
                        bgClass = isDark
                          ? 'bg-emerald-600 border border-emerald-500 text-white'
                          : 'bg-emerald-500 border border-emerald-600 text-white';
                      } else if (day.intensityLevel === 4) {
                        bgClass = isDark
                          ? 'bg-emerald-400 border border-emerald-300 shadow-xs shadow-emerald-400/30 text-emerald-950'
                          : 'bg-emerald-600 border border-emerald-700 text-white';
                      }

                      return (
                        <div
                          key={day.dateStr}
                          onMouseEnter={(e) => {
                            setHoveredCell(day);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                            });
                          }}
                          onMouseLeave={() => {
                            setHoveredCell(null);
                            setTooltipPos(null);
                          }}
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] cursor-pointer transition-transform hover:scale-125 relative ${bgClass} ${
                            isToday ? 'ring-2 ring-indigo-500' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Legend */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800/40 text-[10px] text-zinc-500 font-mono">
              <div className="flex items-center gap-2">
                <span>Learn every day to maintain streak</span>
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
          </div>
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
            zIndex: 9999,
          }}
          className={`p-2.5 rounded-xl border text-xs shadow-2xl space-y-1 min-w-[160px] animate-fade-in ${
            isDark
              ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-black/80'
              : 'bg-white border-zinc-300 text-zinc-900 shadow-xl'
          }`}
        >
          <div className="font-bold font-mono text-[11px] text-zinc-400">
            {hoveredCell.dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-400">Time Studied:</span>
            <span className="font-bold font-mono text-sky-400">
              {hoveredCell.minutes > 0
                ? formatDurationHuman(hoveredCell.minutes * 60)
                : 'No activity'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-400">Completed Topics:</span>
            <span className="font-bold font-mono text-emerald-400">
              {hoveredCell.topics} {hoveredCell.topics === 1 ? 'topic' : 'topics'}
            </span>
          </div>

          {hoveredCell.intensityLevel >= 3 && (
            <div className="text-[10px] text-amber-400 font-semibold pt-0.5 border-t border-zinc-800">
              🔥 High Intensity Session!
            </div>
          )}
        </div>
      )}

      {/* Manual Study Session Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
              isDark
                ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">Log Practice / Study Session</h4>
                  <p className="text-[11px] text-zinc-500">Add to your consistency heatmap</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Session Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className={`w-full text-xs font-mono p-2.5 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Minutes Studied</label>
                <input
                  type="number"
                  min="5"
                  max="720"
                  step="5"
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(parseInt(e.target.value) || 0)}
                  className={`w-full text-xs font-mono p-2.5 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Topics / Problems Mastered</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={logTopics}
                  onChange={(e) => setLogTopics(parseInt(e.target.value) || 0)}
                  className={`w-full text-xs font-mono p-2.5 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  Save to Heatmap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
