import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, ArrowLeft, Trophy, Frown, CheckCircle } from 'lucide-react';

export default function StatusBanner({
  gameState,         // 'READY', 'COUNTDOWN', 'BALL_RESULT', 'INNINGS_BREAK', 'VICTORY', 'DEFEAT'
  playerScore,
  friendScore,
  target,
  inningsBreakReason, // 'YOU_OUT' or 'FRIEND_OUT'
  rivalryRecord,      // { won: number, lost: number }
  lastBallResult,     // { playerMove, botMove, runs, isOut, text }
  onStartBall,
  onContinueInnings,
  onPlayAgain,
  onResetGame
}) {
  // Fire confetti upon victory!
  useEffect(() => {
    if (gameState === 'VICTORY') {
      try {
        const count = 200;
        const defaults = { origin: { y: 0.7 } };

        function fire(particleRatio, opts) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      } catch (e) {
        console.warn("Confetti error:", e);
      }
    }
  }, [gameState]);

  // 1. COUNTDOWN STATE
  if (gameState === 'COUNTDOWN') {
    return (
      <div className="w-full max-w-2xl mx-auto my-3 px-4">
        <div className="bg-[#ffe600] border-4 border-black rounded-xl p-4 shadow-[6px_6px_0px_#000] text-center animate-pulse">
          <p className="font-black text-sm sm:text-base tracking-wider text-black uppercase">
            ⚡ BALL INCOMING — Hand up in frame. The throw happens on one.
          </p>
        </div>
      </div>
    );
  }

  // 2. INNINGS BREAK STATE
  if (gameState === 'INNINGS_BREAK') {
    const isYouOut = inningsBreakReason === 'YOU_OUT';
    return (
      <div className="w-full max-w-2xl mx-auto my-3 px-4">
        <div className="bg-[#b5ff00] border-4 border-black rounded-xl p-5 shadow-[6px_6px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="bg-black text-[#b5ff00] text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
              INNINGS BREAK
            </span>
            <h3 className="font-black text-lg sm:text-xl text-black mt-1 uppercase">
              {isYouOut ? 'YOU ARE OUT!' : 'FRIEND IS OUT!'}
            </h3>
            <p className="font-bold text-sm text-black/80">
              {isYouOut
                ? `Friend has to chase ${target} runs to win.`
                : `You have to chase ${target} runs to win.`}
            </p>
          </div>

          <button
            onClick={onContinueInnings}
            className="w-full sm:w-auto bg-black text-[#b5ff00] hover:bg-zinc-800 font-black text-base px-6 py-3 rounded-lg border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Play size={18} fill="#b5ff00" />
            <span>CONTINUE</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. VICTORY STATE
  if (gameState === 'VICTORY') {
    return (
      <div className="w-full max-w-2xl mx-auto my-3 px-4">
        <div className="bg-[#b5ff00] border-4 border-black rounded-xl p-6 shadow-[6px_6px_0px_#000] text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={32} className="text-black" />
            <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase">
              YOU WON!
            </h2>
            <Trophy size={32} className="text-black" />
          </div>

          <div className="bg-black text-white px-4 py-2 rounded-lg font-black text-sm sm:text-base my-2 tracking-wide uppercase">
            FINAL SCORE — YOU: {playerScore} | FRIEND: {friendScore}
          </div>

          <p className="font-black text-xs sm:text-sm text-black/80 uppercase tracking-widest mb-4">
            YOUR RECORD VS FRIEND: {rivalryRecord.won} WON, {rivalryRecord.lost} LOST
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              onClick={onPlayAgain}
              className="bg-black text-[#b5ff00] hover:bg-zinc-800 font-black text-base px-6 py-2.5 rounded-lg border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wider flex items-center gap-2"
            >
              <RotateCcw size={18} />
              <span>PLAY AGAIN</span>
            </button>

            <button
              onClick={onResetGame}
              className="bg-white text-black hover:bg-gray-100 font-black text-base px-6 py-2.5 rounded-lg border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wider flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              <span>&larr; BACK</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. DEFEAT STATE
  if (gameState === 'DEFEAT') {
    return (
      <div className="w-full max-w-2xl mx-auto my-3 px-4">
        <div className="bg-[#ff3b5c] border-4 border-black rounded-xl p-6 shadow-[6px_6px_0px_#000] text-center flex flex-col items-center text-white">
          <div className="flex items-center gap-2 mb-1">
            <Frown size={32} />
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">
              YOU LOST!
            </h2>
            <Frown size={32} />
          </div>

          <div className="bg-black text-[#ffe600] px-4 py-2 rounded-lg font-black text-sm sm:text-base my-2 tracking-wide uppercase">
            FINAL SCORE — YOU: {playerScore} | FRIEND: {friendScore}
          </div>

          <p className="font-black text-xs sm:text-sm text-black uppercase tracking-widest mb-4 bg-white/30 px-3 py-1 rounded">
            YOUR RECORD VS FRIEND: {rivalryRecord.won} WON, {rivalryRecord.lost} LOST
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              onClick={onPlayAgain}
              className="bg-black text-[#ffe600] hover:bg-zinc-800 font-black text-base px-6 py-2.5 rounded-lg border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wider flex items-center gap-2"
            >
              <RotateCcw size={18} />
              <span>PLAY AGAIN</span>
            </button>

            <button
              onClick={onResetGame}
              className="bg-white text-black hover:bg-gray-100 font-black text-base px-6 py-2.5 rounded-lg border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wider flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              <span>&larr; BACK</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. BALL RESULT & READY TO THROW STATE
  return (
    <div className="w-full max-w-2xl mx-auto my-3 px-4 flex flex-col items-center gap-3">
      {/* Last Ball Outcome Pill if available */}
      {lastBallResult && (
        <div
          className={`w-full text-center py-2 px-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000] font-black text-sm sm:text-base uppercase tracking-wider ${
            lastBallResult.isOut
              ? 'bg-[#ff3b5c] text-white animate-bounce'
              : 'bg-[#ffe600] text-black'
          }`}
        >
          {lastBallResult.text}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={onStartBall}
        className="w-full sm:w-auto bg-black text-[#b5ff00] hover:bg-zinc-900 font-black text-lg sm:text-xl px-10 py-3.5 rounded-2xl border-4 border-black shadow-[6px_6px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase tracking-wider flex items-center justify-center gap-3 cursor-pointer"
      >
        <span>🏏</span>
        <span>START NEXT BALL (3-2-1)</span>
        <span>⚡</span>
      </button>
    </div>
  );
}
