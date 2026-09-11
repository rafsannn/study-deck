'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Copy,
  Check,
  FileEdit,
  Sparkles,
  Maximize2,
  Minimize2,
  Tv,
  X,
  SkipForward,
  SkipBack,
  Code2,
  Plus,
  Play,
  Pause,
  Volume1,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Keyboard,
  Flame,
  CheckSquare,
  Clock,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Layers,
  Tag,
} from 'lucide-react';
import { PlaylistItem, VideoWatchProgress } from '@/types/playlist';
import { parseDurationToSeconds } from '@/lib/utils';

export interface VideoChapter {
  id: string;
  title: string;
  time: number;
  timeFormatted: string;
  source: 'description' | 'notes' | 'custom';
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatDisplayDuration(duration?: string | number): string {
  if (!duration) return '';
  const secs = parseDurationToSeconds(duration);
  return secs > 0 ? formatTime(secs) : String(duration);
}

/**
 * Extracts chronological timestamps and chapter titles from YouTube video description or notes.
 */
function extractChaptersFromText(
  descriptionText?: string,
  notesText?: string
): VideoChapter[] {
  const combinedEntries: VideoChapter[] = [];
  const timestampRegex = /(?:^|\s)(?:\[|\()?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\]|\))?/g;

  const parseSource = (rawText: string, source: 'description' | 'notes') => {
    if (!rawText) return;
    const lines = rawText.split('\n');

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      timestampRegex.lastIndex = 0;
      const match = timestampRegex.exec(trimmed);
      if (!match) return;

      const fullMatch = match[0].trim();
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);

      if (isNaN(minutes) || isNaN(seconds) || seconds >= 60) return;

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      const timeFormatted = formatTime(totalSeconds);

      // Extract title by stripping the timestamp and leading punctuation/delimiters
      let title = trimmed.replace(fullMatch, '').trim();
      title = title
        .replace(/^[\s\-–—:•|>#~.)\]}]+/, '')
        .replace(/[\s\-–—:•|<[{(]+$/, '')
        .trim();

      if (!title) {
        title = `Chapter at ${timeFormatted}`;
      }

      combinedEntries.push({
        id: `${source}-${lineIdx}-${totalSeconds}`,
        title,
        time: totalSeconds,
        timeFormatted,
        source,
      });
    });
  };

  if (descriptionText) parseSource(descriptionText, 'description');
  if (notesText) parseSource(notesText, 'notes');

  // Deduplicate by timestamp and sort chronologically
  const uniqueMap = new Map<number, VideoChapter>();
  combinedEntries.forEach((ch) => {
    if (!uniqueMap.has(ch.time)) {
      uniqueMap.set(ch.time, ch);
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) => a.time - b.time);
}

interface VideoNotesEditorProps {
  videoId: string;
  initialNote: string;
  onSaveNote: (videoId: string, note: string) => void;
  onSeek?: (seconds: number) => void;
  currentPlaybackTime?: number;
  theme?: 'dark' | 'light';
}

function VideoNotesEditor({
  videoId,
  initialNote,
  onSaveNote,
  onSeek,
  currentPlaybackTime = 0,
  theme = 'dark',
}: VideoNotesEditorProps) {
  const [localNote, setLocalNote] = useState(initialNote);
  const [noteSaved, setNoteSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const isDark = theme === 'dark';

  // Parse all timestamps detected in the current note
  const noteTimestamps = useMemo(() => {
    return extractChaptersFromText(undefined, localNote);
  }, [localNote]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localNote !== initialNote) {
        onSaveNote(videoId, localNote);
        setNoteSaved(true);
        const hideTimer = setTimeout(() => setNoteSaved(false), 2000);
        return () => clearTimeout(hideTimer);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [localNote, videoId, initialNote, onSaveNote]);

  const handleInsertCurrentTimestamp = () => {
    const formatted = formatTime(Math.floor(currentPlaybackTime));
    const timestampTag = `[${formatted}] `;
    const updated = localNote ? `${localNote}\n${timestampTag}` : timestampTag;
    setLocalNote(updated);
    onSaveNote(videoId, updated);
  };

  return (
    <div
      className={`mt-3 pt-3 border-t space-y-3 ${
        isDark ? 'border-zinc-800/60' : 'border-zinc-200'
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-500" />
          <span
            className={`text-xs font-semibold ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            Topic Notes &amp; Code Takeaways
          </span>
          {noteSaved && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-500 animate-fade-in font-medium">
              <Sparkles className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        {/* Toolbar: Insert Timestamp & Preview Mode Toggle */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={handleInsertCurrentTimestamp}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-indigo-400 hover:text-indigo-300'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-indigo-600'
            }`}
            title="Insert current video timestamp at cursor"
          >
            <Plus className="w-3 h-3" />
            <span>+ Timestamp [{formatTime(Math.floor(currentPlaybackTime))}]</span>
          </button>

          <div
            className={`flex items-center p-0.5 rounded-lg border text-[11px] font-medium ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
            }`}
          >
            <button
              onClick={() => setActiveTab('write')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeTab === 'write'
                  ? isDark
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? isDark
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Interactive Preview
            </button>
          </div>
        </div>
      </div>

      {/* Quick Clickable Timestamps Strip (if any timestamps found) */}
      {noteTimestamps.length > 0 && onSeek && (
        <div
          className={`p-2 rounded-xl border flex items-center gap-1.5 overflow-x-auto scrollbar-thin ${
            isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            Timestamps:
          </span>
          <div className="flex items-center gap-1.5">
            {noteTimestamps.map((ts) => (
              <button
                key={ts.id}
                onClick={() => onSeek(ts.time)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border transition-colors cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-indigo-900/40 border-zinc-800 hover:border-indigo-500/50 text-indigo-300'
                    : 'bg-white hover:bg-indigo-50 border-zinc-300 hover:border-indigo-300 text-indigo-700'
                }`}
                title={`Seek video to ${ts.timeFormatted} (${ts.title})`}
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span className="font-bold">{ts.timeFormatted}</span>
                {ts.title && ts.title !== `Chapter at ${ts.timeFormatted}` && (
                  <span className="text-zinc-400 font-sans truncate max-w-[120px]">
                    {ts.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Write / Interactive View Panel */}
      {activeTab === 'write' ? (
        <textarea
          id="video-scratchpad"
          rows={3}
          value={localNote}
          onChange={(e) => setLocalNote(e.target.value)}
          placeholder="Jot down timecodes (e.g. 04:15, [12:30]), LeetCode question numbers, algorithm insights, or code formulas for this topic..."
          className={`w-full text-xs font-mono p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-y ${
            isDark
              ? 'bg-zinc-950/80 text-zinc-200 border-zinc-800 focus:border-indigo-500 placeholder:text-zinc-600'
              : 'bg-zinc-50 text-zinc-800 border-zinc-200 focus:border-indigo-500 placeholder:text-zinc-400'
          }`}
        />
      ) : (
        <div
          className={`p-3 rounded-xl border min-h-[80px] text-xs font-mono whitespace-pre-wrap ${
            isDark ? 'bg-zinc-950/80 border-zinc-800 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
          }`}
        >
          {localNote ? (
            localNote.split('\n').map((line, idx) => {
              // Highlight and make timestamps clickable
              const match = /(?:\[|\()?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\]|\))?/.exec(line);
              if (match && onSeek) {
                const fullMatch = match[0];
                const hours = match[1] ? parseInt(match[1], 10) : 0;
                const minutes = parseInt(match[2], 10);
                const seconds = parseInt(match[3], 10);
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                const parts = line.split(fullMatch);

                return (
                  <div key={idx} className="leading-relaxed">
                    <span>{parts[0]}</span>
                    <button
                      onClick={() => onSeek(totalSeconds)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 cursor-pointer font-bold mx-1"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      {fullMatch}
                    </button>
                    <span>{parts.slice(1).join(fullMatch)}</span>
                  </div>
                );
              }
              return (
                <div key={idx} className="leading-relaxed">
                  {line || <br />}
                </div>
              );
            })
          ) : (
            <span className="text-zinc-500 italic">No notes written yet. Switch to &quot;Write&quot; tab to add notes.</span>
          )}
        </div>
      )}
    </div>
  );
}

interface VideoPlayerProps {
  video: PlaylistItem | null;
  currentIndex: number;
  totalLessons: number;
  isCompleted: boolean;
  onToggleComplete: (videoId: string) => void;
  onCompleteAndNext: () => void;
  onPreviousLesson: () => void;
  onNextLesson: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  noteContent: string;
  onSaveNote: (videoId: string, note: string) => void;
  watchProgress?: VideoWatchProgress;
  onUpdateProgress?: (videoId: string, progress: VideoWatchProgress) => void;
  onStudyTimeLogged?: (secondsDelta: number, videoId: string) => void;
  videoTags?: string[];
  onToggleTag?: (videoId: string, tag: string) => void;
  onTriggerConfetti?: () => void;
  onOpenImportModal?: () => void;
  theme?: 'dark' | 'light';
  theaterMode?: boolean;
  onToggleTheaterMode?: () => void;
}

const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const PREDEFINED_TAGS = ['⭐ Important', '🔄 Review', '⚡ Hard', '✅ Easy', '💼 Interview Q', '📐 Formula'];

export function VideoPlayer({
  video,
  currentIndex,
  totalLessons,
  isCompleted,
  onToggleComplete,
  onCompleteAndNext,
  onPreviousLesson,
  onNextLesson,
  hasPrevious,
  hasNext,
  noteContent,
  onSaveNote,
  watchProgress,
  onUpdateProgress,
  onStudyTimeLogged,
  videoTags = [],
  onToggleTag,
  onTriggerConfetti,
  onOpenImportModal,
  theme = 'dark',
  theaterMode: propTheaterMode,
  onToggleTheaterMode,
}: VideoPlayerProps) {
  const [copied, setCopied] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [internalTheaterMode, setInternalTheaterMode] = useState(false);
  const theaterMode = propTheaterMode !== undefined ? propTheaterMode : internalTheaterMode;

  const handleToggleTheater = useCallback(() => {
    if (onToggleTheaterMode) {
      onToggleTheaterMode();
    } else {
      setInternalTheaterMode((prev) => !prev);
    }
  }, [onToggleTheaterMode]);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [totalVideoDuration, setTotalVideoDuration] = useState<number>(0);
  const [isPlayingLive, setIsPlayingLive] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rafsan_study_deck_playback_speed');
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val) && val > 0) return val;
        }
      } catch {
        // ignore
      }
    }
    return 1;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(100);
  const [isVolumeHovered, setIsVolumeHovered] = useState<boolean>(false);
  const [overlayFeedback, setOverlayFeedback] = useState<'play' | 'pause' | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [isChaptersExpanded, setIsChaptersExpanded] = useState(false);
  const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isCursorHidden, setIsCursorHidden] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFallbackMaximized, setIsFallbackMaximized] = useState<boolean>(false);
  const [isFsChaptersOpen, setIsFsChaptersOpen] = useState<boolean>(false);
  const [isFsControlsHovered, setIsFsControlsHovered] = useState<boolean>(false);
  const cursorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';
  const isPlayerMaximized = isFullscreen || isFallbackMaximized;
  const showFullscreenHud =
    isPlayerMaximized && (!isCursorHidden || isFsChaptersOpen || isFsControlsHovered);

  // Safe PostMessage dispatcher to the YouTube iframe
  const sendIframeCommand = useCallback(
    (func: string, args: unknown[] = []) => {
      try {
        if (!video?.videoId) return;
        const iframe = document.getElementById(
          `yt-player-${video.videoId}`
        ) as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'listening' }),
            '*'
          );
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func, args }),
            '*'
          );
        }
      } catch {
        // Safe catch
      }
    },
    [video]
  );

  const [prevVideoId, setPrevVideoId] = useState<string | null>(null);
  const [startSecondsMap, setStartSecondsMap] = useState<Record<string, number>>({});
  const initialSeekDoneRef = useRef<boolean>(false);

  // Active study duration accumulation refs
  const lastPlaybackSecondRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number>(0);
  const accumulatedWatchSecondsRef = useRef<number>(0);
  const currentVideoIdRef = useRef<string | null>(video?.videoId || null);

  useEffect(() => {
    // When video changes, flush previous accumulated watch time
    if (accumulatedWatchSecondsRef.current >= 1 && currentVideoIdRef.current && onStudyTimeLogged) {
      const flushSecs = Math.round(accumulatedWatchSecondsRef.current);
      accumulatedWatchSecondsRef.current = 0;
      onStudyTimeLogged(flushSecs, currentVideoIdRef.current);
    }
    currentVideoIdRef.current = video?.videoId || null;
    lastPlaybackSecondRef.current = null;
    lastWallTimeRef.current = Date.now();
  }, [video?.videoId, onStudyTimeLogged]);

  // Flush accumulated watch seconds on unmount
  useEffect(() => {
    const onFlush = onStudyTimeLogged;
    return () => {
      if (accumulatedWatchSecondsRef.current >= 1 && currentVideoIdRef.current && onFlush) {
        const flushSecs = Math.round(accumulatedWatchSecondsRef.current);
        accumulatedWatchSecondsRef.current = 0;
        onFlush(flushSecs, currentVideoIdRef.current);
      }
    };
  }, [onStudyTimeLogged]);

  // Continuous study duration logging while video is playing
  useEffect(() => {
    if (!isPlayingLive || !video?.videoId) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;

      accumulatedWatchSecondsRef.current += 1;
      if (accumulatedWatchSecondsRef.current >= 4 && onStudyTimeLogged && video?.videoId) {
        const flushSecs = Math.round(accumulatedWatchSecondsRef.current);
        accumulatedWatchSecondsRef.current = 0;
        onStudyTimeLogged(flushSecs, video.videoId);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (accumulatedWatchSecondsRef.current >= 1 && video?.videoId && onStudyTimeLogged) {
        const flushSecs = Math.round(accumulatedWatchSecondsRef.current);
        accumulatedWatchSecondsRef.current = 0;
        onStudyTimeLogged(flushSecs, video.videoId);
      }
    };
  }, [isPlayingLive, video?.videoId, onStudyTimeLogged]);

  // Synchronously reset UI state on video change and capture initial start time
  if (video?.videoId && video.videoId !== prevVideoId) {
    setPrevVideoId(video.videoId);
    const saved = Math.floor(watchProgress?.currentTime || 0);
    setStartSecondsMap((prev) => ({ ...prev, [video.videoId]: saved }));
    setIsPlayingLive(true);
    setCurrentPlaybackTime(saved);
    setTotalVideoDuration(
      video.duration ? parseDurationToSeconds(video.duration) : 0
    );
  }

  const handleSetPlaybackRate = useCallback(
    (rate: number) => {
      setPlaybackRate(rate);
      try {
        localStorage.setItem('rafsan_study_deck_playback_speed', String(rate));
      } catch {
        // ignore
      }
      sendIframeCommand('setPlaybackRate', [rate]);
    },
    [sendIframeCommand]
  );

  // Automatically start playback at saved timestamp once per video mount or speed change
  useEffect(() => {
    if (!video?.videoId) return;

    const targetStart = startSecondsMap[video.videoId] ?? 0;

    const startPlaybackAndSpeed = () => {
      sendIframeCommand('listening', []);
      sendIframeCommand('setPlaybackRate', [playbackRate]);
      if (targetStart > 2 && !initialSeekDoneRef.current) {
        sendIframeCommand('seekTo', [targetStart, true]);
      }
      sendIframeCommand('playVideo', []);
    };

    startPlaybackAndSpeed();
    const t1 = setTimeout(startPlaybackAndSpeed, 400);

    return () => {
      clearTimeout(t1);
    };
  }, [video?.videoId, playbackRate, sendIframeCommand, startSecondsMap]);

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      sendIframeCommand('unMute', []);
      setIsMuted(false);
      if (volume === 0) {
        setVolume(100);
        sendIframeCommand('setVolume', [100]);
      }
    } else {
      sendIframeCommand('mute', []);
      setIsMuted(true);
    }
  }, [isMuted, volume, sendIframeCommand]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      sendIframeCommand('setVolume', [newVolume]);
      if (newVolume === 0) {
        setIsMuted(true);
        sendIframeCommand('mute', []);
      } else if (isMuted) {
        setIsMuted(false);
        sendIframeCommand('unMute', []);
      }
    },
    [isMuted, sendIframeCommand]
  );

  const handleTogglePlayPause = useCallback(() => {
    if (isPlayingLive) {
      sendIframeCommand('pauseVideo', []);
      setIsPlayingLive(false);
    } else {
      sendIframeCommand('playVideo', []);
      setIsPlayingLive(true);
    }
  }, [isPlayingLive, sendIframeCommand]);

  const handleToggleFullscreen = useCallback(() => {
    if (!video?.videoId) return;
    const container =
      document.getElementById(`yt-player-container-${video.videoId}`) ||
      document.getElementById(`yt-player-${video.videoId}`);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFallbackMaximized(false);
    } else if (isFallbackMaximized) {
      setIsFallbackMaximized(false);
    } else if (container) {
      const promise = container.requestFullscreen();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          // Native fullscreen disallowed in sandboxed container, fallback to window-maximize
          setIsFallbackMaximized(true);
        });
      } else {
        setIsFallbackMaximized(true);
      }
    }
  }, [video, isFallbackMaximized]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        setIsFallbackMaximized(false);
        setIsCursorHidden(false);
        setIsFsChaptersOpen(false);
        setIsFsControlsHovered(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Lock body scroll when fallback maximized
  useEffect(() => {
    if (isFallbackMaximized) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isFallbackMaximized]);

  // Handle cursor idle timer when mouse is moved over video or when in fullscreen
  const handlePlayerMouseMove = useCallback(() => {
    setIsCursorHidden(false);
    if (cursorTimerRef.current) {
      clearTimeout(cursorTimerRef.current);
    }
    cursorTimerRef.current = setTimeout(() => {
      setIsCursorHidden(true);
    }, 2800);
  }, []);

  const handlePlayerMouseLeave = useCallback(() => {
    if (!isPlayerMaximized) {
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
      }
      setIsCursorHidden(false);
    }
  }, [isPlayerMaximized]);

  // Global mousemove in fullscreen to reveal cursor and reset inactivity timer
  useEffect(() => {
    if (!isPlayerMaximized) return;

    const handleGlobalMouseMove = () => {
      handlePlayerMouseMove();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isPlayerMaximized, handlePlayerMouseMove]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
      }
    };
  }, []);

  const handleOverlayClick = useCallback(() => {
    if (isFsChaptersOpen) {
      setIsFsChaptersOpen(false);
      return;
    }
    if (isPlayingLive) {
      sendIframeCommand('pauseVideo', []);
      setIsPlayingLive(false);
      setOverlayFeedback('pause');
    } else {
      sendIframeCommand('playVideo', []);
      setIsPlayingLive(true);
      setOverlayFeedback('play');
    }
    if (typeof window !== 'undefined') {
      window.focus();
    }
    setTimeout(() => {
      setOverlayFeedback(null);
    }, 600);
  }, [isPlayingLive, sendIframeCommand, isFsChaptersOpen]);

  const handleOverlayDoubleClick = useCallback(() => {
    handleToggleFullscreen();
    if (typeof window !== 'undefined') {
      window.focus();
    }
  }, [handleToggleFullscreen]);

  // Extract video chapters from description and notes
  const chapters = useMemo(() => {
    return extractChaptersFromText(video?.description, noteContent);
  }, [video?.description, noteContent]);

  // Active chapter tracking based on current playback time
  const activeChapterIndex = useMemo(() => {
    if (chapters.length === 0) return -1;
    const curr = currentPlaybackTime;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (curr >= chapters[i].time) {
        return i;
      }
    }
    return 0;
  }, [chapters, currentPlaybackTime]);

  const currentActiveChapter = activeChapterIndex >= 0 ? chapters[activeChapterIndex] : null;

  const handleAddCurrentTimestampBookmark = () => {
    if (!video?.videoId) return;
    const currentFormatted = formatTime(Math.floor(currentPlaybackTime));
    const newMarkerLine = `\n[${currentFormatted}] Chapter marker at ${currentFormatted}`;
    const updatedNote = noteContent ? `${noteContent}${newMarkerLine}` : newMarkerLine.trim();
    onSaveNote(video.videoId, updatedNote);
  };

  // Listen to safe postMessage info from YouTube iframe
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      try {
        let data: { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } } | null = null;
        if (typeof e.data === 'string') {
          if (
            !e.data.includes('infoDelivery') &&
            !e.data.includes('initialDelivery') &&
            !e.data.includes('onStateChange')
          ) {
            return;
          }
          data = JSON.parse(e.data);
        } else if (typeof e.data === 'object' && e.data !== null) {
          data = e.data as { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } };
        } else {
          return;
        }

        if (data && data.event === 'infoDelivery' && data.info) {
          const { currentTime, duration, playerState } = data.info;

          if (typeof currentTime === 'number') {
            // Guard against wiping saved progress during player initialization at 0s
            const targetStart = startSecondsMap[video?.videoId || ''] ?? 0;
            if (targetStart > 2 && !initialSeekDoneRef.current) {
              if (currentTime < 1) {
                // Player still booting at 0s, keep saved timestamp in store
                return;
              }
              initialSeekDoneRef.current = true;
            }

            setCurrentPlaybackTime(currentTime);
            const effDuration =
              typeof duration === 'number' && duration > 0
                ? duration
                : totalVideoDuration > 0
                ? totalVideoDuration
                : 0;

            if (typeof duration === 'number' && duration > 0) {
              setTotalVideoDuration(duration);
            }

            if (effDuration > 0 && video?.videoId && onUpdateProgress) {
              const percent = Math.min(
                100,
                Math.max(0, Math.round((currentTime / effDuration) * 100))
              );
              onUpdateProgress(video.videoId, {
                currentTime: Math.round(currentTime),
                duration: Math.round(effDuration),
                percent,
                lastWatchedAt: new Date().toISOString(),
              });
            }
          }

          if (playerState === 1) {
            setIsPlayingLive(true);
          } else if (playerState === 2 || playerState === 0) {
            setIsPlayingLive(false);
            if (accumulatedWatchSecondsRef.current >= 1 && video?.videoId && onStudyTimeLogged) {
              const flushSecs = Math.round(accumulatedWatchSecondsRef.current);
              accumulatedWatchSecondsRef.current = 0;
              onStudyTimeLogged(flushSecs, video.videoId);
            }
            if (playerState === 0 && !isCompleted && video?.videoId) {
              onToggleComplete(video.videoId);
            }
          }
        }
      } catch {
        // Ignore unparseable third-party messages
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [
    video,
    onUpdateProgress,
    onStudyTimeLogged,
    isCompleted,
    onToggleComplete,
    totalVideoDuration,
    startSecondsMap,
  ]);

  // Periodic ping to initialize postMessage stream once iframe loads
  useEffect(() => {
    if (!video?.videoId) return;
    const interval = setInterval(() => {
      try {
        const iframe = document.getElementById(
          `yt-player-${video.videoId}`
        ) as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'listening' }),
            '*'
          );
        }
      } catch {
        // Safe catch
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [video?.videoId]);

  // Action: Seek / Resume Playback
  const handleSeekToTime = useCallback(
    (seconds: number) => {
      setCurrentPlaybackTime(seconds);
      sendIframeCommand('seekTo', [seconds, true]);
      sendIframeCommand('playVideo', []);

      const effDuration = totalVideoDuration > 0 ? totalVideoDuration : watchProgress?.duration || 0;
      if (video?.videoId && onUpdateProgress && effDuration > 0) {
        const percent = Math.min(
          100,
          Math.max(0, Math.round((seconds / effDuration) * 100))
        );
        onUpdateProgress(video.videoId, {
          currentTime: Math.round(seconds),
          duration: Math.round(effDuration),
          percent,
          lastWatchedAt: new Date().toISOString(),
        });
      }
    },
    [video, sendIframeCommand, totalVideoDuration, watchProgress?.duration, onUpdateProgress]
  );

  // Chapter Navigation: Jump to Previous Chapter
  const handleJumpToPrevChapter = useCallback(() => {
    if (chapters.length === 0) return;
    const currentChapter = activeChapterIndex >= 0 ? chapters[activeChapterIndex] : null;
    if (currentChapter && currentPlaybackTime - currentChapter.time > 3) {
      handleSeekToTime(currentChapter.time);
    } else if (activeChapterIndex > 0) {
      handleSeekToTime(chapters[activeChapterIndex - 1].time);
    } else {
      handleSeekToTime(0);
    }
  }, [chapters, activeChapterIndex, currentPlaybackTime, handleSeekToTime]);

  // Chapter Navigation: Jump to Next Chapter
  const handleJumpToNextChapter = useCallback(() => {
    if (chapters.length === 0) return;
    if (activeChapterIndex < chapters.length - 1) {
      handleSeekToTime(chapters[activeChapterIndex + 1].time);
    }
  }, [chapters, activeChapterIndex, handleSeekToTime]);

  // Keyboard shortcut listener for player controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Fullscreen (F)
      if (key === 'f') {
        e.preventDefault();
        handleToggleFullscreen();
      }
      // Play / Pause (Space or K)
      else if (e.code === 'Space' || key === 'k') {
        e.preventDefault();
        handleTogglePlayPause();
      }
      // Jump to Previous Chapter (Alt + Left Arrow or Shift + P)
      else if ((e.altKey && e.key === 'ArrowLeft') || (e.shiftKey && key === 'p')) {
        e.preventDefault();
        handleJumpToPrevChapter();
      }
      // Jump to Next Chapter (Alt + Right Arrow or Shift + N)
      else if ((e.altKey && e.key === 'ArrowRight') || (e.shiftKey && key === 'n')) {
        e.preventDefault();
        handleJumpToNextChapter();
      }
      // Seek Backward 10s (J or Left Arrow)
      else if (key === 'j' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeekToTime(Math.max(0, currentPlaybackTime - 10));
      }
      // Seek Forward 10s (L or Right Arrow)
      else if (key === 'l' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeekToTime(currentPlaybackTime + 10);
      }
      // Mute / Unmute (M)
      else if (key === 'm') {
        e.preventDefault();
        handleToggleMute();
      }
      // Next Video (N)
      else if (key === 'n') {
        e.preventDefault();
        if (hasNext) onNextLesson();
      }
      // Previous Video (P)
      else if (key === 'p' && !e.altKey) {
        e.preventDefault();
        if (hasPrevious) onPreviousLesson();
      }
      // Toggle Mark Completed (D)
      else if (key === 'd') {
        e.preventDefault();
        if (video?.videoId) onToggleComplete(video.videoId);
      }
      // Toggle Theater Mode (T)
      else if (key === 't') {
        e.preventDefault();
        handleToggleTheater();
      }
      // Toggle Chapters (C)
      else if (key === 'c') {
        e.preventDefault();
        if (isPlayerMaximized) {
          setIsFsChaptersOpen((prev) => !prev);
        } else {
          setIsChaptersExpanded((prev) => !prev);
        }
      }
      // Escape key in fallback maximize
      else if (e.key === 'Escape' && isFallbackMaximized) {
        e.preventDefault();
        setIsFallbackMaximized(false);
        setIsFsChaptersOpen(false);
      }
      // Decrease Speed (< or [)
      else if (e.key === '<' || e.key === ',' || e.key === '[') {
        e.preventDefault();
        const currentIdx = SPEED_PRESETS.indexOf(playbackRate);
        if (currentIdx > 0) {
          handleSetPlaybackRate(SPEED_PRESETS[currentIdx - 1]);
        } else if (currentIdx === -1) {
          handleSetPlaybackRate(1);
        }
      }
      // Increase Speed (> or . or ])
      else if (e.key === '>' || e.key === '.' || e.key === ']') {
        e.preventDefault();
        const currentIdx = SPEED_PRESETS.indexOf(playbackRate);
        if (currentIdx !== -1 && currentIdx < SPEED_PRESETS.length - 1) {
          handleSetPlaybackRate(SPEED_PRESETS[currentIdx + 1]);
        } else if (currentIdx === -1) {
          handleSetPlaybackRate(1.25);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    hasNext,
    hasPrevious,
    video,
    onNextLesson,
    onPreviousLesson,
    onToggleComplete,
    playbackRate,
    handleSetPlaybackRate,
    handleToggleFullscreen,
    handleTogglePlayPause,
    handleToggleMute,
    handleSeekToTime,
    handleJumpToPrevChapter,
    handleJumpToNextChapter,
    currentPlaybackTime,
    isPlayerMaximized,
    isFallbackMaximized,
    handleToggleTheater,
  ]);

  const handleCopyLink = async () => {
    if (!video) return;
    try {
      const url = `https://www.youtube.com/watch?v=${video.videoId}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Safe catch
    }
  };

  // Automatically sync video duration to watchProgress store if missing
  useEffect(() => {
    if (!video?.videoId) return;
    const parsedDur = parseDurationToSeconds(video.duration);
    if (parsedDur > 0 && onUpdateProgress && (!watchProgress?.duration || watchProgress.duration === 0)) {
      onUpdateProgress(video.videoId, {
        currentTime: watchProgress?.currentTime || 0,
        duration: parsedDur,
        percent: watchProgress?.percent || 0,
        lastWatchedAt: watchProgress?.lastWatchedAt || new Date().toISOString(),
      });
    }
  }, [video?.videoId, video?.duration, watchProgress?.duration, watchProgress?.currentTime, watchProgress?.percent, watchProgress?.lastWatchedAt, onUpdateProgress]);

  // Compute display time and progress
  const parsedItemDuration = useMemo(() => {
    if (!video?.duration) return 0;
    return parseDurationToSeconds(video.duration);
  }, [video]);

  const displayCurrentTime =
    currentPlaybackTime > 0 ? currentPlaybackTime : watchProgress?.currentTime || 0;
  const displayDuration =
    totalVideoDuration > 0
      ? totalVideoDuration
      : watchProgress?.duration && watchProgress.duration > 0
      ? watchProgress.duration
      : parsedItemDuration;
  const currentPercent =
    displayDuration > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((displayCurrentTime / displayDuration) * 100))
        )
      : watchProgress?.percent || 0;

  if (!video) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 sm:p-14 rounded-2xl border text-center min-h-[500px] transition-colors ${
          isDark
            ? 'bg-[#0c0c0e] border-zinc-800'
            : 'bg-white border-zinc-200 shadow-sm'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mb-5 shadow-lg shadow-indigo-500/5">
          <Tv className="w-8 h-8" />
        </div>

        <h3
          className={`text-xl sm:text-2xl font-bold tracking-tight ${
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          }`}
        >
          No Playlist Loaded Yet
        </h3>

        <p
          className={`text-xs sm:text-sm max-w-md mt-2 leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          Paste any public or unlisted YouTube playlist link to start your focused coding track with instant progress tracking and study notes.
        </p>

        {onOpenImportModal && (
          <button
            onClick={onOpenImportModal}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Import Your First Playlist</span>
          </button>
        )}

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mt-10 text-left">
          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
              <Play className="w-3.5 h-3.5" />
              <span>Exact Watch Tracking</span>
            </div>
            <p className={`text-[11px] leading-snug ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Real-time playback percentage, timestamp resumption, and time tracking.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Checklist &amp; Stats</span>
            </div>
            <p className={`text-[11px] leading-snug ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Real-time progress bars, completion checkmarks, and confetti celebrations.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5" />
              <span>Streaks &amp; Notes</span>
            </div>
            <p className={`text-[11px] leading-snug ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Keep your daily coding streak alive and store lecture formulas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const startSec = video?.videoId ? (startSecondsMap[video.videoId] ?? 0) : 0;
  const startParam = startSec > 2 ? `&start=${startSec}` : '';
  const originParam = typeof window !== 'undefined' && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  const embedUrl = `https://www.youtube.com/embed/${video.videoId}?enablejsapi=1&autoplay=1&controls=0&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0${originParam}${startParam}`;

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3">
      {/* Embedded YouTube Player Container */}
      <div
        id={`yt-player-container-${video.videoId}`}
        onMouseMove={handlePlayerMouseMove}
        onMouseLeave={handlePlayerMouseLeave}
        className={`relative w-full overflow-hidden shadow-2xl transition-all duration-300 group ${
          isPlayerMaximized
            ? 'fixed inset-0 z-50 w-screen h-screen max-w-none max-h-none rounded-none border-0 bg-black flex items-center justify-center'
            : `${
                isDark
                  ? 'shadow-indigo-500/10 border border-zinc-800 bg-black'
                  : 'shadow-zinc-300/40 border border-zinc-200 bg-black'
              } rounded-2xl aspect-video ${
                theaterMode
                  ? 'w-full max-h-[calc(100vh-230px)] max-w-[calc((100vh-230px)*16/9)] mx-auto ring-1 ring-indigo-500/30 shadow-indigo-950/40'
                  : 'w-full max-h-[calc(100vh-250px)] max-w-[calc((100vh-250px)*16/9)] mx-auto'
              }`
        } ${
          isCursorHidden && isPlayerMaximized && !isFsChaptersOpen && !isFsControlsHovered
            ? 'cursor-none select-none'
            : ''
        }`}
      >
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <iframe
            id={`yt-player-${video.videoId}`}
            key={video.videoId}
            src={embedUrl}
            title={video.title}
            onLoad={() => {
              sendIframeCommand('listening', []);
              sendIframeCommand('setPlaybackRate', [playbackRate]);
              if (startSec > 2) {
                sendIframeCommand('seekTo', [startSec, true]);
              }
              sendIframeCommand('playVideo', []);
              setIsPlayingLive(true);
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0 block pointer-events-none"
          />

          {/* Click Overlay to prevent YouTube focus hijacking and enable native app hotkeys */}
          <div
            onClick={handleOverlayClick}
            onDoubleClick={handleOverlayDoubleClick}
            className={`absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors ${
              isCursorHidden && isPlayerMaximized && !isFsChaptersOpen && !isFsControlsHovered
                ? 'cursor-none'
                : 'cursor-pointer'
            }`}
          >
            {/* Animated Play/Pause Feedback Badge */}
            {overlayFeedback && (
              <div className="p-4 rounded-full bg-black/70 backdrop-blur-md text-white shadow-2xl border border-white/20 animate-pulse pointer-events-none">
                {overlayFeedback === 'play' ? (
                  <Play className="w-10 h-10 fill-white" />
                ) : (
                  <Pause className="w-10 h-10 fill-white" />
                )}
              </div>
            )}
          </div>

          {/* Fullscreen Overlay HUD Controls */}
          {isPlayerMaximized && (
            <>
              {/* Fullscreen Top HUD Bar: Title, Active Chapter, Chapters toggle, Exit Fullscreen */}
              <div
                onMouseEnter={() => setIsFsControlsHovered(true)}
                onMouseLeave={() => setIsFsControlsHovered(false)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className={`absolute top-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between gap-4 transition-all duration-300 ${
                  showFullscreenHud
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <h2 className="text-white font-semibold text-sm sm:text-base truncate max-w-md sm:max-w-xl drop-shadow-md">
                      {video.title}
                    </h2>
                    {currentActiveChapter && (
                      <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                        <span className="font-mono text-[11px] text-indigo-200 shrink-0">
                          {currentActiveChapter.timeFormatted}
                        </span>
                        <span className="text-zinc-500 shrink-0">•</span>
                        <span className="truncate max-w-xs sm:max-w-md text-zinc-300">
                          {currentActiveChapter.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fullscreen Chapter Drawer / Overlay */}
              {isFsChaptersOpen && chapters.length > 0 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setIsFsControlsHovered(true)}
                  onMouseLeave={() => setIsFsControlsHovered(false)}
                  className="absolute top-20 right-4 sm:right-6 bottom-28 z-40 w-80 sm:w-96 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-200"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Video Chapters</span>
                      <span className="text-zinc-500 text-xs font-mono">({chapters.length})</span>
                    </div>
                    <button
                      onClick={() => setIsFsChaptersOpen(false)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Close chapters list"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {chapters.map((chap, idx) => {
                      const isActive = activeChapterIndex === idx;
                      const nextChap = chapters[idx + 1];
                      const segDuration = nextChap ? nextChap.time - chap.time : null;
                      return (
                        <button
                          key={chap.id}
                          onClick={() => {
                            handleSeekToTime(chap.time);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                              : 'bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-zinc-800/50'
                          }`}
                        >
                          <span
                            className={`font-mono text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                              isActive ? 'bg-black/30 text-white' : 'bg-zinc-800 text-indigo-300'
                            }`}
                          >
                            {chap.timeFormatted}
                          </span>
                          <span className="truncate flex-1">{chap.title}</span>
                          {segDuration && (
                            <span
                              className={`text-[10px] font-mono shrink-0 ${
                                isActive ? 'text-indigo-200' : 'text-zinc-500'
                              }`}
                            >
                              {formatTime(segDuration)}
                            </span>
                          )}
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fullscreen Bottom HUD: Scrubber, Play, Seek, Speed Presets, Chapters, Volume, Exit */}
              <div
                onMouseEnter={() => setIsFsControlsHovered(true)}
                onMouseLeave={() => setIsFsControlsHovered(false)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className={`absolute bottom-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-3 transition-all duration-300 ${
                  showFullscreenHud
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                {/* Timeline Range Scrubber */}
                <div className="space-y-1.5">
                  <div className="relative flex items-center group">
                    <input
                      type="range"
                      min={0}
                      max={displayDuration || 100}
                      value={displayCurrentTime}
                      onChange={(e) => handleSeekToTime(Number(e.target.value))}
                      className="w-full h-2 rounded-lg bg-zinc-700/80 accent-indigo-500 hover:accent-indigo-400 cursor-pointer transition-all"
                      title="Scrub video timeline"
                    />
                    {/* Chapter marker ticks on scrubber bar */}
                    {chapters.length > 0 && displayDuration > 0 && (
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 pointer-events-none px-1">
                        {chapters.map((chap) => {
                          const leftPct = Math.min(
                            100,
                            Math.max(0, (chap.time / displayDuration) * 100)
                          );
                          return (
                            <div
                              key={`tick-${chap.id}`}
                              className="absolute top-0 bottom-0 w-0.5 bg-white/40 rounded-full"
                              style={{ left: `${leftPct}%` }}
                              title={`${chap.timeFormatted} - ${chap.title}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-zinc-300 px-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">{formatTime(displayCurrentTime)}</span>
                      <span>/</span>
                      <span>{displayDuration > 0 ? formatTime(displayDuration) : '--:--'}</span>
                    </div>

                    {currentActiveChapter && (
                      <button
                        onClick={() => setIsFsChaptersOpen(!isFsChaptersOpen)}
                        className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white transition-colors max-w-xs sm:max-w-md truncate cursor-pointer"
                        title="Click to view all chapters"
                      >
                        <Bookmark className="w-3 h-3 text-indigo-400" />
                        <span className="truncate">{currentActiveChapter.title}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center justify-between flex-wrap gap-2.5">
                  {/* Left Controls: Play, Seek -10/+10, Chapters skip, Prev/Next lesson, Volume */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePlayPause}
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-600/40 cursor-pointer"
                      title={isPlayingLive ? 'Pause (Space or K)' : 'Play (Space or K)'}
                    >
                      {isPlayingLive ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white" />
                      )}
                    </button>

                    <button
                      onClick={() => handleSeekToTime(Math.max(0, currentPlaybackTime - 10))}
                      className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/70 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                      title="Seek -10s (J or Left Arrow)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleSeekToTime(currentPlaybackTime + 10)}
                      className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/70 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                      title="Seek +10s (L or Right Arrow)"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Lesson previous/next buttons */}
                    {hasPrevious && onPreviousLesson && (
                      <button
                        onClick={onPreviousLesson}
                        className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/70 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                        title="Previous Lesson (P)"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                    )}
                    {hasNext && onNextLesson && (
                      <button
                        onClick={onNextLesson}
                        className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/70 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                        title="Next Lesson (N)"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    )}

                    {/* Volume Hover Control */}
                    <div
                      className="relative flex items-center"
                      onMouseEnter={() => setIsVolumeHovered(true)}
                      onMouseLeave={() => setIsVolumeHovered(false)}
                    >
                      <button
                        onClick={handleToggleMute}
                        className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/70 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : volume < 50 ? (
                          <Volume1 className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>

                      <div
                        className={`overflow-hidden transition-all duration-200 ease-out flex items-center ${
                          isVolumeHovered
                            ? 'w-24 max-w-[100px] opacity-100 ml-2'
                            : 'w-0 max-w-0 opacity-0 pointer-events-none'
                        }`}
                      >
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="w-20 h-1.5 rounded-lg bg-zinc-700/80 accent-indigo-500 hover:accent-indigo-400 cursor-pointer transition-all"
                          title={`Volume: ${isMuted ? 0 : volume}%`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Controls: Speed Selector, Chapter Drawer Toggle, Exit Fullscreen */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Speed Presets */}
                    <div className="flex items-center gap-1 font-mono bg-zinc-900/80 p-1 rounded-xl border border-zinc-700/70 backdrop-blur-md">
                      <span className="text-[10px] text-zinc-400 uppercase font-sans font-semibold px-1.5 hidden md:inline">
                        Speed
                      </span>
                      {SPEED_PRESETS.map((preset) => {
                        const isCurrent = playbackRate === preset;
                        return (
                          <button
                            key={`fs-${preset}`}
                            onClick={() => handleSetPlaybackRate(preset)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                            }`}
                            title={`Set speed ${preset}x ([ or ])`}
                          >
                            {preset}x
                          </button>
                        );
                      })}
                    </div>

                    {/* Chapters Toggle Button */}
                    {chapters.length > 0 && (
                      <button
                        onClick={() => setIsFsChaptersOpen(!isFsChaptersOpen)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer backdrop-blur-md ${
                          isFsChaptersOpen
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/40'
                            : 'bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-700/70 text-zinc-200 hover:text-white'
                        }`}
                        title="Video Chapters & Timelines (C)"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Chapters</span>
                        <span className="font-mono text-[11px] text-zinc-400">
                          ({chapters.length})
                        </span>
                      </button>
                    )}

                    {/* Exit Fullscreen */}
                    <button
                      onClick={handleToggleFullscreen}
                      className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/70 text-zinc-200 hover:text-white transition-colors cursor-pointer backdrop-blur-md"
                      title="Exit Fullscreen (Esc or F)"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Custom Player Control Console */}
      <div
        id="player-control-console"
        className={`w-full ${
          theaterMode
            ? 'max-w-[calc((100vh-230px)*16/9)]'
            : 'max-w-[calc((100vh-250px)*16/9)]'
        } mx-auto p-3 sm:p-4 rounded-2xl border shadow-xl transition-all duration-200 ${
          isDark
            ? 'bg-[#121217] border-zinc-800/90 shadow-black/60 text-zinc-100'
            : 'bg-white border-zinc-200/90 shadow-md text-zinc-900'
        }`}
      >
        {/* Timeline Scrubber & Timestamp Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-bold text-sm tracking-tight">{formatTime(displayCurrentTime)}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{displayDuration > 0 ? formatTime(displayDuration) : '--:--'}</span>
            </div>

            {chapters.length > 0 && currentActiveChapter && (
              <div
                onClick={() => setIsChapterMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-sans font-medium border cursor-pointer max-w-[280px] sm:max-w-[380px] truncate transition-colors ${
                  isDark
                    ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/40'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                }`}
                title="Click to view chapter list"
              >
                <Bookmark className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="font-mono text-[10px] text-indigo-400 font-semibold shrink-0">
                  Ch {activeChapterIndex >= 0 ? activeChapterIndex + 1 : 1}/{chapters.length}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="truncate text-[11px]">{currentActiveChapter.title}</span>
              </div>
            )}
          </div>

          {/* Clean Smooth Scrubber Slider */}
          <div className="relative flex items-center group py-0.5">
            <input
              type="range"
              min={0}
              max={displayDuration || 100}
              value={displayCurrentTime}
              onChange={(e) => handleSeekToTime(Number(e.target.value))}
              className="w-full h-1.5 hover:h-2 rounded-lg bg-zinc-800 accent-indigo-500 hover:accent-indigo-400 cursor-pointer transition-all z-10"
              title="Click or drag to scrub timeline"
            />
          </div>
        </div>

        {/* Control Buttons Bar: Balanced Left, Center, and Right */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-zinc-800/40 flex-wrap sm:flex-nowrap">
          {/* Left: Play/Pause, Seek -10s/+10s, Volume */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleTogglePlayPause}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-600/30 cursor-pointer hover:scale-105 active:scale-95"
              title={isPlayingLive ? 'Pause (Space or K)' : 'Play (Space or K)'}
            >
              {isPlayingLive ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={() => handleSeekToTime(Math.max(0, currentPlaybackTime - 10))}
              className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                  : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
              }`}
              title="Seek -10s (J or Left Arrow)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleSeekToTime(currentPlaybackTime + 10)}
              className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                  : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
              }`}
              title="Seek +10s (L or Right Arrow)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Volume Control with Hover Slider */}
            <div
              className="relative flex items-center ml-0.5"
              onMouseEnter={() => setIsVolumeHovered(true)}
              onMouseLeave={() => setIsVolumeHovered(false)}
            >
              <button
                onClick={handleToggleMute}
                className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
                }`}
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : volume < 50 ? (
                  <Volume1 className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              <div
                className={`overflow-hidden transition-all duration-200 ease-out flex items-center ${
                  isVolumeHovered
                    ? 'w-20 sm:w-24 opacity-100 ml-2'
                    : 'w-0 opacity-0 pointer-events-none'
                }`}
              >
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-18 sm:w-20 h-1.5 rounded-lg bg-zinc-700/60 accent-indigo-500 hover:accent-indigo-400 cursor-pointer transition-all"
                  title={`Volume: ${isMuted ? 0 : volume}%`}
                />
              </div>
            </div>
          </div>

          {/* Center: Chapter Quick Selector Pill & Jump Controls */}
          {chapters.length > 0 ? (
            <div className="relative flex items-center justify-center gap-1.5 min-w-0 mx-auto">
              <button
                onClick={handleJumpToPrevChapter}
                disabled={activeChapterIndex <= 0 && currentPlaybackTime < 3}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
                }`}
                title="Previous Chapter (Alt+← or Shift+P)"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              {/* Interactive Chapter Menu Trigger Pill */}
              <button
                onClick={() => setIsChapterMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all max-w-[200px] sm:max-w-[320px] truncate cursor-pointer ${
                  isChapterMenuOpen
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs font-semibold'
                    : isDark
                    ? 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800'
                }`}
                title="Click to choose a chapter"
              >
                <Bookmark className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">
                  {currentActiveChapter ? currentActiveChapter.title : 'Chapters'}
                </span>
                <ChevronDown className={`w-3 h-3 shrink-0 text-zinc-400 transition-transform ${isChapterMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <button
                onClick={handleJumpToNextChapter}
                disabled={activeChapterIndex >= chapters.length - 1}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
                }`}
                title="Next Chapter (Alt+→ or Shift+N)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              {/* Popover Chapter List */}
              {isChapterMenuOpen && (
                <div
                  className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 max-h-72 overflow-y-auto rounded-xl border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    isDark
                      ? 'bg-zinc-900/95 border-zinc-700 text-zinc-200 backdrop-blur-md'
                      : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-xl backdrop-blur-md'
                  }`}
                >
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800/60 mb-1">
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                      Chapters ({chapters.length})
                    </span>
                    <button
                      onClick={() => setIsChapterMenuOpen(false)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {chapters.map((chapter, idx) => {
                      const isActive = activeChapterIndex === idx;
                      return (
                        <button
                          key={chapter.id}
                          onClick={() => {
                            handleSeekToTime(chapter.time);
                            setIsChapterMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isActive
                              ? 'bg-indigo-600 text-white font-semibold'
                              : isDark
                              ? 'hover:bg-zinc-800/80 text-zinc-300'
                              : 'hover:bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          <span className="truncate flex-1">{chapter.title}</span>
                          <span className="font-mono text-[11px] opacity-75 shrink-0">{chapter.timeFormatted}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:block flex-1" />
          )}

          {/* Right: Playback Speed Dropdown, Theater, Fullscreen */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Playback Speed Popover */}
            <div className="relative">
              <button
                onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  isSpeedMenuOpen
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                    : isDark
                    ? 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
                }`}
                title="Playback Speed"
              >
                <span>{playbackRate}x</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isSpeedMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSpeedMenuOpen && (
                <div
                  className={`absolute bottom-full mb-2 right-0 w-28 rounded-xl border shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    isDark
                      ? 'bg-zinc-900/95 border-zinc-700 backdrop-blur-md'
                      : 'bg-white/95 border-zinc-200 shadow-xl backdrop-blur-md'
                  }`}
                >
                  <div className="space-y-0.5">
                    {SPEED_PRESETS.map((preset) => {
                      const isCurrent = playbackRate === preset;
                      return (
                        <button
                          key={preset}
                          onClick={() => {
                            handleSetPlaybackRate(preset);
                            setIsSpeedMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : isDark
                              ? 'hover:bg-zinc-800 text-zinc-300'
                              : 'hover:bg-zinc-100 text-zinc-800'
                          }`}
                        >
                          <span>{preset}x</span>
                          {isCurrent && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleToggleTheater}
              className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                theaterMode
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                  : isDark
                  ? 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950'
              }`}
              title={theaterMode ? 'Exit Theater Mode (T)' : 'Theater Mode (T)'}
            >
              <Tv className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggleFullscreen}
              className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                  : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
              }`}
              title="Toggle Fullscreen (F)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Chapters & Timelines Jump Section */}
      {chapters.length > 0 && (
        <div
          id="video-chapters-timeline"
          className={`w-full ${
            theaterMode
              ? 'max-w-[calc((100vh-230px)*16/9)]'
              : 'max-w-[calc((100vh-250px)*16/9)]'
          } mx-auto p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-3 transition-colors ${
            isDark
              ? 'bg-[#0c0c0e] border-zinc-800/90 shadow-xl'
              : 'bg-white border-zinc-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                <Bookmark className="w-4 h-4" />
                <span>Video Chapters &amp; Timelines</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                }`}
              >
                {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
              </span>

              {currentActiveChapter && (
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border max-w-full overflow-hidden ${
                    isDark
                      ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                  <span className="font-mono font-bold text-[11px] shrink-0">
                    {currentActiveChapter.timeFormatted}
                  </span>
                  <span className="text-zinc-500 shrink-0">•</span>
                  <span className="max-w-[180px] sm:max-w-[260px] truncate text-[11px]">
                    {currentActiveChapter.title}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleAddCurrentTimestampBookmark}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-zinc-200'
                }`}
                title="Bookmark current player timestamp into your notes"
              >
                <Plus className="w-3 h-3 text-indigo-400" />
                <span>Add Marker ({formatTime(Math.floor(displayCurrentTime))})</span>
              </button>

              <button
                onClick={() => setIsChaptersExpanded(!isChaptersExpanded)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-zinc-200'
                }`}
              >
                {isChaptersExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Compact</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>View All ({chapters.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Chapter Timeline Buttons */}
          <div
            className={
              isChaptersExpanded
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1'
                : 'flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin pt-0.5'
            }
          >
            {chapters.map((chapter, idx) => {
              const isActive = activeChapterIndex === idx;
              const nextChapter = chapters[idx + 1];
              const segmentDuration =
                nextChapter ? nextChapter.time - chapter.time : null;

              return (
                <button
                  key={chapter.id}
                  id={`chapter-jump-${chapter.id}`}
                  onClick={() => handleSeekToTime(chapter.time)}
                  className={`group inline-flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs border transition-all cursor-pointer select-none text-left shrink-0 ${
                    isChaptersExpanded ? 'w-full' : 'max-w-[280px]'
                  } ${
                    isActive
                      ? isDark
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                        : 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-300'
                      : isDark
                      ? 'bg-zinc-900/90 hover:bg-zinc-800/90 border-zinc-800 text-zinc-300 hover:text-white'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900 shadow-xs'
                  }`}
                  title={`Jump to ${chapter.timeFormatted} • ${chapter.title}${
                    segmentDuration ? ` (${formatTime(segmentDuration)})` : ''
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 transition-colors ${
                      isActive
                        ? 'bg-black/30 text-white'
                        : isDark
                        ? 'bg-zinc-800 text-indigo-300 group-hover:bg-zinc-700'
                        : 'bg-zinc-200 text-indigo-700 group-hover:bg-zinc-300'
                    }`}
                  >
                    {chapter.timeFormatted}
                  </span>

                  <span
                    className={`font-medium truncate flex-1 ${
                      isActive
                        ? 'text-white font-semibold'
                        : isDark
                        ? 'text-zinc-300 group-hover:text-zinc-100'
                        : 'text-zinc-800 group-hover:text-zinc-950'
                    }`}
                  >
                    {chapter.title}
                  </span>

                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Header & Primary Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`font-mono text-[11px] px-2 py-0.5 rounded border font-medium ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              Topic {currentIndex + 1} of {totalLessons}
            </span>
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Completed (100%)
              </span>
            ) : currentPercent > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
                <Circle className="w-3 h-3" /> In Progress ({currentPercent}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 font-medium">
                <Circle className="w-3 h-3" /> Not Started
              </span>
            )}
          </div>
          <h2
            className={`text-xl font-semibold tracking-tight leading-snug break-words ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            {video.title}
          </h2>
          <p className="text-sm text-zinc-500">
            {video.channelTitle ? `${video.channelTitle}` : 'Course Lecture'}
            {video.duration && ` • ${formatDisplayDuration(video.duration)}`}
          </p>

          {/* Topic Tags & Difficulty Labels Management Row */}
          {onToggleTag && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3 text-indigo-400" />
                Tags:
              </span>

              {/* Active Tags */}
              {videoTags && videoTags.length > 0 ? (
                videoTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(video.videoId, tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 hover:bg-rose-500/20 text-indigo-300 hover:text-rose-300 border border-indigo-500/30 hover:border-rose-500/30 transition-colors cursor-pointer group"
                    title={`Click to remove tag "${tag}"`}
                  >
                    <span>{tag}</span>
                    <span className="text-indigo-400 group-hover:text-rose-300 text-[10px]">✕</span>
                  </button>
                ))
              ) : null}

              {/* Quick Preset Tag Buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                {PREDEFINED_TAGS.filter((t) => !(videoTags || []).includes(t)).slice(0, 3).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(video.videoId, tag)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-zinc-200'
                    }`}
                    title={`Add "${tag}" tag`}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{tag}</span>
                  </button>
                ))}

                {/* Toggle input for custom tag */}
                {showTagInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          onToggleTag(video.videoId, newTagInput.trim());
                          setNewTagInput('');
                          setShowTagInput(false);
                        } else if (e.key === 'Escape') {
                          setShowTagInput(false);
                        }
                      }}
                      placeholder="Tag name..."
                      className={`text-xs px-2 py-0.5 rounded-lg border font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (newTagInput.trim()) {
                          onToggleTag(video.videoId, newTagInput.trim());
                          setNewTagInput('');
                        }
                        setShowTagInput(false);
                      }}
                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 border-zinc-800'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 border-zinc-200'
                    }`}
                    title="Add custom tag or label"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Custom Tag</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
          <button
            id="prev-lesson-btn"
            onClick={onPreviousLesson}
            disabled={!hasPrevious}
            className={`h-11 px-4 sm:px-5 inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 select-none whitespace-nowrap ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 disabled:hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-100 disabled:hover:bg-white text-zinc-700 border-zinc-200 shadow-sm'
            }`}
            title="Previous Lesson [P]"
          >
            Previous
          </button>

          <button
            id="next-lesson-btn"
            onClick={onNextLesson}
            disabled={!hasNext}
            className={`h-11 px-4 sm:px-5 inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 select-none whitespace-nowrap ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 disabled:hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-100 disabled:hover:bg-white text-zinc-700 border-zinc-200 shadow-sm'
            }`}
            title="Next Lesson [N]"
          >
            Next
          </button>

          <button
            id="complete-and-next-btn"
            onClick={onCompleteAndNext}
            className="h-11 px-5 sm:px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer select-none whitespace-nowrap"
          >
            <span>Complete &amp; Next</span>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Secondary Controls & Scratchpad */}
      <div
        className={`border rounded-2xl p-4 sm:p-5 space-y-3 transition-colors ${
          isDark
            ? 'bg-[#0c0c0e] border-zinc-800 shadow-2xl'
            : 'bg-white border-zinc-200 shadow-sm'
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-3 text-xs border-b pb-3 ${
            isDark ? 'border-zinc-800/80' : 'border-zinc-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleComplete(video.videoId)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isCompleted
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold'
              }`}
            >
              {isCompleted ? (
                <Circle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span>{isCompleted ? 'Mark Incomplete' : 'Mark Completed'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-zinc-200'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <a
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-zinc-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleTheater}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                theaterMode
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                  : isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
              title="Toggle Theater Mode (T)"
            >
              {theaterMode ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>{theaterMode ? 'Standard View' : 'Theater Mode'}</span>
            </button>

            <button
              onClick={() => setShowNotes(!showNotes)}
              className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-600 font-medium cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>{showNotes ? 'Hide Scratchpad' : 'Open Scratchpad'}</span>
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Strip */}
        <div
          className={`flex items-center justify-between text-[11px] ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span>Shortcuts:</span>
            <span
              className={`font-mono border px-1.5 py-0.5 rounded ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              [T] Theater
            </span>
            <span
              className={`font-mono border px-1.5 py-0.5 rounded ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              [F] Fullscreen
            </span>
            <span
              className={`font-mono border px-1.5 py-0.5 rounded ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              [I] Mini-Player
            </span>
            <span
              className={`font-mono border px-1.5 py-0.5 rounded ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              [P] Prev
            </span>
            <span
              className={`font-mono border px-1.5 py-0.5 rounded ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              [N] Next
            </span>
            <span
              className={`font-mono border px-1.5 py-0.5 rounded ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              [D] Complete
            </span>
          </div>
        </div>

        {/* Code & Key Takeaways Scratchpad */}
        {showNotes && (
          <VideoNotesEditor
            key={video.videoId}
            videoId={video.videoId}
            initialNote={noteContent || ''}
            onSaveNote={onSaveNote}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
