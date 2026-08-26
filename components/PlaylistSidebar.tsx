'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  Search,
  X,
  Play,
  RotateCcw,
  CheckCheck,
  FileText,
  Volume2,
  SlidersHorizontal,
  Plus,
  Layers,
  Clock,
} from 'lucide-react';
import { PlaylistCourse, PlaylistItem, VideoWatchProgress } from '@/types/playlist';
import { calculateCourseDurations, formatDurationHuman, formatTime, parseDurationToSeconds } from '@/lib/utils';

function formatDisplayDuration(duration?: string | number): string {
  if (!duration) return '';
  const secs = parseDurationToSeconds(duration);
  return secs > 0 ? formatTime(secs) : String(duration);
}

interface PlaylistSidebarProps {
  course: PlaylistCourse | null;
  activeVideoId: string;
  completedVideoIds: string[];
  notesMap: Record<string, string>;
  watchProgressMap?: Record<string, VideoWatchProgress>;
  videoTagsMap?: Record<string, string[]>;
  onSelectVideo: (video: PlaylistItem) => void;
  onToggleComplete: (videoId: string) => void;
  onMarkAllComplete: () => void;
  onResetCourseProgress: () => void;
  onOpenImportModal?: () => void;
  theme?: 'dark' | 'light';
}

type FilterType = 'all' | 'remaining' | 'completed' | 'notes';

export function PlaylistSidebar({
  course,
  activeVideoId,
  completedVideoIds,
  notesMap,
  watchProgressMap = {},
  videoTagsMap = {},
  onSelectVideo,
  onToggleComplete,
  onMarkAllComplete,
  onResetCourseProgress,
  onOpenImportModal,
  theme = 'dark',
}: PlaylistSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const isDark = theme === 'dark';

  const completedSet = useMemo(() => new Set(completedVideoIds), [completedVideoIds]);

  const items = useMemo(() => course?.items || [], [course?.items]);
  const totalTopics = items.length;
  const completedCount = useMemo(
    () => items.filter((item) => completedSet.has(item.videoId)).length,
    [items, completedSet]
  );
  const progressPercent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  // Extract all unique tags present in this course
  const availableTagsInCourse = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((it) => {
      const tags = videoTagsMap[it.videoId] || [];
      tags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [items, videoTagsMap]);

  // Calculate total course durations (watched, total required, remaining)
  const courseDurations = useMemo(() => {
    if (!course) return { watchedSecs: 0, totalSecs: 0, remainingSecs: 0 };
    return calculateCourseDurations(
      course,
      completedVideoIds,
      watchProgressMap
    );
  }, [course, completedVideoIds, watchProgressMap]);

  // Map each videoId to its original 1-based sequential playlist position
  const itemIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item, idx) => {
      map.set(item.videoId, item.position || idx + 1);
    });
    return map;
  }, [items]);

  // Filter and search logic with relevance ranking & URL sanitization
  const filteredItems = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    const queryTokens = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

    // First filter by tab status and calculate relevance score
    const scoredList: { item: PlaylistItem; score: number; originalIndex: number }[] = [];

    items.forEach((item, idx) => {
      // 1. Check tab filter
      const isItemCompleted = completedSet.has(item.videoId);
      const hasItemNote = Boolean(notesMap[item.videoId]?.trim());
      const itemTags = videoTagsMap[item.videoId] || [];

      if (filter === 'completed' && !isItemCompleted) return;
      if (filter === 'remaining' && isItemCompleted) return;
      if (filter === 'notes' && !hasItemNote) return;
      if (activeTagFilter && !itemTags.includes(activeTagFilter)) return;

      const originalIndex = itemIndexMap.get(item.videoId) ?? (item.position || idx + 1);

      // 2. If no search query, preserve original order
      if (queryTokens.length === 0) {
        scoredList.push({ item, score: 0, originalIndex });
        return;
      }

      // 3. Clean search targets
      const title = (item.title || '').toLowerCase();
      const rawDesc = (item.description || '').toLowerCase();
      // Strip URLs, social domain links (e.g. linkedin.com), and boilerplate web addresses
      const cleanDesc = rawDesc
        .replace(/https?:\/\/[^\s]+/gi, ' ')
        .replace(/www\.[^\s]+/gi, ' ')
        .replace(/\b(linkedin|instagram|telegram|twitter|facebook|github|discord|youtube)\.com[^\s]*/gi, ' ')
        .replace(/\b(linkedin|insta|telegram|github|twitter)\b/gi, ' ');

      const note = (notesMap[item.videoId] || '').toLowerCase();
      const tagsStr = itemTags.join(' ').toLowerCase();
      const seqIndexStr = originalIndex.toString();
      const altSeqStr = (idx + 1).toString();

      // Check if all tokens match across the item's meaningful content
      const matchesAllTokens = queryTokens.every((token) => {
        return (
          title.includes(token) ||
          note.includes(token) ||
          tagsStr.includes(token) ||
          seqIndexStr === token ||
          altSeqStr === token ||
          `#${seqIndexStr}` === token ||
          `lecture ${seqIndexStr}`.includes(token) ||
          `topic ${seqIndexStr}`.includes(token) ||
          cleanDesc.includes(token)
        );
      });

      if (!matchesAllTokens) return;

      // Calculate relevance score
      let score = 0;

      // Exact title match gets supreme priority
      if (title.includes(rawQuery)) {
        score += 1000;
      }

      // Title word token matches
      queryTokens.forEach((token) => {
        if (title.includes(token)) {
          // Word boundary or starting match in title
          const titleWords = title.split(/[\s:,\-_]+/);
          if (titleWords.some((w) => w.startsWith(token) || w === token)) {
            score += 400;
          } else {
            score += 200;
          }
        }
      });

      // Lecture sequence number match
      if (seqIndexStr === rawQuery || `#${seqIndexStr}` === rawQuery) {
        score += 600;
      }

      // Note match
      if (note.includes(rawQuery)) {
        score += 150;
      }

      // Clean description match
      if (cleanDesc.includes(rawQuery)) {
        score += 20;
      }

      scoredList.push({ item, score, originalIndex });
    });

    // If searching, sort by relevance score descending, then by original playlist index
    if (queryTokens.length > 0) {
      scoredList.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.originalIndex - b.originalIndex;
      });
    }

    return scoredList.map((entry) => entry.item);
  }, [items, searchQuery, filter, activeTagFilter, completedSet, notesMap, videoTagsMap, itemIndexMap]);

  // Total matching items across the whole course regardless of tab filter
  const totalMatchesAcrossAll = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    if (!rawQuery) return 0;
    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    return items.filter((item, idx) => {
      const title = (item.title || '').toLowerCase();
      const rawDesc = (item.description || '').toLowerCase();
      const cleanDesc = rawDesc
        .replace(/https?:\/\/[^\s]+/gi, ' ')
        .replace(/www\.[^\s]+/gi, ' ')
        .replace(/\b(linkedin|instagram|telegram|twitter|facebook|github|discord|youtube)\.com[^\s]*/gi, ' ')
        .replace(/\b(linkedin|insta|telegram|github|twitter)\b/gi, ' ');

      const note = (notesMap[item.videoId] || '').toLowerCase();
      const seqIndexStr = (itemIndexMap.get(item.videoId) ?? (item.position || idx + 1)).toString();
      const altSeqStr = (idx + 1).toString();

      return queryTokens.every((token) => {
        return (
          title.includes(token) ||
          note.includes(token) ||
          seqIndexStr === token ||
          altSeqStr === token ||
          `#${seqIndexStr}` === token ||
          `lecture ${seqIndexStr}`.includes(token) ||
          `topic ${seqIndexStr}`.includes(token) ||
          cleanDesc.includes(token)
        );
      });
    }).length;
  }, [items, searchQuery, notesMap, itemIndexMap]);

  if (!course || items.length === 0) {
    return (
      <aside
        className={`w-full flex flex-col shrink-0 h-full p-6 items-center justify-center text-center transition-colors ${
          isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-zinc-800/40 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h4
          className={`text-sm font-semibold ${
            isDark ? 'text-zinc-300' : 'text-zinc-800'
          }`}
        >
          No Course Playlist
        </h4>
        <p className={`text-xs mt-1 max-w-[240px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
          Import a YouTube playlist to see the lesson checklist and track topic completions.
        </p>

        {onOpenImportModal && (
          <button
            onClick={onOpenImportModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import Playlist</span>
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      className={`w-full flex flex-col shrink-0 overflow-hidden transition-colors ${
        isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      {/* Course Progress Section */}
      <div
        className={`p-5 sm:p-6 border-b transition-colors ${
          isDark ? 'border-zinc-800 bg-[#09090b]/50' : 'border-zinc-50/70 bg-zinc-50/70'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm font-bold uppercase tracking-wider ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              Course Progress
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
              {progressPercent}% Completed
            </span>

            {/* Batch Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowBatchMenu(!showBatchMenu)}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-600 hover:text-zinc-900'
                }`}
                title="Options"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {showBatchMenu && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-xl z-50 py-1.5 text-xs animate-fade-in ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                      : 'bg-white border-zinc-200 text-zinc-800'
                  }`}
                >
                  <button
                    onClick={() => {
                      onMarkAllComplete();
                      setShowBatchMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all completed</span>
                  </button>
                  <button
                    onClick={() => {
                      onResetCourseProgress();
                      setShowBatchMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-600 hover:text-white flex items-center gap-2 text-rose-400 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset track progress</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar with sub-stats */}
        <div className="space-y-1.5">
          <div
            className={`w-full h-2 rounded-full overflow-hidden ${
              isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            }`}
          >
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-zinc-500 font-mono">
            <div className="flex justify-between items-center">
              <span>
                {completedCount} / {totalTopics} Topics
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>{formatDurationHuman(courseDurations.watchedSecs)} watched</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] pt-0.5 border-t border-zinc-800/20">
              <span>Total Required: <strong className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{formatDurationHuman(courseDurations.totalSecs)}</strong></span>
              <span className="text-indigo-400 font-semibold">{formatDurationHuman(courseDurations.remainingSecs)} left</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div id="playlist-sidebar-search-container" className="mt-4 space-y-2">
          <div
            id="playlist-sidebar-search-box"
            className={`flex items-center px-3 py-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-zinc-950/80 border-zinc-800 text-zinc-200 focus-within:border-indigo-500'
                : 'bg-white border-zinc-200 text-zinc-800 focus-within:border-indigo-500 shadow-xs'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0 mr-2" />
            <input
              id="playlist-sidebar-search-input"
              type="text"
              placeholder="Search lectures, topics, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              className="bg-transparent text-xs w-full focus:outline-none placeholder:text-zinc-500"
            />
            {searchQuery && (
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                <span className="text-[10px] font-mono font-semibold text-indigo-400">
                  {filteredItems.length} found
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
                  title="Clear Search"
                  aria-label="Clear Search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Filter Pills & Tag Filters */}
          <div className="flex flex-col gap-1.5 pb-1">
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] no-scrollbar">
              <button
                onClick={() => {
                  setFilter('all');
                  setActiveTagFilter(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                  filter === 'all' && !activeTagFilter
                    ? isDark
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'bg-zinc-900 text-white font-semibold'
                    : isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => {
                  setFilter('remaining');
                  setActiveTagFilter(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                  filter === 'remaining' && !activeTagFilter
                    ? isDark
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'bg-zinc-900 text-white font-semibold'
                    : isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Left ({totalTopics - completedCount})
              </button>
              <button
                onClick={() => {
                  setFilter('completed');
                  setActiveTagFilter(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                  filter === 'completed' && !activeTagFilter
                    ? isDark
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'bg-zinc-900 text-white font-semibold'
                    : isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Done ({completedCount})
              </button>
              <button
                onClick={() => {
                  setFilter('notes');
                  setActiveTagFilter(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                  filter === 'notes' && !activeTagFilter
                    ? isDark
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'bg-zinc-900 text-white font-semibold'
                    : isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Notes
              </button>
            </div>

            {/* Course Tags Filter Strip */}
            {availableTagsInCourse.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto text-[10px] pt-1 border-t border-zinc-800/40">
                <span className="text-zinc-500 font-bold uppercase tracking-wider shrink-0 text-[9px] mr-1">
                  Tags:
                </span>
                {availableTagsInCourse.map((tag) => {
                  const isSelected = activeTagFilter === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setActiveTagFilter(isSelected ? null : tag)}
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                          : isDark
                          ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
                {activeTagFilter && (
                  <button
                    onClick={() => setActiveTagFilter(null)}
                    className="text-[9px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer shrink-0 ml-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playlist Items List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 max-h-[calc(100vh-420px)] lg:max-h-[580px]">
        {filteredItems.length === 0 ? (
          <div
            className={`text-center py-10 px-4 text-xs space-y-3 ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            <Search className="w-8 h-8 mx-auto opacity-30" />
            <div>
              <p className={isDark ? 'font-semibold text-zinc-300' : 'font-semibold text-zinc-700'}>
                No matching topics found
              </p>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {searchQuery
                  ? `No lectures matched "${searchQuery}" in "${filter}" view.`
                  : 'No topics found in this view.'}
              </p>
            </div>

            {searchQuery && filter !== 'all' && totalMatchesAcrossAll > 0 && (
              <button
                onClick={() => setFilter('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer shadow-sm transition-colors"
              >
                <span>Show {totalMatchesAcrossAll} matches in All Topics</span>
              </button>
            )}

            {searchQuery && (
              <div>
                <button
                  onClick={() => setSearchQuery('')}
                  className={`text-xs underline transition-colors cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Clear search query
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isPlaying = item.videoId === activeVideoId;
            const isCompleted = completedSet.has(item.videoId);
            const hasNotes = Boolean(notesMap[item.videoId]?.trim());
            const sequenceNumber = itemIndexMap.get(item.videoId) ?? (item.position || 1);
            const watchProg = watchProgressMap[item.videoId];
            const watchPercent = isCompleted ? 100 : watchProg?.percent || 0;
            const itemTags = videoTagsMap[item.videoId] || [];

            if (isPlaying) {
              return (
                <div
                  key={item.id || item.videoId}
                  id={`lesson-item-${item.videoId}`}
                  onClick={() => onSelectVideo(item)}
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center gap-2.5 sm:gap-3 relative cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-indigo-500/10 border border-indigo-500/30 ring-1 ring-indigo-500/50'
                      : 'bg-indigo-50/90 border border-indigo-200 ring-1 ring-indigo-300 shadow-xs'
                  }`}
                >
                  {/* Sequence Number Column - Active Play Icon */}
                  <div className="w-5 sm:w-6 shrink-0 flex items-center justify-center text-xs font-mono select-none">
                    <Play
                      className={`w-3.5 h-3.5 fill-current ${
                        isDark ? 'text-indigo-400' : 'text-indigo-600'
                      }`}
                    />
                  </div>

                  <div className="w-24 h-14 bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden">
                    <Image
                      src={item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`}
                      alt={item.title}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-indigo-950/60 flex items-center justify-center text-indigo-300">
                      <Volume2 className="w-4 h-4 animate-bounce" />
                    </div>
                    {item.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] px-1 rounded font-mono text-zinc-200">
                        {formatDisplayDuration(item.duration)}
                      </div>
                    )}
                    {/* Watch Progress Sub-bar inside thumbnail */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-black/50">
                      <div
                        className={`h-full ${watchPercent >= 100 ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                        style={{ width: `${watchPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-1 overflow-hidden min-w-0 flex-1 py-0.5">
                    <span
                      className={`text-xs font-bold line-clamp-2 leading-snug break-words ${
                        isDark ? 'text-indigo-200' : 'text-indigo-950'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                      <span className="text-indigo-400 font-bold uppercase tracking-wider">Active Now</span>
                      <span className="text-zinc-500">•</span>
                      <span className="font-mono text-indigo-300 font-medium">
                        {watchPercent}% watched
                      </span>
                      {hasNotes && (
                        <>
                          <span className="text-zinc-500">•</span>
                          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded font-mono font-semibold">
                            Notes
                          </span>
                        </>
                      )}
                      {itemTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate max-w-[90px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            if (isCompleted) {
              return (
                <div
                  key={item.id || item.videoId}
                  id={`lesson-item-${item.videoId}`}
                  onClick={() => onSelectVideo(item)}
                  className={`p-2.5 sm:p-3 opacity-70 hover:opacity-100 rounded-xl flex items-center gap-2.5 sm:gap-3 border transition-opacity cursor-pointer group ${
                    isDark
                      ? 'border-zinc-800/20 bg-zinc-900/20'
                      : 'border-zinc-200/50 bg-zinc-50'
                  }`}
                >
                  {/* Sequence Number Column */}
                  <div className="w-5 sm:w-6 shrink-0 flex items-center justify-center text-xs font-mono select-none">
                    <span
                      className={`font-medium ${
                        isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'
                      }`}
                    >
                      {sequenceNumber}
                    </span>
                  </div>

                  <div
                    className={`w-24 h-14 rounded-lg shrink-0 flex items-center justify-center relative border overflow-hidden ${
                      isDark
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    <Image
                      src={item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`}
                      alt={item.title}
                      fill
                      className="object-cover opacity-60"
                      referrerPolicy="no-referrer"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    {item.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] px-1 rounded font-mono text-zinc-300">
                        {formatDisplayDuration(item.duration)}
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />
                  </div>

                  <div className="flex flex-col justify-center gap-1 overflow-hidden min-w-0 flex-1 py-0.5">
                    <span
                      className={`text-xs font-medium line-through line-clamp-2 leading-snug break-words ${
                        isDark
                          ? 'text-zinc-500 group-hover:text-zinc-400'
                          : 'text-zinc-400 group-hover:text-zinc-600'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                      <span className="text-emerald-500 font-bold uppercase tracking-wider">100% Completed</span>
                      {hasNotes && (
                        <>
                          <span className="text-zinc-500">•</span>
                          <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded font-mono">
                            Notes
                          </span>
                        </>
                      )}
                      {itemTags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 truncate max-w-[90px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id || item.videoId}
                id={`lesson-item-${item.videoId}`}
                onClick={() => onSelectVideo(item)}
                className={`p-2.5 sm:p-3 border border-transparent rounded-xl flex items-center gap-2.5 sm:gap-3 cursor-pointer group transition-colors ${
                  isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/80'
                }`}
              >
                {/* Sequence Number Column */}
                <div className="w-5 sm:w-6 shrink-0 flex items-center justify-center text-xs font-mono select-none">
                  <span
                    className={`font-medium ${
                      isDark
                        ? 'text-zinc-400 group-hover:text-zinc-200'
                        : 'text-zinc-500 group-hover:text-zinc-900'
                    }`}
                  >
                    {sequenceNumber}
                  </span>
                </div>

                <div
                  className={`w-24 h-14 rounded-lg shrink-0 flex items-center justify-center relative border overflow-hidden ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800'
                      : 'bg-zinc-100 border-zinc-200'
                  }`}
                >
                  <Image
                    src={item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 text-white">
                    <Play className="w-4 h-4 fill-white" />
                  </div>
                  {item.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] px-1 rounded font-mono text-zinc-300">
                      {formatDisplayDuration(item.duration)}
                    </div>
                  )}
                  {watchPercent > 0 && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${watchPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center gap-1 overflow-hidden min-w-0 flex-1 py-0.5">
                  <span
                    className={`text-xs font-bold line-clamp-2 leading-snug break-words ${
                      isDark
                        ? 'text-zinc-400 group-hover:text-zinc-200'
                        : 'text-zinc-700 group-hover:text-zinc-900'
                    }`}
                    title={item.title}
                  >
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                    {watchPercent > 0 ? (
                      <span className="font-mono font-medium text-indigo-400">
                        {watchPercent}% Watched
                        {watchProg?.currentTime ? ` (${formatTime(watchProg.currentTime)})` : ''}
                      </span>
                    ) : (
                      <span
                        className={`font-medium ${
                          isDark ? 'text-zinc-600' : 'text-zinc-400'
                        }`}
                      >
                        Not Started
                      </span>
                    )}
                    {hasNotes && (
                      <>
                        <span className="text-zinc-500">•</span>
                        <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded font-mono">
                          Notes
                        </span>
                      </>
                    )}
                    {itemTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium border truncate max-w-[90px] ${
                          isDark
                            ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Syncing Status Footer */}
      <div
        className={`p-5 sm:p-6 border-t mt-auto transition-colors ${
          isDark ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span
              className={`text-[10px] uppercase font-bold tracking-wider ${
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              }`}
            >
              Realtime Playback &amp; Checklist Synced
            </span>
          </div>
          <div
            className={`text-[10px] leading-tight ${
              isDark ? 'text-zinc-600' : 'text-zinc-500'
            }`}
          >
            Video timestamp &amp; completion automatically saved to local storage.
          </div>
        </div>
      </div>
    </aside>
  );
}
