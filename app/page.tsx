'use client';

import React, { useState, useCallback, useMemo, useSyncExternalStore, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { VideoPlayer } from '@/components/VideoPlayer';
import { PlaylistSidebar } from '@/components/PlaylistSidebar';
import { PlaylistModal } from '@/components/PlaylistModal';
import { StatsModal } from '@/components/StatsModal';
import { DashboardView } from '@/components/DashboardView';
import { TargetEstimatorModal } from '@/components/TargetEstimatorModal';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import { PlaylistCourse, PlaylistItem, StudyGoal, UserStudyData, VideoWatchProgress } from '@/types/playlist';
import { parseDurationToSeconds } from '@/lib/utils';

const STORAGE_KEY = 'rafsan_study_deck_data_v2';
const THEME_STORAGE_KEY = 'rafsan_study_deck_theme';

const DEFAULT_INITIAL_STUDY_DATA: UserStudyData = {
  activePlaylistId: '',
  activeVideoId: '',
  completedVideos: {},
  videoNotes: {},
  videoProgress: {},
  videoTags: {},
  streak: {
    count: 0,
    lastActiveDate: '',
  },
  customPlaylists: [],
  lastUpdated: new Date().toISOString(),
};

// In-memory synchronized store for client hydration
let memoryState: UserStudyData = DEFAULT_INITIAL_STUDY_DATA;
let isStoreInitialized = false;
const storeListeners = new Set<() => void>();

function notifyStoreListeners() {
  for (const listener of storeListeners) {
    listener();
  }
}

function getStoreSnapshot(): UserStudyData {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_STUDY_DATA;
  if (!isStoreInitialized) {
    isStoreInitialized = true;
    try {
      if (localStorage.getItem('rafsan_study_deck_data')) {
        localStorage.removeItem('rafsan_study_deck_data');
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: UserStudyData = JSON.parse(saved);
        memoryState = {
          activePlaylistId: parsed.activePlaylistId || '',
          activeVideoId: parsed.activeVideoId || '',
          completedVideos: parsed.completedVideos || {},
          videoNotes: parsed.videoNotes || {},
          videoProgress: parsed.videoProgress || {},
          streak: parsed.streak || { count: 0, lastActiveDate: '' },
          customPlaylists: parsed.customPlaylists || [],
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };
      } else {
        memoryState = DEFAULT_INITIAL_STUDY_DATA;
      }
    } catch (e) {
      console.warn('Error reading study deck localStorage:', e);
      memoryState = DEFAULT_INITIAL_STUDY_DATA;
    }
  }
  return memoryState;
}

function getServerSnapshot(): UserStudyData {
  return DEFAULT_INITIAL_STUDY_DATA;
}

// Synchronized theme store
let memoryTheme: 'dark' | 'light' = 'dark';
let isThemeInitialized = false;
const themeListeners = new Set<() => void>();

function notifyThemeListeners() {
  for (const listener of themeListeners) {
    listener();
  }
}

function getThemeSnapshot(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  if (!isThemeInitialized) {
    isThemeInitialized = true;
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light' | null;
      if (saved === 'light' || saved === 'dark') {
        memoryTheme = saved;
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        memoryTheme = systemPrefersDark ? 'dark' : 'light';
      }
    } catch {
      // ignore
    }
  }
  return memoryTheme;
}

function getThemeServerSnapshot(): 'dark' | 'light' {
  return 'dark';
}

export default function StudyDeckPage() {
  const [view, setView] = useState<'dashboard' | 'learning'>('dashboard');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isTargetEstimatorOpen, setIsTargetEstimatorOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Global Keyboard Shortcuts (Shortcuts Modal ?, Stats S)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Open Shortcuts Guide (?)
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
      // Open Stats (S)
      else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsStatsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Synchronized theme store
  const theme = useSyncExternalStore(
    (callback) => {
      themeListeners.add(callback);
      return () => themeListeners.delete(callback);
    },
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const handleToggleTheme = useCallback(() => {
    const nextTheme = memoryTheme === 'dark' ? 'light' : 'dark';
    memoryTheme = nextTheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // ignore
    }
    notifyThemeListeners();
  }, []);

  // Listen to OS/System color scheme changes (Windows / Android / iOS / macOS settings)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      memoryTheme = newTheme;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {
        // ignore
      }
      notifyThemeListeners();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  // Register Service Worker for MS Edge, Chrome, Safari PWA installation
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('PWA ServiceWorker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('ServiceWorker registration error:', err);
        });
    }
  }, []);

  // Update HTML class, CSS color-scheme, and dynamic PWA title bar meta theme-color
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const themeColor = theme === 'dark' ? '#09090b' : '#ffffff';

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Update or insert meta[name="theme-color"] for installed PWA window title bar
    let metaTags = document.querySelectorAll('meta[name="theme-color"]');
    if (metaTags.length === 0) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = themeColor;
      document.head.appendChild(meta);
    } else {
      metaTags.forEach((tag) => {
        tag.setAttribute('content', themeColor);
      });
    }
  }, [theme]);

  // Synchronized study store for SSR and client persistence
  const studyData = useSyncExternalStore(
    (callback) => {
      storeListeners.add(callback);
      return () => storeListeners.delete(callback);
    },
    getStoreSnapshot,
    getServerSnapshot
  );

  // Sync to LocalStorage
  const persistData = useCallback((newData: UserStudyData) => {
    memoryState = newData;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error('Error saving study deck data:', e);
    }
    notifyStoreListeners();
  }, []);

  // Auto-backfill missing video durations for saved playlists
  useEffect(() => {
    const playlists = studyData.customPlaylists || [];
    if (playlists.length === 0) return;

    const missingIds: string[] = [];
    playlists.forEach((course) => {
      course.items.forEach((item) => {
        if (!item.duration || parseDurationToSeconds(item.duration) === 0) {
          missingIds.push(item.videoId);
        }
      });
    });

    if (missingIds.length === 0) return;

    const idsToFetch = Array.from(new Set(missingIds)).slice(0, 50);

    let isCancelled = false;
    fetch(`/api/playlist?ids=${encodeURIComponent(idsToFetch.join(','))}`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled || !data?.durations) return;
        const durations: Record<string, string> = data.durations;
        if (Object.keys(durations).length === 0) return;

        let hasChanged = false;
        const updatedPlaylists = playlists.map((course) => {
          let courseChanged = false;
          const updatedItems = course.items.map((item) => {
            if ((!item.duration || parseDurationToSeconds(item.duration) === 0) && durations[item.videoId]) {
              courseChanged = true;
              hasChanged = true;
              return { ...item, duration: durations[item.videoId] };
            }
            return item;
          });
          return courseChanged ? { ...course, items: updatedItems } : course;
        });

        if (hasChanged) {
          persistData({
            ...studyData,
            customPlaylists: updatedPlaylists,
            lastUpdated: new Date().toISOString(),
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to auto-backfill missing durations:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [studyData, persistData]);

  // Compute all available courses (purely user-imported playlists)
  const allCourses = useMemo(() => {
    return studyData.customPlaylists || [];
  }, [studyData.customPlaylists]);

  // Current active course
  const currentCourse = useMemo(() => {
    if (allCourses.length === 0) return null;
    const found = allCourses.find((c) => c.id === studyData.activePlaylistId);
    return found || allCourses[0] || null;
  }, [allCourses, studyData.activePlaylistId]);

  // Current active video item
  const currentVideoIndex = useMemo(() => {
    if (!currentCourse || !currentCourse.items || currentCourse.items.length === 0) return 0;
    const idx = currentCourse.items.findIndex(
      (item) => item.videoId === studyData.activeVideoId
    );
    return idx >= 0 ? idx : 0;
  }, [currentCourse, studyData.activeVideoId]);

  const activeVideo = useMemo(() => {
    if (!currentCourse || !currentCourse.items || currentCourse.items.length === 0) return null;
    return currentCourse.items[currentVideoIndex] || currentCourse.items[0] || null;
  }, [currentCourse, currentVideoIndex]);

  // Completed video IDs for current course
  const currentCompletedVideos = useMemo(() => {
    if (!currentCourse) return [];
    return studyData.completedVideos[currentCourse.id] || [];
  }, [studyData.completedVideos, currentCourse]);

  const isCurrentVideoCompleted = useMemo(() => {
    if (!activeVideo) return false;
    return currentCompletedVideos.includes(activeVideo.videoId);
  }, [activeVideo, currentCompletedVideos]);

  // Confetti trigger
  const fireConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'],
      });
    } catch {
      // ignore
    }
  }, []);

  // Action: Select video
  const handleSelectVideo = useCallback(
    (video: PlaylistItem) => {
      const updated: UserStudyData = {
        ...studyData,
        activeVideoId: video.videoId,
        lastUpdated: new Date().toISOString(),
      };
      persistData(updated);
    },
    [studyData, persistData]
  );

  // Streak updating helper
  const updateStreakOnActivity = useCallback((prevStreak: { count: number; lastActiveDate: string }) => {
    const today = new Date().toISOString().slice(0, 10);
    if (!prevStreak.lastActiveDate) {
      return { count: 1, lastActiveDate: today };
    }
    if (prevStreak.lastActiveDate === today) {
      return prevStreak;
    }
    const lastTime = new Date(prevStreak.lastActiveDate).getTime();
    const currTime = new Date(today).getTime();
    const diffDays = Math.round((currTime - lastTime) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return { count: prevStreak.count + 1, lastActiveDate: today };
    } else {
      return { count: 1, lastActiveDate: today };
    }
  }, []);

  // Action: Update video watch progress
  const handleUpdateVideoProgress = useCallback(
    (videoId: string, progress: VideoWatchProgress) => {
      const existing = studyData.videoProgress || {};
      // Avoid excessive writes if values are identical
      const prev = existing[videoId];
      if (
        prev &&
        prev.currentTime === progress.currentTime &&
        prev.percent === progress.percent
      ) {
        return;
      }

      const updated: UserStudyData = {
        ...studyData,
        videoProgress: {
          ...existing,
          [videoId]: progress,
        },
        lastUpdated: new Date().toISOString(),
      };
      persistData(updated);
    },
    [studyData, persistData]
  );

  // Action: Toggle completion status for a video
  const handleToggleComplete = useCallback(
    (videoId: string) => {
      if (!currentCourse) return;
      const currentList = studyData.completedVideos[currentCourse.id] || [];
      const alreadyDone = currentList.includes(videoId);

      const newList = alreadyDone
        ? currentList.filter((id) => id !== videoId)
        : [...currentList, videoId];

      const newStreak = !alreadyDone
        ? updateStreakOnActivity(studyData.streak || { count: 0, lastActiveDate: '' })
        : studyData.streak;

      const updated: UserStudyData = {
        ...studyData,
        completedVideos: {
          ...studyData.completedVideos,
          [currentCourse.id]: newList,
        },
        streak: newStreak,
        lastUpdated: new Date().toISOString(),
      };

      persistData(updated);

      if (!alreadyDone) {
        if (newList.length === currentCourse.items.length) {
          fireConfetti();
        }
      }
    },
    [studyData, currentCourse, persistData, fireConfetti, updateStreakOnActivity]
  );

  // Action: Complete current video & advance to next
  const handleCompleteAndNext = useCallback(() => {
    if (!currentCourse || !activeVideo) return;

    const currentList = studyData.completedVideos[currentCourse.id] || [];
    const isAlreadyDone = currentList.includes(activeVideo.videoId);
    const updatedList = isAlreadyDone
      ? currentList
      : [...currentList, activeVideo.videoId];

    const hasNext = currentVideoIndex < currentCourse.items.length - 1;
    const nextVideoId = hasNext
      ? currentCourse.items[currentVideoIndex + 1].videoId
      : activeVideo.videoId;

    const newStreak = !isAlreadyDone
      ? updateStreakOnActivity(studyData.streak || { count: 0, lastActiveDate: '' })
      : studyData.streak;

    const updated: UserStudyData = {
      ...studyData,
      activeVideoId: nextVideoId,
      completedVideos: {
        ...studyData.completedVideos,
        [currentCourse.id]: updatedList,
      },
      streak: newStreak,
      lastUpdated: new Date().toISOString(),
    };

    persistData(updated);

    if (updatedList.length === currentCourse.items.length) {
      fireConfetti();
    }
  }, [
    activeVideo,
    studyData,
    currentCourse,
    currentVideoIndex,
    persistData,
    fireConfetti,
    updateStreakOnActivity,
  ]);

  // Action: Prev / Next Lesson Navigation
  const handlePreviousLesson = useCallback(() => {
    if (!currentCourse || !currentCourse.items) return;
    if (currentVideoIndex > 0) {
      const prevVideo = currentCourse.items[currentVideoIndex - 1];
      handleSelectVideo(prevVideo);
    }
  }, [currentCourse, currentVideoIndex, handleSelectVideo]);

  const handleNextLesson = useCallback(() => {
    if (!currentCourse || !currentCourse.items) return;
    if (currentVideoIndex < currentCourse.items.length - 1) {
      const nextVideo = currentCourse.items[currentVideoIndex + 1];
      handleSelectVideo(nextVideo);
    }
  }, [currentCourse, currentVideoIndex, handleSelectVideo]);

  // Action: Save Note for a video
  const handleSaveNote = useCallback(
    (videoId: string, note: string) => {
      const updated: UserStudyData = {
        ...studyData,
        videoNotes: {
          ...studyData.videoNotes,
          [videoId]: note,
        },
        lastUpdated: new Date().toISOString(),
      };
      persistData(updated);
    },
    [studyData, persistData]
  );

  // Action: Switch Course & enter learning mode
  const handleSelectCourse = useCallback(
    (course: PlaylistCourse, targetVideoId?: string) => {
      const vid = targetVideoId || course.items[0]?.videoId || '';
      const updated: UserStudyData = {
        ...studyData,
        activePlaylistId: course.id,
        activeVideoId: vid,
        lastUpdated: new Date().toISOString(),
      };
      persistData(updated);
      setView('learning');
    },
    [studyData, persistData]
  );

  // Action: Delete Course from library
  const handleDeleteCourse = useCallback(
    (courseId: string) => {
      const remaining = (studyData.customPlaylists || []).filter((c) => c.id !== courseId);
      const nextActiveCourse = remaining[0] || null;

      const newCompleted = { ...studyData.completedVideos };
      delete newCompleted[courseId];

      const updated: UserStudyData = {
        ...studyData,
        customPlaylists: remaining,
        activePlaylistId: nextActiveCourse ? nextActiveCourse.id : '',
        activeVideoId: nextActiveCourse?.items[0]?.videoId || '',
        completedVideos: newCompleted,
        lastUpdated: new Date().toISOString(),
      };

      persistData(updated);
    },
    [studyData, persistData]
  );

  // Action: Import custom YouTube playlist
  const handleImportPlaylist = async (input: string) => {
    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(input)}`);
      const data = await res.json();

      if (!res.ok || !data.course) {
        return {
          success: false,
          error: data.error || 'Could not fetch playlist details. Check if URL is public or unlisted.',
        };
      }

      const importedCourse: PlaylistCourse = data.course;
      const exists = (studyData.customPlaylists || []).some(
        (c) => c.id === importedCourse.id
      );

      const newCustomList = exists
        ? studyData.customPlaylists.map((c) =>
            c.id === importedCourse.id ? importedCourse : c
          )
        : [...(studyData.customPlaylists || []), importedCourse];

      // Pre-populate video progress duration entries for imported items
      const newVideoProgress = { ...(studyData.videoProgress || {}) };
      importedCourse.items.forEach((item) => {
        const parsedDur = parseDurationToSeconds(item.duration);
        if (parsedDur > 0) {
          newVideoProgress[item.videoId] = {
            currentTime: newVideoProgress[item.videoId]?.currentTime || 0,
            duration: parsedDur,
            percent: newVideoProgress[item.videoId]?.percent || 0,
            lastWatchedAt: newVideoProgress[item.videoId]?.lastWatchedAt || new Date().toISOString(),
          };
        }
      });

      const updated: UserStudyData = {
        ...studyData,
        activePlaylistId: importedCourse.id,
        activeVideoId: importedCourse.items[0]?.videoId || '',
        customPlaylists: newCustomList,
        videoProgress: newVideoProgress,
        lastUpdated: new Date().toISOString(),
      };

      persistData(updated);
      setView('learning'); // Jump right into the imported course
      return { success: true, course: importedCourse };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Network error while importing playlist.',
      };
    }
  };

  // Action: Mark all videos complete in current course
  const handleMarkAllComplete = useCallback(() => {
    if (!currentCourse) return;
    const allIds = currentCourse.items.map((i) => i.videoId);
    const updated: UserStudyData = {
      ...studyData,
      completedVideos: {
        ...studyData.completedVideos,
        [currentCourse.id]: allIds,
      },
      lastUpdated: new Date().toISOString(),
    };
    persistData(updated);
    fireConfetti();
  }, [currentCourse, studyData, persistData, fireConfetti]);

  // Action: Reset current course progress
  const handleResetCourseProgress = useCallback(
    (courseId?: string) => {
      const targetId = courseId || currentCourse?.id;
      if (!targetId) return;

      const updated: UserStudyData = {
        ...studyData,
        completedVideos: {
          ...studyData.completedVideos,
          [targetId]: [],
        },
        lastUpdated: new Date().toISOString(),
      };
      persistData(updated);
    },
    [currentCourse, studyData, persistData]
  );

  // Action: Restore Backup
  const handleImportBackup = useCallback(
    (backupData: UserStudyData) => {
      persistData(backupData);
    },
    [persistData]
  );

  // Action: Toggle custom tag on a video
  const handleToggleTag = useCallback(
    (videoId: string, tag: string) => {
      const currentTags = studyData.videoTags?.[videoId] || [];
      const exists = currentTags.includes(tag);
      const newTags = exists ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
      const updated: UserStudyData = {
        ...studyData,
        videoTags: {
          ...(studyData.videoTags || {}),
          [videoId]: newTags,
        },
        lastUpdated: new Date().toISOString(),
      };
      persistData(updated);
    },
    [studyData, persistData]
  );

  // Action: Update daily target & study goal
  const handleUpdateStudyGoal = useCallback(
    (goal: StudyGoal) => {
      const updated: UserStudyData = {
        ...studyData,
        studyGoal: goal,
        lastUpdated: new Date().toISOString(),
      };
      persistData(updated);
    },
    [studyData, persistData]
  );

  // Action: Reset all local storage data
  const handleResetAllData = useCallback(() => {
    persistData(DEFAULT_INITIAL_STUDY_DATA);
  }, [persistData]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500 selection:text-white ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-zinc-100 text-zinc-900'
      }`}
    >
      {/* Header & Global Greeting Banner */}
      <Header
        currentCourse={currentCourse}
        allCourses={allCourses}
        onSelectCourse={handleSelectCourse}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenStatsModal={() => setIsStatsModalOpen(true)}
        onOpenTargetEstimator={() => setIsTargetEstimatorOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onGoToDashboard={() => setView('dashboard')}
        isDashboard={view === 'dashboard'}
        streakCount={studyData.streak?.count || 0}
        completedCount={currentCompletedVideos.length}
        totalCount={currentCourse ? currentCourse.items.length : 0}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Primary Content View Switcher */}
      {view === 'dashboard' ? (
        /* Main Dashboard & Landing Page */
        <main className="flex-1 w-full overflow-y-auto">
          <DashboardView
            studyData={studyData}
            courses={allCourses}
            activeCourse={currentCourse}
            onSelectCourse={handleSelectCourse}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenTargetEstimator={() => setIsTargetEstimatorOpen(true)}
            onDeleteCourse={handleDeleteCourse}
            onResetCourseProgress={handleResetCourseProgress}
            theme={theme}
          />
        </main>
      ) : (
        /* Immersive Video Learning Studio */
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full">
          {/* Left Section: Focused Video Player & Controls */}
          <section
            className={`flex-1 p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto transition-colors duration-200 ${
              isDark ? 'bg-[#09090b]' : 'bg-zinc-100'
            }`}
          >
            {/* Breadcrumb Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setView('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-xs'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>

              {currentCourse && (
                <span className="text-xs font-medium text-zinc-500 truncate max-w-xs sm:max-w-md">
                  Track: <strong className={isDark ? 'text-zinc-300' : 'text-zinc-800'}>{currentCourse.title}</strong>
                </span>
              )}
            </div>

            <VideoPlayer
              video={activeVideo}
              currentIndex={currentVideoIndex}
              totalLessons={currentCourse ? currentCourse.items.length : 0}
              isCompleted={isCurrentVideoCompleted}
              onToggleComplete={handleToggleComplete}
              onCompleteAndNext={handleCompleteAndNext}
              onPreviousLesson={handlePreviousLesson}
              onNextLesson={handleNextLesson}
              hasPrevious={currentVideoIndex > 0}
              hasNext={currentCourse ? currentVideoIndex < currentCourse.items.length - 1 : false}
              noteContent={activeVideo ? studyData.videoNotes[activeVideo.videoId] || '' : ''}
              onSaveNote={handleSaveNote}
              watchProgress={activeVideo ? studyData.videoProgress?.[activeVideo.videoId] : undefined}
              onUpdateProgress={handleUpdateVideoProgress}
              videoTags={activeVideo ? studyData.videoTags?.[activeVideo.videoId] || [] : []}
              onToggleTag={handleToggleTag}
              onTriggerConfetti={fireConfetti}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              theme={theme}
            />
          </section>

          {/* Right Section: Course Checklist Sidebar */}
          <section
            className={`w-full lg:w-[380px] xl:w-[400px] border-t lg:border-t-0 lg:border-l flex flex-col shrink-0 transition-colors duration-200 ${
              isDark
                ? 'border-zinc-800 bg-[#0c0c0e]'
                : 'border-zinc-200 bg-white'
            }`}
          >
            <PlaylistSidebar
              course={currentCourse}
              activeVideoId={studyData.activeVideoId}
              completedVideoIds={currentCompletedVideos}
              notesMap={studyData.videoNotes || {}}
              watchProgressMap={studyData.videoProgress || {}}
              videoTagsMap={studyData.videoTags || {}}
              onSelectVideo={handleSelectVideo}
              onToggleComplete={handleToggleComplete}
              onMarkAllComplete={handleMarkAllComplete}
              onResetCourseProgress={handleResetCourseProgress}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              theme={theme}
            />
          </section>
        </main>
      )}

      {/* Modals */}
      <PlaylistModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportPlaylist={handleImportPlaylist}
        savedCourses={allCourses}
        activeCourseId={currentCourse?.id || ''}
        onSelectCourse={handleSelectCourse}
        onDeleteCourse={handleDeleteCourse}
        theme={theme}
      />

      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        studyData={studyData}
        courses={allCourses}
        onImportBackup={handleImportBackup}
        onResetAllData={handleResetAllData}
        theme={theme}
      />

      <TargetEstimatorModal
        isOpen={isTargetEstimatorOpen}
        onClose={() => setIsTargetEstimatorOpen(false)}
        courses={allCourses}
        activeCourse={currentCourse}
        studyData={studyData}
        onUpdateGoal={handleUpdateStudyGoal}
        theme={theme}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        theme={theme}
      />
    </div>
  );
}
