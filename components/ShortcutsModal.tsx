'use client';

import React from 'react';
import { X, Keyboard, Command, Tv, CheckSquare, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const SHORTCUT_GROUPS = [
  {
    title: '🎥 Video Player Controls',
    icon: Tv,
    shortcuts: [
      { key: 'F', description: 'Toggle Fullscreen Player' },
      { key: 'Space / K', description: 'Play / Pause Video' },
      { key: 'J / ←', description: 'Seek Backward 10 Seconds' },
      { key: 'L / →', description: 'Seek Forward 10 Seconds' },
      { key: 'M', description: 'Mute / Unmute Audio' },
      { key: '< / >', description: 'Decrease / Increase Playback Speed' },
    ],
  },
  {
    title: '📚 Lesson & Study Actions',
    icon: CheckSquare,
    shortcuts: [
      { key: 'N', description: 'Skip to Next Video in Playlist' },
      { key: 'P', description: 'Return to Previous Video' },
      { key: 'D', description: 'Toggle Completion Checkmark' },
      { key: 'T', description: 'Jump to Video Notes Scratchpad' },
      { key: 'S', description: 'Open Study Statistics & Backup' },
      { key: '?', description: 'Show / Hide Keyboard Shortcuts' },
    ],
  },
];

export function ShortcutsModal({ isOpen, onClose, theme = 'dark' }: ShortcutsModalProps) {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className={`relative w-full max-w-xl border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto transition-colors ${
          isDark
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute right-4 top-4 p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-zinc-200'
          }`}
          title="Close shortcuts cheat sheet (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-medium">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Power User Controls</span>
          </div>
          <h2
            className={`text-xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            Keyboard Shortcuts
          </h2>
          <p className="text-xs text-zinc-500">
            Control playback, navigate lessons, and manage study notes without touching your mouse.
          </p>
        </div>

        {/* Shortcut Groups */}
        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group, groupIdx) => {
            const GroupIcon = group.icon;
            return (
              <div key={groupIdx} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  <GroupIcon className="w-3.5 h-3.5" />
                  <span>{group.title}</span>
                </div>

                <div
                  className={`divide-y rounded-xl border overflow-hidden ${
                    isDark ? 'bg-zinc-900/60 border-zinc-800/80 divide-zinc-800/60' : 'bg-zinc-50 border-zinc-200 divide-zinc-200'
                  }`}
                >
                  {group.shortcuts.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                    >
                      <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                        {item.description}
                      </span>
                      <kbd
                        className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${
                          isDark
                            ? 'bg-zinc-950 border-zinc-700/80 text-indigo-300 shadow-black'
                            : 'bg-white border-zinc-300 text-indigo-700 shadow-zinc-200'
                        }`}
                      >
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Safeguard Footer Note */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
            isDark ? 'bg-indigo-950/30 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />
          <span>
            <strong>Smart Safeguard:</strong> Shortcuts are automatically disabled while typing inside notes, search inputs, or text fields.
          </span>
        </div>
      </div>
    </div>
  );
}
