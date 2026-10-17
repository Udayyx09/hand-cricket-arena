import React from 'react';

export default function Scoreboard({
  playerScore,
  friendScore,
  playerIsBatting,
  innings, // 1 or 2
  target,  // null or number
  playerOut,
  friendOut,
  recentBalls = []
}) {
  // Target status text calculation
  let targetStatusText = '1ST INNINGS';
  if (innings === 2 && target !== null) {
    if (playerIsBatting) {
      const needed = Math.max(0, target - playerScore);
      targetStatusText = `YOU NEED ${needed} RUNS TO WIN (TARGET: ${target})`;
    } else {
      const needed = Math.max(0, target - friendScore);
      targetStatusText = `FRIEND NEEDS ${needed} RUNS TO WIN (TARGET: ${target})`;
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto bg-[#1a1a1a] text-white border-4 border-black rounded-xl shadow-[6px_6px_0px_#000] overflow-hidden my-2 select-none">
      {/* Two columns: YOU & FRIEND */}
      <div className="grid grid-cols-2 divide-x-4 divide-black">
        {/* YOU column */}
        <div className={`p-3 sm:p-4 text-center transition-colors ${playerIsBatting ? 'bg-[#222222]' : 'bg-[#1a1a1a]'}`}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-base sm:text-lg">{playerIsBatting ? '🏏' : '⚾'}</span>
            <span className="font-black text-xs sm:text-sm tracking-widest text-[#ffe600]">
              YOU {playerIsBatting ? '(BATTING)' : '(BOWLING)'}
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#ffe600]">
              {playerScore}
            </span>
            {playerOut && (
              <span className="text-xs bg-[#ff3b5c] text-white font-black px-1.5 py-0.5 rounded border border-black uppercase animate-bounce">
                OUT
              </span>
            )}
          </div>
        </div>

        {/* FRIEND column */}
        <div className={`p-3 sm:p-4 text-center transition-colors ${!playerIsBatting ? 'bg-[#222222]' : 'bg-[#1a1a1a]'}`}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-base sm:text-lg">{!playerIsBatting ? '🏏' : '⚾'}</span>
            <span className="font-black text-xs sm:text-sm tracking-widest text-[#ff66c4]">
              FRIEND {!playerIsBatting ? '(BATTING)' : '(BOWLING)'}
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#ff66c4]">
              {friendScore}
            </span>
            {friendOut && (
              <span className="text-xs bg-[#ff3b5c] text-white font-black px-1.5 py-0.5 rounded border border-black uppercase animate-bounce">
                OUT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recent balls timeline */}
      {recentBalls.length > 0 && (
        <div className="bg-[#111111] px-4 py-1.5 flex items-center justify-center gap-2 border-t-2 border-black/40 overflow-x-auto text-xs">
          <span className="text-gray-400 font-bold text-[10px] tracking-wider uppercase">THIS OVER:</span>
          {recentBalls.slice(-6).map((ball, idx) => (
            <span
              key={idx}
              className={`w-6 h-6 flex items-center justify-center rounded-full font-black text-xs border border-black shadow-[1px_1px_0px_#000] ${
                ball === 'OUT'
                  ? 'bg-[#ff3b5c] text-white'
                  : ball === 6
                  ? 'bg-[#ffe600] text-black'
                  : ball === 4
                  ? 'bg-[#00e5ff] text-black'
                  : 'bg-white text-black'
              }`}
            >
              {ball}
            </span>
          ))}
        </div>
      )}

      {/* Bottom strip showing target status */}
      <div className="bg-black py-2 px-3 text-center border-t-4 border-black">
        <p className="text-xs sm:text-sm font-black tracking-widest uppercase text-[#b5ff00]">
          ⚡ {targetStatusText} ⚡
        </p>
      </div>
    </div>
  );
}
