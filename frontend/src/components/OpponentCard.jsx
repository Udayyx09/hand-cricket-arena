import React, { useRef, useEffect } from 'react';
import { Bot, User, Video, VideoOff } from 'lucide-react';

const gestureEmojiMap = {
  1: '☝️',
  2: '✌️',
  3: '🤟',
  4: '🖖',
  5: '✋',
  6: '👍',
};

export default function OpponentCard({
  playerIsBatting,
  countdown,          // 3, 2, 1, 0, or null
  opponentMove,       // 1 to 6, or null
  isBot = true,
  lastOutcome,        // e.g. 'RUNS', 'OUT', null
  remoteStream = null // incoming WebRTC stream
}) {
  const remoteVideoRef = useRef(null);
  const isSightScreenUp = countdown !== null && countdown > 0;

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(e => console.warn("Remote video auto-play prevented:", e));
    }
  }, [remoteStream]);

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full max-w-[340px] sm:max-w-[400px] bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000] overflow-hidden flex flex-col">
        {/* Pink Header */}
        <div className="bg-[#ff66c4] border-b-4 border-black px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{!playerIsBatting ? '🏏' : '⚾'}</span>
            <span className="font-black text-sm sm:text-base tracking-wider text-black uppercase">
              {!playerIsBatting ? '🏏 FRIEND (BATTING)' : '⚾ FRIEND (BOWLING)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-black text-[#ff66c4] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
            {isBot ? <Bot size={12} /> : <User size={12} />}
            <span>{isBot ? 'AI BOT' : (remoteStream ? 'LIVE P2P' : 'FRIEND')}</span>
          </div>
        </div>

        {/* Aspect Square Card Area */}
        <div className="relative aspect-square w-full bg-[#1e1e1e] overflow-hidden flex items-center justify-center select-none">
          {/* 1. Live Remote Video Stream (if in multiplayer mode) */}
          {!isBot && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
          ) : !isBot && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-[#161616]">
              <Video size={44} className="text-[#ff66c4] mb-2 animate-pulse" />
              <p className="font-black text-xs sm:text-sm text-gray-200 uppercase tracking-wider">
                FRIEND CONNECTED
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Video syncs on throw
              </p>
            </div>
          )}

          {/* 2. Revealed Move Content Overlay (Under the Sightscreen) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 transition-opacity duration-300 ${isSightScreenUp ? 'opacity-0' : 'opacity-100'}`}>
            {opponentMove ? (
              <div className="flex flex-col items-center animate-brutal-pulse bg-black/75 p-4 rounded-2xl border-2 border-white/30 backdrop-blur-sm">
                <div className="text-6xl sm:text-7xl mb-1 drop-shadow-[4px_4px_0px_#000]">
                  {gestureEmojiMap[opponentMove] || '✊'}
                </div>
                <div className="bg-[#ff66c4] text-black font-black text-2xl sm:text-3xl px-5 py-1.5 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]">
                  THREW {opponentMove}
                </div>
                <p className="mt-2 text-xs font-bold text-white tracking-wider uppercase">
                  {!playerIsBatting ? `Scoring ${opponentMove} runs!` : `Bowling ${opponentMove}!`}
                </p>
              </div>
            ) : isBot ? (
              <div className="flex flex-col items-center text-gray-400">
                <div className="w-20 h-20 rounded-full bg-[#111] border-4 border-black flex items-center justify-center mb-2">
                  <Bot size={44} className="text-[#ff66c4] animate-pulse" />
                </div>
                <p className="font-black text-xs text-gray-300 tracking-wider uppercase">
                  READY FOR NEXT BALL
                </p>
              </div>
            ) : null}
          </div>

          {/* 3. Lined-paper SIGHTSCREEN Overlay */}
          {/* Covers the card completely during countdown (3, 2, 1) */}
          <div
            className={`absolute inset-0 z-20 sightscreen-paper border-b-4 border-black flex flex-col items-center justify-between p-6 transition-all duration-300 ease-in-out ${
              isSightScreenUp
                ? 'translate-y-0 opacity-100 shadow-[0_10px_0px_rgba(0,0,0,0.4)]'
                : '-translate-y-full opacity-0 pointer-events-none'
            }`}
          >
            {/* Top sightscreen title */}
            <div className="w-full flex items-center justify-between border-b-2 border-black/20 pb-2">
              <span className="font-mono text-[11px] font-black tracking-widest text-black/70 uppercase">
                CRICKET SIGHTSCREEN
              </span>
              <span className="bg-black text-[#ffe600] font-black text-[10px] px-2 py-0.5 rounded uppercase">
                HIDDEN
              </span>
            </div>

            {/* Center prompt */}
            <div className="bg-black text-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_#ff66c4] text-center max-w-xs rotate-[-1deg]">
              <div className="text-2xl mb-1">🏏 🔒 ⚾</div>
              <p className="font-black text-sm sm:text-base tracking-wider text-[#ffe600] uppercase">
                SIGHTSCREEN
              </p>
              <p className="text-xs font-bold text-gray-200 mt-1 uppercase tracking-wide">
                UP UNTIL THE THROW
              </p>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-mono text-gray-400">
                <span>REVEALING ON 0</span>
              </div>
            </div>

            {/* Bottom watermark */}
            <div className="w-full text-center">
              <span className="text-[10px] font-black tracking-widest text-black/50 uppercase">
                NO PEEKING BEFORE THROW LOCKS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
