import React from 'react';

export default function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {/* Top crease and stumps */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-60">
        {/* Bowling Crease */}
        <div className="w-48 h-1 bg-black/40 rounded-full mb-1"></div>
        {/* 3 Stumps & Bails */}
        <div className="flex gap-1.5 items-end">
          <div className="w-1.5 h-6 bg-black/70 rounded-t"></div>
          <div className="w-1.5 h-7 bg-black/80 rounded-t"></div>
          <div className="w-1.5 h-6 bg-black/70 rounded-t"></div>
        </div>
        {/* Popping Crease */}
        <div className="w-64 h-1 bg-black/40 rounded-full mt-1"></div>
      </div>

      {/* Bottom crease and stumps */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-60">
        {/* Popping Crease */}
        <div className="w-64 h-1 bg-black/40 rounded-full mb-1"></div>
        {/* 3 Stumps & Bails */}
        <div className="flex gap-1.5 items-end">
          <div className="w-1.5 h-6 bg-black/70 rounded-t"></div>
          <div className="w-1.5 h-7 bg-black/80 rounded-t"></div>
          <div className="w-1.5 h-6 bg-black/70 rounded-t"></div>
        </div>
        {/* Bowling Crease */}
        <div className="w-48 h-1 bg-black/40 rounded-full mt-1"></div>
      </div>
    </div>
  );
}
