export interface PlaylistItem {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  position: number;
  duration?: string;
  channelTitle?: string;
  publishedAt?: string;
}

export interface PlaylistCourse {
  id: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnail: string;
  totalVideos: number;
  items: PlaylistItem[];
  isCustom?: boolean;
}

export interface VideoWatchProgress {
  currentTime: number; // in seconds
  duration: number; // in seconds
  percent: number; // 0 to 100
  lastWatchedAt: string; // ISO string
}

export interface StudyGoal {
  dailyTopics: number;
  dailyMinutes: number;
}

export interface UserStudyData {
  activePlaylistId: string;
  activeVideoId: string;
  // Map of playlistId -> array of completed video IDs
  completedVideos: Record<string, string[]>;
  // Map of videoId -> note content
  videoNotes: Record<string, string>;
  // Map of videoId -> watch progress (time, duration, percentage)
  videoProgress?: Record<string, VideoWatchProgress>;
  // Map of videoId -> array of tags (e.g. "Important", "Hard", "Review")
  videoTags?: Record<string, string[]>;
  // Daily target configuration
  studyGoal?: StudyGoal;
  streak: {
    count: number;
    lastActiveDate: string; // YYYY-MM-DD
  };
  customPlaylists: PlaylistCourse[];
  lastUpdated: string;
}
