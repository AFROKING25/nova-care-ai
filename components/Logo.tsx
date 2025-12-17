
import React from 'react';

export const Logo: React.FC<{ className?: string; size?: number }> = ({ className = "", size = 40 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
        <defs>
          <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="logo-gradient" stopColor="currentColor" />
            <stop offset="100%" className="logo-gradient-end" stopColor="currentColor" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Heart Path */}
        <path 
          d="M50 85C50 85 10 60 10 35C10 20 25 10 40 20C45 23 50 30 50 30C50 30 55 23 60 20C75 10 90 20 90 35C90 60 50 85 50 85Z" 
          fill="url(#heartGradient)" 
          opacity="0.85"
        />
        {/* Inner Arc for Depth */}
        <path 
          d="M25 35C25 45 35 55 50 65" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.3"
        />
        {/* Center Star Flare */}
        <circle cx="50" cy="40" r="12" fill="white" opacity="0.2" filter="url(#glow)" />
        <circle cx="50" cy="40" r="4" fill="white" filter="url(#glow)" />
        <line x1="50" y1="28" x2="50" y2="52" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="38" y1="40" x2="62" y2="40" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};
