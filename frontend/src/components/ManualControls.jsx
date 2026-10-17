import React from 'react';

const moves = [
  { num: 1, label: '1 (Index)', emoji: '☝️' },
  { num: 2, label: '2 (Peace)', emoji: '✌️' },
  { num: 3, label: '3 (Fingers)', emoji: '🤟' },
  { num: 4, label: '4 (Fingers)', emoji: '🖖' },
  { num: 5, label: '5 (Palm)', emoji: '✋' },
  { num: 6, label: '6 (Thumbs Up)', emoji: '👍' },
];

export default function ManualControls({ onSelectManualMove, disabled = false, selectedMove }) {
  return (
    <div className="w-full max-w-xl mx-auto px-4 mt-1 mb-4">
      <div className="bg-black/90 p-3 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] text-center">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black uppercase text-[#ffe600] tracking-wider">
            🖐️ Quick Number Override (1–6)
          </span>
          <span className="text-[10px] text-gray-300 font-mono">
            Webcam auto-detects, or tap to test:
          </span>
        </div>

        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {moves.map(({ num, label, emoji }) => {
            const isSelected = selectedMove === num;
            return (
              <button
                key={num}
                type="button"
                disabled={disabled}
                onClick={() => onSelectManualMove(num)}
                className={`py-2 px-1 rounded-lg border-2 border-black font-black text-xs sm:text-sm flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#ffe600] text-black scale-105 shadow-[2px_2px_0px_#fff]'
                    : 'bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_#000]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:translate-y-[1px]'}`}
                title={label}
              >
                <span className="text-base sm:text-lg">{emoji}</span>
                <span className="font-mono text-xs">{num}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
