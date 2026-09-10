'use client';

import React, { useState, useCallback, useMemo, useSyncExternalStore, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Minimize2, ListVideo } from 'lucide-react';
import { Header } from '@/components/Header';
import { VideoPlayer } from '@/components/VideoPlayer';
import { PlaylistSidebar } from '@/components/PlaylistSidebar';
import { PlaylistModal } from '@/components/PlaylistModal';
import { StatsModal } from '@/components/StatsModal';
import { DashboardView } from '@/components/DashboardView';
import { TargetEstimatorModal } from '@/components/TargetEstimatorModal';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import {
  PlaylistCourse,
  PlaylistItem,
  StudyGoal,
  WeeklyStudyGoal,
  UserStudyData,
  VideoWatchProgress,
} from '@/types/playlist';
import { parseDurationToSeconds, getLocalDateString } from '@/lib/utils';

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
  disabledPlaylistIds: [],
  customPlaylists: [],
  studyGoal: {
    dailyTopics: 2,
    dailyMinutes: 45,
    goalType: 'topics',
  },
  weeklyGoal: {
    targetMinutes: 300,
    targetTopics: 10,
  },
  dailyActivity: {},
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
          videoTags: parsed.videoTags || {},
          streak: parsed.streak || { count: 0, lastActiveDate: '' },
          disabledPlaylistIds: parsed.disabledPlaylistIds || [],
          customPlaylists: parsed.customPlaylists || [],
          studyGoal: parsed.studyGoal
            ? {
                dailyTopics: parsed.studyGoal.dailyTopics ?? 2,
                dailyMinutes: parsed.studyGoal.dailyMinutes ?? 45,
                goalType: parsed.studyGoal.goalType ?? 'topics',
              }
            : DEFAULT_INITIAL_STUDY_DATA.studyGoal,
          weeklyGoal: parsed.weeklyGoal || DEFAULT_INITIAL_STUDY_DATA.weeklyGoal,
          dailyActivity: parsed.dailyActivity || {},
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
  const [theaterMode, setTheaterMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('study_deck_theater_mode') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleToggleTheaterMode = useCallback(() => {
    setTheaterMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('study_deck_theater_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

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

  // Atomic state updater that reads from memoryState directly to eliminate stale closure races
  const updateStudyData = useCallback((updater: (prev: UserStudyData) => UserStudyData) => {
    const nextData = updater(memoryState);
    memoryState = nextData;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
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

  // Compute all available courses (purely user-imported playlists) with disabled tracking flag
  const allCourses = useMemo(() => {
    const disabledSet = new Set(studyData.disabledPlaylistIds || []);
    return (studyData.customPlaylists || []).map((course) => ({
      ...course,
      disabledFromTracking: Boolean(course.disabledFromTracking || disabledSet.has(course.id)),
    }));
  }, [studyData.customPlaylists, studyData.disabledPlaylistIds]);

  // Current active course - prioritize active tracked courses so disabled playlists act like they are not there
  const currentCourse = useMemo(() => {
    if (allCourses.length === 0) return null;
    const disabledSet = new Set(studyData.disabledPlaylistIds || []);
    const activeTracked = allCourses.filter((c) => !c.disabledFromTracking && !disabledSet.has(c.id));

    // If current activePlaylistId points to an active tracked course, use it
    const activeFound = activeTracked.find((c) => c.id === studyData.activePlaylistId);
    if (activeFound) return activeFound;

    // If activePlaylistId is disabled or missing, fallback to the first active tracked course
    if (activeTracked.length > 0) return activeTracked[0];

    // Fallback if all courses are disabled: allow access to the selected course
    const found = allCourses.find((c) => c.id === studyData.activePlaylistId);
    return found || allCourses[0] || null;
  }, [allCourses, studyData.activePlaylistId, studyData.disabledPlaylistIds]);

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

  const currentCourseRef = React.useRef<PlaylistCourse | null>(currentCourse);
  useEffect(() => {
    currentCourseRef.current = currentCourse;
  }, [currentCourse]);

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
      updateStudyData((prev) => ({
        ...prev,
        activeVideoId: video.videoId,
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateStudyData]
  );

  // Streak updating helper using user's local calendar dates
  const updateStreakOnActivity = useCallback((prevStreak: { count: number; lastActiveDate: string }) => {
    const today = getLocalDateString();
    if (!prevStreak.lastActiveDate) {
      return { count: 1, lastActiveDate: today };
    }
    if (prevStreak.lastActiveDate === today) {
      return prevStreak;
    }
    const [lastY, lastM, lastD] = prevStreak.lastActiveDate.split('-').map(Number);
    const [currY, currM, currD] = today.split('-').map(Number);
    const lastDate = new Date(lastY, lastM - 1, lastD);
    const currDate = new Date(currY, currM - 1, currD);
    const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return { count: prevStreak.count + 1, lastActiveDate: today };
    } else if (diffDays > 1) {
      return { count: 1, lastActiveDate: today };
    } else {
      return prevStreak;
    }
  }, []);

  // Action: Update video watch progress (atomic to avoid clobbering daily activity)
  const handleUpdateVideoProgress = useCallback(
    (videoId: string, progress: VideoWatchProgress) => {
      updateStudyData((prev) => {
        const existing = prev.videoProgress || {};
        const prevProg = existing[videoId];
        if (
          prevProg &&
          prevProg.currentTime === progress.currentTime &&
          prevProg.percent === progress.percent
        ) {
          return prev;
        }

        return {
          ...prev,
          videoProgress: {
            ...existing,
            [videoId]: progress,
          },
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [updateStudyData]
  );

  // Action: Live playback study time logging (tracks exact seconds/minutes watched, even for unfinished videos)
  const handleStudyTimeLogged = useCallback(
    (secondsDelta: number, _videoId: string) => {
      if (secondsDelta <= 0) return;

      // If current course is excluded from tracking, do not log to tracking system or streaks
      if (currentCourseRef.current) {
        const isTrackingDisabled = Boolean(
          currentCourseRef.current.disabledFromTracking ||
          memoryState.disabledPlaylistIds?.includes(currentCourseRef.current.id)
        );
        if (isTrackingDisabled) return;
      }

      const todayStr = getLocalDateString();
      updateStudyData((prev) => {
        const existingDaily = prev.dailyActivity || {};
        const curToday = existingDaily[todayStr] || { minutes: 0, seconds: 0, topics: 0 };

        const curSecs = curToday.seconds !== undefined ? curToday.seconds : (curToday.minutes || 0) * 60;
        const newSecs = curSecs + secondsDelta;
        const newMins = Math.round(newSecs / 60);

        const updatedDaily = {
          ...existingDaily,
          [todayStr]: {
            ...curToday,
            seconds: newSecs,
            minutes: newMins,
          },
        };

        const newStreak = updateStreakOnActivity(
          prev.streak || { count: 0, lastActiveDate: '' }
        );

        return {
          ...prev,
          dailyActivity: updatedDaily,
          streak: newStreak,
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [updateStudyData, updateStreakOnActivity]
  );

  // Action: Toggle completion status for a video
  const handleToggleComplete = useCallback(
    (videoId: string) => {
      if (!currentCourse) return;
      const isTrackingDisabled = Boolean(
        currentCourse.disabledFromTracking ||
        memoryState.disabledPlaylistIds?.includes(currentCourse.id)
      );

      let wasNewlyDone = false;
      let completedCount = 0;

      updateStudyData((prev) => {
        const currentList = prev.completedVideos[currentCourse.id] || [];
        const alreadyDone = currentList.includes(videoId);
        wasNewlyDone = !alreadyDone;

        const newList = alreadyDone
          ? currentList.filter((id) => id !== videoId)
          : [...currentList, videoId];

        completedCount = newList.length;

        // If playlist is disabled from tracking, DO NOT affect streaks or daily target tracking
        const newStreak = (!alreadyDone && !isTrackingDisabled)
          ? updateStreakOnActivity(prev.streak || { count: 0, lastActiveDate: '' })
          : prev.streak;

        let updatedDaily = prev.dailyActivity || {};
        if (!isTrackingDisabled) {
          const todayStr = getLocalDateString();
          const curToday = updatedDaily[todayStr] || { minutes: 0, seconds: 0, topics: 0 };

          if (!alreadyDone) {
            updatedDaily = {
              ...updatedDaily,
              [todayStr]: {
                ...curToday,
                topics: (curToday.topics || 0) + 1,
              },
            };
          } else {
            updatedDaily = {
              ...updatedDaily,
              [todayStr]: {
                ...curToday,
                topics: Math.max(0, (curToday.topics || 1) - 1),
              },
            };
          }
        }

        return {
          ...prev,
          completedVideos: {
            ...prev.completedVideos,
            [currentCourse.id]: newList,
          },
          dailyActivity: updatedDaily,
          streak: newStreak,
          lastUpdated: new Date().toISOString(),
        };
      });

      if (wasNewlyDone && completedCount === currentCourse.items.length) {
        fireConfetti();
      }
    },
    [currentCourse, updateStudyData, fireConfetti, updateStreakOnActivity]
  );

  // Action: Complete current video & advance to next
  const handleCompleteAndNext = useCallback(() => {
    if (!currentCourse || !activeVideo) return;

    const isTrackingDisabled = Boolean(
      currentCourse.disabledFromTracking ||
      memoryState.disabledPlaylistIds?.includes(currentCourse.id)
    );

    const hasNext = currentVideoIndex < currentCourse.items.length - 1;
    const nextVideoId = hasNext
      ? currentCourse.items[currentVideoIndex + 1].videoId
      : activeVideo.videoId;

    let allCompleted = false;

    updateStudyData((prev) => {
      const currentList = prev.completedVideos[currentCourse.id] || [];
      const isAlreadyDone = currentList.includes(activeVideo.videoId);
      const updatedList = isAlreadyDone
        ? currentList
        : [...currentList, activeVideo.videoId];

      if (updatedList.length === currentCourse.items.length) {
        allCompleted = true;
      }

      // If playlist is disabled from tracking, DO NOT affect streaks or daily target tracking
      const newStreak = (!isAlreadyDone && !isTrackingDisabled)
        ? updateStreakOnActivity(prev.streak || { count: 0, lastActiveDate: '' })
        : prev.streak;

      let updatedDaily = prev.dailyActivity || {};
      if (!isTrackingDisabled) {
        const todayStr = getLocalDateString();
        const curToday = updatedDaily[todayStr] || { minutes: 0, seconds: 0, topics: 0 };

        if (!isAlreadyDone) {
          updatedDaily = {
            ...updatedDaily,
            [todayStr]: {
              ...curToday,
              topics: (curToday.topics || 0) + 1,
            },
          };
        }
      }

      return {
        ...prev,
        activeVideoId: nextVideoId,
        completedVideos: {
          ...prev.completedVideos,
          [currentCourse.id]: updatedList,
        },
        dailyActivity: updatedDaily,
        streak: newStreak,
        lastUpdated: new Date().toISOString(),
      };
    });

    if (allCompleted) {
      fireConfetti();
    }
  }, [
    activeVideo,
    currentCourse,
    currentVideoIndex,
    fireConfetti,
    updateStreakOnActivity,
    updateStudyData,
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
      updateStudyData((prev) => ({
        ...prev,
        videoNotes: {
          ...prev.videoNotes,
          [videoId]: note,
        },
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateStudyData]
  );

  // Action: Switch Course & enter learning mode
  const handleSelectCourse = useCallback(
    (course: PlaylistCourse, targetVideoId?: string) => {
      const vid = targetVideoId || course.items[0]?.videoId || '';
      updateStudyData((prev) => ({
        ...prev,
        activePlaylistId: course.id,
        activeVideoId: vid,
        lastUpdated: new Date().toISOString(),
      }));
      setView('learning');
    },
    [updateStudyData]
  );

  // Action: Delete Course from library
  const handleDeleteCourse = useCallback(
    (courseId: string) => {
      updateStudyData((prev) => {
        const remaining = (prev.customPlaylists || []).filter((c) => c.id !== courseId);
        const nextActiveCourse = remaining[0] || null;

        const newCompleted = { ...prev.completedVideos };
        delete newCompleted[courseId];

        return {
          ...prev,
          customPlaylists: remaining,
          disabledPlaylistIds: (prev.disabledPlaylistIds || []).filter((id) => id !== courseId),
          activePlaylistId: nextActiveCourse ? nextActiveCourse.id : '',
          activeVideoId: nextActiveCourse?.items[0]?.videoId || '',
          completedVideos: newCompleted,
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [updateStudyData]
  );

  // Action: Toggle playlist tracking inclusion (enabling/disabling from tracking system)
  const handleTogglePlaylistTracking = useCallback(
    (courseId: string) => {
      updateStudyData((prev) => {
        const currentDisabled = prev.disabledPlaylistIds || [];
        const isCurrentlyDisabled = currentDisabled.includes(courseId);
        const newDisabledList = isCurrentlyDisabled
          ? currentDisabled.filter((id) => id !== courseId)
          : [...currentDisabled, courseId];

        const updatedPlaylists = (prev.customPlaylists || []).map((c) => {
          if (c.id === courseId) {
            return {
              ...c,
              disabledFromTracking: !isCurrentlyDisabled,
            };
          }
          return c;
        });

        // When disabling the active playlist, automatically switch active track to a remaining tracked playlist
        let nextActivePlaylistId = prev.activePlaylistId;
        let nextActiveVideoId = prev.activeVideoId;
        if (!isCurrentlyDisabled && prev.activePlaylistId === courseId) {
          const remainingTracked = updatedPlaylists.find(
            (c) => c.id !== courseId && !newDisabledList.includes(c.id)
          );
          if (remainingTracked) {
            nextActivePlaylistId = remainingTracked.id;
            nextActiveVideoId = remainingTracked.items[0]?.videoId || '';
          }
        }

        return {
          ...prev,
          activePlaylistId: nextActivePlaylistId,
          activeVideoId: nextActiveVideoId,
          disabledPlaylistIds: newDisabledList,
          customPlaylists: updatedPlaylists,
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [updateStudyData]
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

      updateStudyData((prev) => {
        const exists = (prev.customPlaylists || []).some(
          (c) => c.id === importedCourse.id
        );

        const newCustomList = exists
          ? prev.customPlaylists.map((c) =>
              c.id === importedCourse.id ? importedCourse : c
            )
          : [...(prev.customPlaylists || []), importedCourse];

        // Pre-populate video progress duration entries for imported items
        const newVideoProgress = { ...(prev.videoProgress || {}) };
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

        return {
          ...prev,
          activePlaylistId: importedCourse.id,
          activeVideoId: importedCourse.items[0]?.videoId || '',
          customPlaylists: newCustomList,
          videoProgress: newVideoProgress,
          lastUpdated: new Date().toISOString(),
        };
      });

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
    updateStudyData((prev) => ({
      ...prev,
      completedVideos: {
        ...prev.completedVideos,
        [currentCourse.id]: allIds,
      },
      lastUpdated: new Date().toISOString(),
    }));
    fireConfetti();
  }, [currentCourse, updateStudyData, fireConfetti]);

  // Action: Reset current course progress
  const handleResetCourseProgress = useCallback(
    (courseId?: string) => {
      const targetId = courseId || currentCourse?.id;
      if (!targetId) return;

      updateStudyData((prev) => ({
        ...prev,
        completedVideos: {
          ...prev.completedVideos,
          [targetId]: [],
        },
        lastUpdated: new Date().toISOString(),
      }));
    },
    [currentCourse, updateStudyData]
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
      updateStudyData((prev) => {
        const currentTags = prev.videoTags?.[videoId] || [];
        const exists = currentTags.includes(tag);
        const newTags = exists ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
        return {
          ...prev,
          videoTags: {
            ...(prev.videoTags || {}),
            [videoId]: newTags,
          },
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [updateStudyData]
  );

  // Action: Update weekly study goal
  const handleUpdateWeeklyGoal = useCallback(
    (goal: WeeklyStudyGoal) => {
      updateStudyData((prev) => ({
        ...prev,
        weeklyGoal: goal,
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateStudyData]
  );

  // Action: Log or adjust study session on a date (supports both 'set' and 'add' modes)
  const handleLogStudySession = useCallback(
    (date: string, minutes: number, topics: number, mode: 'add' | 'set' = 'add') => {
      updateStudyData((prev) => {
        const currentRec = prev.dailyActivity?.[date] || { minutes: 0, seconds: 0, topics: 0 };
        const newMins = mode === 'set' ? Math.max(0, minutes) : Math.max(0, (currentRec.minutes || 0) + minutes);
        const newSecs = newMins * 60;
        const newTopics = mode === 'set' ? Math.max(0, topics) : Math.max(0, (currentRec.topics || 0) + topics);

        const updatedDaily = {
          ...(prev.dailyActivity || {}),
          [date]: {
            ...currentRec,
            minutes: newMins,
            seconds: newSecs,
            topics: newTopics,
          },
        };

        const newStreak = updateStreakOnActivity(
          prev.streak || { count: 0, lastActiveDate: '' }
        );

        return {
          ...prev,
          dailyActivity: updatedDaily,
          streak: newStreak,
          lastUpdated: new Date().toISOString(),
        };
      });
      fireConfetti();
    },
    [updateStudyData, updateStreakOnActivity, fireConfetti]
  );

  // Action: Update daily target & study goal
  const handleUpdateStudyGoal = useCallback(
    (goal: StudyGoal) => {
      updateStudyData((prev) => ({
        ...prev,
        studyGoal: goal,
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateStudyData]
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
            onTogglePlaylistTracking={handleTogglePlaylistTracking}
            onUpdateWeeklyGoal={handleUpdateWeeklyGoal}
            onLogStudySession={handleLogStudySession}
            theme={theme}
          />
        </main>
      ) : (
        /* Immersive Video Learning Studio */
        <main
          className={`flex-1 flex ${
            theaterMode ? 'flex-col overflow-y-auto' : 'flex-col lg:flex-row overflow-hidden'
          } w-full transition-all duration-200`}
        >
          {/* Left / Main Section: Focused Video Player & Controls */}
          <section
            className={`flex-1 ${
              theaterMode
                ? 'px-3 py-2.5 sm:px-5 sm:py-3.5 max-w-[1700px] mx-auto w-full'
                : 'px-3 py-2.5 sm:px-6 sm:py-3.5 overflow-y-auto'
            } flex flex-col gap-2.5 sm:gap-3 transition-colors duration-200 ${
              isDark ? 'bg-[#09090b]' : 'bg-zinc-100'
            }`}
          >
            {/* Breadcrumb Back Button & Top Navigation */}
            <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
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

              {/* Theater Mode Action Pill in Header */}
              {theaterMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const el = document.getElementById('theater-course-playlist');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                        : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 shadow-xs'
                    }`}
                  >
                    <ListVideo className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Lessons ({currentCompletedVideos.length}/{currentCourse?.items.length || 0})</span>
                  </button>

                  <button
                    onClick={handleToggleTheaterMode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-xs"
                    title="Switch to Standard side-by-side view (T)"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exit Theater</span>
                  </button>
                </div>
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
              onStudyTimeLogged={handleStudyTimeLogged}
              videoTags={activeVideo ? studyData.videoTags?.[activeVideo.videoId] || [] : []}
              onToggleTag={handleToggleTag}
              onTriggerConfetti={fireConfetti}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              theme={theme}
              theaterMode={theaterMode}
              onToggleTheaterMode={handleToggleTheaterMode}
            />
          </section>

          {/* Right / Bottom Section: Course Checklist Sidebar */}
          <section
            id="theater-course-playlist"
            className={`${
              theaterMode
                ? 'w-full max-w-[1700px] mx-auto border-t p-3 sm:p-5 lg:p-6 mt-2'
                : 'w-full lg:w-[380px] xl:w-[400px] border-t lg:border-t-0 lg:border-l'
            } flex flex-col shrink-0 transition-colors duration-200 ${
              isDark
                ? 'border-zinc-800 bg-[#0c0c0e]'
                : 'border-zinc-200 bg-white'
            }`}
          >
            {theaterMode && (
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <ListVideo className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm">Course Playlist</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono">
                    {currentCompletedVideos.length} / {currentCourse?.items.length || 0} completed
                  </span>
                </div>
                <button
                  onClick={handleToggleTheaterMode}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Standard View</span>
                </button>
              </div>
            )}
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
              onTogglePlaylistTracking={handleTogglePlaylistTracking}
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
        onTogglePlaylistTracking={handleTogglePlaylistTracking}
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
        key={`target-modal-${studyData.studyGoal?.goalType || 'topics'}-${studyData.studyGoal?.dailyTopics || 2}-${studyData.studyGoal?.dailyMinutes || 45}-${currentCourse?.id || 'all'}-${isTargetEstimatorOpen}`}
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
