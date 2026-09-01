'use client';

import React, { useState, useMemo } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Clock,
  Award,
  Sparkles,
  BookOpen,
  ArrowRight,
  Code2,
  Binary,
  Server,
  Cloud,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Bookmark,
  BookmarkCheck,
  Check,
  ListOrdered,
  Lock,
  Play,
} from 'lucide-react';
import { LearningRoadmap, RoadmapMilestone, PlaylistCourse, UserStudyData } from '@/types/playlist';
import { CURATED_ROADMAPS } from '@/lib/roadmaps';

interface LearningRoadmapsProps {
  studyData: UserStudyData;
  courses: PlaylistCourse[];
  onSelectCourse?: (course: PlaylistCourse) => void;
  onOpenImportModal?: () => void;
  onToggleEnrollRoadmap: (roadmapId: string) => void;
  onToggleMilestoneComplete: (milestoneId: string) => void;
  theme?: 'dark' | 'light';
}

const CATEGORY_TABS = [
  'All Tracks',
  'Frontend',
  'Algorithms',
  'Backend & Systems',
  'AI & Machine Learning',
  'DevOps & Cloud',
] as const;

export function LearningRoadmaps({
  studyData,
  courses,
  onSelectCourse,
  onOpenImportModal,
  onToggleEnrollRoadmap,
  onToggleMilestoneComplete,
  theme = 'dark',
}: LearningRoadmapsProps) {
  const isDark = theme === 'dark';

  const [selectedCategory, setSelectedCategory] = useState<string>('All Tracks');
  const [expandedRoadmapId, setExpandedRoadmapId] = useState<string | null>(
    CURATED_ROADMAPS[0]?.id || null
  );

  const enrolledSet = useMemo(() => {
    return new Set(studyData.enrolledRoadmapIds || []);
  }, [studyData.enrolledRoadmapIds]);

  const completedMilestonesSet = useMemo(() => {
    return new Set(studyData.completedMilestoneIds || []);
  }, [studyData.completedMilestoneIds]);

  const allRoadmaps = useMemo(() => {
    const custom = studyData.customRoadmaps || [];
    return [...CURATED_ROADMAPS, ...custom];
  }, [studyData.customRoadmaps]);

  const filteredRoadmaps = useMemo(() => {
    if (selectedCategory === 'All Tracks') return allRoadmaps;
    return allRoadmaps.filter((r) => r.category === selectedCategory);
  }, [allRoadmaps, selectedCategory]);

  const getRoadmapProgress = (roadmap: LearningRoadmap) => {
    const total = roadmap.milestones.length;
    if (total === 0) return 0;
    const completed = roadmap.milestones.filter((m) => completedMilestonesSet.has(m.id)).length;
    return Math.round((completed / total) * 100);
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Binary':
        return <Binary className="w-5 h-5" />;
      case 'Server':
        return <Server className="w-5 h-5" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'Cloud':
        return <Cloud className="w-5 h-5" />;
      case 'Code2':
      default:
        return <Code2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Roadmaps Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-xs font-semibold">
              <Layers className="w-3 h-3" />
              <span>Structured Engineering Tracks</span>
            </div>
          </div>
          <h3
            className={`text-xl font-bold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            Curated Learning Roadmaps
          </h3>
          <p className="text-xs text-zinc-500 max-w-xl">
            Step-by-step developer learning paths. Enroll in multi-course roadmaps, complete milestones, and master key technical proficiencies.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center flex-wrap gap-1.5 p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Roadmaps Grid / List */}
      <div className="grid grid-cols-1 gap-5">
        {filteredRoadmaps.map((roadmap) => {
          const isEnrolled = enrolledSet.has(roadmap.id);
          const progressPercent = getRoadmapProgress(roadmap);
          const isExpanded = expandedRoadmapId === roadmap.id;
          const completedCount = roadmap.milestones.filter((m) =>
            completedMilestonesSet.has(m.id)
          ).length;

          return (
            <div
              key={roadmap.id}
              className={`rounded-3xl border transition-all overflow-hidden ${
                isExpanded
                  ? isDark
                    ? 'bg-[#0c0c0e] border-indigo-500/40 ring-1 ring-indigo-500/30 shadow-2xl'
                    : 'bg-white border-indigo-300 ring-1 ring-indigo-200 shadow-lg'
                  : isDark
                  ? 'bg-[#0c0c0e] border-zinc-800/80 hover:border-zinc-700 shadow-md'
                  : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
              }`}
            >
              {/* Roadmap Header Summary Card */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                      style={{
                        backgroundColor: `${roadmap.color}20`,
                        color: roadmap.color,
                        border: `1px solid ${roadmap.color}40`,
                      }}
                    >
                      {getIconComponent(roadmap.icon)}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-semibold">
                          {roadmap.category}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                            roadmap.level === 'Beginner'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : roadmap.level === 'Advanced'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {roadmap.level}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ⏱ {roadmap.estimatedWeeks} Weeks Track
                        </span>
                      </div>

                      <h4
                        className={`text-lg sm:text-xl font-bold tracking-tight ${
                          isDark ? 'text-zinc-100' : 'text-zinc-900'
                        }`}
                      >
                        {roadmap.title}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                        {roadmap.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Enroll & Expand */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button
                      onClick={() => onToggleEnrollRoadmap(roadmap.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isEnrolled
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isDark
                          ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                          : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {isEnrolled ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Enrolled</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Enroll in Track</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        setExpandedRoadmapId(isExpanded ? null : roadmap.id)
                      }
                      className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isDark
                          ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                          : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                      }`}
                      title={isExpanded ? 'Collapse Milestones' : 'Expand Milestones'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-800/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">
                      Milestones Completed: {completedCount} / {roadmap.milestones.length}
                    </span>
                    <span className="font-mono font-bold text-emerald-500">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Milestones Timeline */}
              {isExpanded && (
                <div
                  className={`p-5 sm:p-6 border-t space-y-4 animate-fade-in ${
                    isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50/70 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Roadmap Milestones &amp; Learning Steps</span>
                    </h5>
                    <span className="text-[11px] text-zinc-500">
                      Click checkboxes to update milestone completion
                    </span>
                  </div>

                  <div className="space-y-3 relative">
                    {roadmap.milestones.map((milestone, mIdx) => {
                      const isMilestoneDone = completedMilestonesSet.has(milestone.id);

                      return (
                        <div
                          key={milestone.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                            isMilestoneDone
                              ? isDark
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-zinc-300'
                                : 'bg-emerald-50/60 border-emerald-200 text-zinc-800'
                              : isDark
                              ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                              : 'bg-white border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            {/* Checkbox */}
                            <button
                              onClick={() => onToggleMilestoneComplete(milestone.id)}
                              className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isMilestoneDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                  : isDark
                                  ? 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'
                                  : 'border-zinc-300 hover:border-zinc-400 bg-white'
                              }`}
                            >
                              {isMilestoneDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-semibold">
                                  Step {mIdx + 1}
                                </span>
                                <h6
                                  className={`text-sm font-bold tracking-tight ${
                                    isMilestoneDone
                                      ? 'line-through text-zinc-400'
                                      : isDark
                                      ? 'text-zinc-100'
                                      : 'text-zinc-900'
                                  }`}
                                >
                                  {milestone.title}
                                </h6>
                              </div>

                              <p className="text-xs text-zinc-500 leading-relaxed">
                                {milestone.description}
                              </p>

                              {/* Skills Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {milestone.skills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  ~{milestone.estimatedHours} hrs
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button for Milestone */}
                          <div className="shrink-0 self-end sm:self-center">
                            {courses.length > 0 ? (
                              <button
                                onClick={() => {
                                  if (onSelectCourse) {
                                    onSelectCourse(courses[0]);
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                  isDark
                                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                                    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                                }`}
                              >
                                <Play className="w-3 h-3 fill-current text-emerald-400" />
                                <span>Study Track</span>
                              </button>
                            ) : (
                              onOpenImportModal && (
                                <button
                                  onClick={onOpenImportModal}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Import Course</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
