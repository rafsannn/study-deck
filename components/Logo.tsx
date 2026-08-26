'use client';

import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function AppLogo({ className = 'w-9 h-9', size = 40, showText = false }: AppLogoProps) {
  const svgElement = (
    <svg
      width={size}
      height={size}
      viewBox="-6 -7 284 284"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="backCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id="midCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="frontCardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="rGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* 1st Card (Back - Dark Purple) */}
      <rect
        x="32"
        y="28"
        width="160"
        height="225"
        rx="32"
        fill="url(#backCardGrad)"
        transform="rotate(-13 112 140)"
      />

      {/* 2nd Card (Middle - Indigo Blue) */}
      <rect
        x="58"
        y="22"
        width="160"
        height="225"
        rx="32"
        fill="url(#midCardGrad)"
        transform="rotate(-6 138 135)"
      />

      {/* 3rd Card (Front - Dark Card with Neon Green Border) */}
      <rect
        x="92"
        y="22"
        width="170"
        height="230"
        rx="36"
        fill="#09090b"
        stroke="url(#frontCardBorder)"
        strokeWidth="10"
      />

      {/* Stylized 'R' Logo with Play Cutout */}
      <g transform="translate(102, 42)">
        {/* Main 'R' Shape */}
        <path
          d="M 20 12 
             H 76 
             C 108 12, 122 30, 122 55 
             C 122 80, 106 98, 74 98 
             H 48 
             V 108 
             L 112 174 
             H 78 
             L 20 112 
             Z"
          fill="url(#rGrad)"
        />

        {/* Play Icon Triangle Cutout in top loop of 'R' */}
        <polygon points="50,34 50,74 84,54" fill="#09090b" />

        {/* Code symbol </ > */}
        <g transform="translate(24, 126)" stroke="#818cf8" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* < */}
          <path d="M 20 14 L 6 25 L 20 36" />
          {/* / */}
          <path d="M 36 10 L 26 40" />
          {/* > */}
          <path d="M 42 14 L 56 25 L 42 36" />
        </g>
      </g>
    </svg>
  );

  if (!showText) {
    return svgElement;
  }

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {svgElement}
      <div className="flex items-center gap-1.5 font-bold tracking-widest text-sm uppercase">
        <span className="text-emerald-400 font-extrabold">RAFSAN&apos;S</span>
        <span className="text-indigo-400 font-extrabold">STUDY DECK</span>
      </div>
    </div>
  );
}
