import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
  colorScheme: 'dark light',
};

export const metadata: Metadata = {
  title: "Study Deck",
  description: "YouTube Playlist progress tracker and study deck with course checklists, notes, streak tracking, and instant stream navigation.",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/logo.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Study Deck",
  },
  openGraph: {
    title: "Study Deck",
    description: "YouTube Playlist progress tracker and study deck.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Study Deck",
    description: "YouTube Playlist progress tracker and study deck.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
