import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PlaylistCourse, VideoWatchProgress } from "@/types/playlist";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDurationToSeconds(
  durationStr?: string | number,
  progressDuration?: number
): number {
  if (progressDuration && progressDuration > 0) return progressDuration;
  if (durationStr === undefined || durationStr === null || durationStr === '') return 0;

  if (typeof durationStr === 'number') {
    return isNaN(durationStr) || durationStr < 0 ? 0 : Math.round(durationStr);
  }

  const str = String(durationStr).trim();
  if (!str) return 0;

  // Pure numeric string (seconds)
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // Handle "MM:SS" or "HH:MM:SS"
  if (str.includes(':')) {
    const parts = str.split(':').map((p) => parseInt(p.trim(), 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }

  // Handle ISO 8601 duration "PT1H23M45S", "PT15M", "PT45S"
  const isoMatch = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (isoMatch && (isoMatch[1] || isoMatch[2] || isoMatch[3])) {
    const hours = parseInt(isoMatch[1] || '0', 10);
    const mins = parseInt(isoMatch[2] || '0', 10);
    const secs = parseInt(isoMatch[3] || '0', 10);
    return hours * 3600 + mins * 60 + secs;
  }

  // Handle words e.g. "1 hour 20 mins", "15 minutes"
  let totalFromText = 0;
  const hrMatch = str.match(/(\d+)\s*(?:hr|hour)s?/i);
  if (hrMatch) totalFromText += parseInt(hrMatch[1], 10) * 3600;
  const minMatch = str.match(/(\d+)\s*(?:min|minute)s?/i);
  if (minMatch) totalFromText += parseInt(minMatch[1], 10) * 60;
  const secMatch = str.match(/(\d+)\s*(?:sec|second)s?/i);
  if (secMatch) totalFromText += parseInt(secMatch[1], 10);

  if (totalFromText > 0) return totalFromText;

  return 0;
}

export function formatDurationHuman(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function calculateCourseDurations(
  course: PlaylistCourse,
  completedVideoIds: string[] = [],
  watchProgressMap: Record<string, VideoWatchProgress> = {}
) {
  const completedSet = new Set(completedVideoIds);
  let watchedSecs = 0;
  let totalSecs = 0;

  course.items.forEach((item) => {
    const prog = watchProgressMap[item.videoId];
    const parsedItemDur = parseDurationToSeconds(item.duration);

    // Prefer recorded live player duration if available, otherwise item's parsed duration
    const itemDuration =
      prog?.duration && prog.duration > 0
        ? prog.duration
        : parsedItemDur > 0
        ? parsedItemDur
        : 600; // 10m fallback estimate if duration unknown

    totalSecs += itemDuration;

    if (completedSet.has(item.videoId)) {
      watchedSecs += itemDuration;
    } else if (prog && prog.currentTime > 0) {
      watchedSecs += Math.min(prog.currentTime, itemDuration);
    }
  });

  const remainingSecs = Math.max(0, totalSecs - watchedSecs);

  return {
    watchedSecs,
    totalSecs,
    remainingSecs,
  };
}
