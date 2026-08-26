'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Link2,
  Sparkles,
  Loader2,
  ClipboardPaste,
  AlertCircle,
  Check,
  Trash2,
  Layers,
  HelpCircle,
  ExternalLink,
  Youtube,
} from 'lucide-react';
import { PlaylistCourse } from '@/types/playlist';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPlaylist: (input: string) => Promise<{ success: boolean; course?: PlaylistCourse; error?: string }>;
  savedCourses?: PlaylistCourse[];
  activeCourseId?: string;
  onSelectCourse?: (course: PlaylistCourse) => void;
  onDeleteCourse?: (courseId: string) => void;
  theme?: 'dark' | 'light';
}

export function PlaylistModal({
  isOpen,
  onClose,
  onImportPlaylist,
  savedCourses = [],
  activeCourseId = '',
  onSelectCourse,
  onDeleteCourse,
  theme = 'dark',
}: PlaylistModalProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text.trim());
          setErrorMsg('');
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
        }
      }
    } catch {
      // Clipboard access might be denied in some iframe environments
      setErrorMsg('Clipboard permission was denied. Please paste manually into the field.');
    }
  };

  const detectInputType = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (trimmed.includes('list=')) return 'Playlist Link';
    if (trimmed.startsWith('PL') || trimmed.startsWith('UU') || trimmed.startsWith('FL') || trimmed.startsWith('RD'))
      return 'Playlist ID';
    if (trimmed.includes('youtube.com/watch') || trimmed.includes('youtu.be')) return 'Video Link';
    if (trimmed.length >= 20) return 'Playlist ID / URL';
    return 'Custom Link';
  };

  const detectedType = detectInputType(inputUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const res = await onImportPlaylist(inputUrl);
    setLoading(false);

    if (res.success) {
      setInputUrl('');
      onClose();
    } else {
      setErrorMsg(
        res.error ||
          'Failed to load playlist. Please ensure the playlist is public/unlisted and the URL or ID is correct.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-xl border rounded-2xl shadow-2xl p-5 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto transition-colors ${
          isDark
            ? 'bg-[#09090b] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900 shadow-xl'
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
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 text-xs font-mono font-medium">
            <Youtube className="w-3.5 h-3.5" />
            <span>Playlist Importer</span>
          </div>
          <h2
            className={`text-xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            Import YouTube Playlist
          </h2>
          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Enter any public or unlisted YouTube playlist link to create a custom, interactive study track.
          </p>
        </div>

        {/* Import Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className={`text-xs font-semibold ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                Playlist URL or ID
              </label>

              <div className="flex items-center gap-2">
                {detectedType && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    Detected: {detectedType}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                  }`}
                  title="Paste from clipboard"
                >
                  {pasteSuccess ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500">Pasted!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardPaste className="w-3 h-3 text-indigo-500" />
                      <span>Paste Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative">
              <Link2
                className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="https://www.youtube.com/playlist?list=PL..."
                className={`w-full text-xs pl-9 pr-9 py-2.5 rounded-xl border focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono transition-colors ${
                  isDark
                    ? 'bg-zinc-900 text-zinc-200 border-zinc-800 placeholder:text-zinc-600'
                    : 'bg-zinc-50 text-zinc-900 border-zinc-200 placeholder:text-zinc-400'
                }`}
                autoFocus
              />
              {inputUrl && (
                <button
                  type="button"
                  onClick={() => setInputUrl('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Import Error</p>
                <p className="text-[11px] leading-relaxed text-rose-400">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Submit CTA Button */}
          <button
            type="submit"
            disabled={loading || !inputUrl.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching &amp; Parsing Playlist Lectures...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Import &amp; Start Tracking Course</span>
              </>
            )}
          </button>
        </form>

        {/* Supported Link Formats & Tips Toggle */}
        <div
          className={`border-t pt-4 ${
            isDark ? 'border-zinc-800/80' : 'border-zinc-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Supported Link Formats &amp; Tips</span>
          </button>

          {showTips && (
            <div
              className={`mt-3 p-3.5 rounded-xl border text-xs space-y-2 font-mono ${
                isDark
                  ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600'
              }`}
            >
              <div className="space-y-1 text-[11px]">
                <p className="font-sans font-semibold text-zinc-300">Valid Input Examples:</p>
                <div className="p-1.5 rounded bg-black/40 border border-zinc-800 text-indigo-300 truncate">
                  https://www.youtube.com/playlist?list=PLfqMhTWNBTe0b2nM...
                </div>
                <div className="p-1.5 rounded bg-black/40 border border-zinc-800 text-indigo-300 truncate">
                  https://www.youtube.com/watch?v=vLnPwxZdW4Y&amp;list=PL...
                </div>
                <div className="p-1.5 rounded bg-black/40 border border-zinc-800 text-indigo-300 truncate">
                  PLfqMhTWNBTe0b2nM6JHVCnFA44ZKEcxUX
                </div>
              </div>
              <p className="text-[10px] font-sans text-zinc-500 pt-1">
                Tip: Ensure the playlist visibility is set to <strong>Public</strong> or <strong>Unlisted</strong> on YouTube.
              </p>
            </div>
          )}
        </div>

        {/* User's Imported Playlists Management (if any exist) */}
        {savedCourses.length > 0 && (
          <div
            className={`border-t pt-4 space-y-3 ${
              isDark ? 'border-zinc-800/80' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3
                className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>My Imported Courses ({savedCourses.length})</span>
              </h3>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {savedCourses.map((c) => {
                const isActive = c.id === activeCourseId;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isActive
                        ? isDark
                          ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30'
                          : 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300'
                        : isDark
                        ? 'bg-zinc-900/60 border-zinc-800/70 hover:border-zinc-700'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div
                      onClick={() => {
                        if (onSelectCourse) {
                          onSelectCourse(c);
                          onClose();
                        }
                      }}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-2"
                    >
                      <div className="w-12 h-8 rounded bg-zinc-800 relative overflow-hidden shrink-0">
                        <Image
                          src={c.thumbnail || `https://i.ytimg.com/vi/${c.items[0]?.videoId}/hqdefault.jpg`}
                          alt={c.title}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            isActive
                              ? 'text-indigo-400 font-bold'
                              : isDark
                              ? 'text-zinc-200'
                              : 'text-zinc-800'
                          }`}
                        >
                          {c.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {c.channelTitle} • {c.items.length} Lectures
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isActive ? (
                        <span className="text-[10px] font-mono text-emerald-500 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (onSelectCourse) {
                              onSelectCourse(c);
                              onClose();
                            }
                          }}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            isDark
                              ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                              : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700'
                          }`}
                        >
                          Switch
                        </button>
                      )}

                      {onDeleteCourse && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove "${c.title}" from your library?`)) {
                              onDeleteCourse(c.id);
                            }
                          }}
                          className={`p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer`}
                          title="Delete Playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
