import React, { useState } from 'react';
import { Users, Bot, Copy, Check, ArrowRight, Play, Sparkles, AlertCircle } from 'lucide-react';

export default function Lobby({
  onCreateRoom,
  onJoinRoom,
  onPlayVsBot,
  createdRoomCode,
  isWaitingForFriend,
  errorMessage,
  isConnecting
}) {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (joinCode.trim().length >= 4) {
      onJoinRoom(joinCode.trim().toUpperCase());
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 z-10 select-none">
      {/* Title Card */}
      <div className="bg-black text-[#b5ff00] border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_#000] text-center mb-6">
        <div className="inline-block bg-[#ffe600] text-black font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest mb-2 border-2 border-black">
          MULTIPLAYER & VISION AI
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase flex items-center justify-center gap-2">
          <span>🏏</span>
          <span>HAND CRICKET</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 font-bold mt-2 uppercase tracking-wider">
          Play using real webcam gestures (1–6) powered by MediaPipe AI
        </p>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="bg-[#ff3b5c] text-white border-4 border-black rounded-xl p-3.5 mb-5 shadow-[4px_4px_0px_#000] flex items-center gap-2 font-black text-sm uppercase">
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Waiting for Friend state if room is created */}
      {isWaitingForFriend && createdRoomCode ? (
        <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_#000] text-center mb-6 animate-brutal-pulse">
          <span className="bg-[#ffe600] text-black font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider border-2 border-black">
            ROOM CREATED • SHARE WITH FRIEND
          </span>

          <div className="my-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
              YOUR 4-LETTER ROOM CODE:
            </p>
            <div className="bg-black text-[#b5ff00] font-mono text-5xl sm:text-6xl font-black py-4 px-6 rounded-2xl border-4 border-black tracking-[0.25em] shadow-[4px_4px_0px_#ff66c4] inline-block">
              {createdRoomCode}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleCopyCode}
              className="bg-[#ffe600] hover:bg-yellow-300 text-black font-black text-sm px-5 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-[2px] transition-all flex items-center gap-2 uppercase"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? 'COPIED!' : 'COPY CODE'}</span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-black text-gray-700 tracking-wider uppercase">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-ping"></span>
            <span>Waiting for Friend to enter the code...</span>
          </div>
        </div>
      ) : (
        /* 3 Main Lobby Options */
        <div className="flex flex-col gap-4">
          {/* Option A: Create Room */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <h3 className="font-black text-lg sm:text-xl uppercase text-black">
                  Create Room
                </h3>
              </div>
              <span className="bg-[#ff66c4] text-black text-[10px] font-black px-2 py-0.5 rounded border border-black uppercase">
                HOST 2-PLAYER
              </span>
            </div>
            <p className="text-xs text-gray-600 font-bold mb-4">
              Get a 4-letter room code to play live 1v1 with your friend and stream webcam video peer-to-peer.
            </p>
            <button
              onClick={onCreateRoom}
              disabled={isConnecting}
              className="w-full bg-[#ffe600] hover:bg-yellow-300 text-black font-black text-base py-3 px-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <Users size={20} />
              <span>{isConnecting ? 'CREATING ROOM...' : 'CREATE ROOM (PLAY WITH FRIEND)'}</span>
            </button>
          </div>

          {/* Option B: Join Room */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔑</span>
                <h3 className="font-black text-lg sm:text-xl uppercase text-black">
                  Join Room
                </h3>
              </div>
              <span className="bg-[#b5ff00] text-black text-[10px] font-black px-2 py-0.5 rounded border border-black uppercase">
                GUEST
              </span>
            </div>
            <p className="text-xs text-gray-600 font-bold mb-3">
              Enter your friend's 4-letter code to join their cricket pitch arena.
            </p>
            <form onSubmit={handleJoinSubmit} className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="flex-1 bg-gray-100 font-mono text-center text-lg font-black tracking-widest px-4 py-2.5 rounded-xl border-2 border-black focus:outline-none focus:bg-white uppercase placeholder:text-gray-400 placeholder:normal-case placeholder:font-sans placeholder:text-xs"
              />
              <button
                type="submit"
                disabled={joinCode.trim().length < 4 || isConnecting}
                className="bg-black hover:bg-zinc-800 disabled:opacity-50 text-[#b5ff00] font-black text-sm px-6 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1.5 uppercase cursor-pointer"
              >
                <span>JOIN</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Option C: Play vs AI Bot */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000] transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <h3 className="font-black text-lg sm:text-xl uppercase text-black">
                  Practice vs AI Bot
                </h3>
              </div>
              <span className="bg-black text-[#ffe600] text-[10px] font-black px-2 py-0.5 rounded uppercase">
                SOLO OFFLINE
              </span>
            </div>
            <p className="text-xs text-gray-600 font-bold mb-4">
              Test your hand gestures and play solo against the computer.
            </p>
            <button
              onClick={onPlayVsBot}
              className="w-full bg-[#1a1a1a] hover:bg-black text-white font-black text-base py-3 px-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <Bot size={20} className="text-[#ff66c4]" />
              <span>PLAY VS AI BOT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
