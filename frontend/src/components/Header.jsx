import React from 'react';
import { Volume2, VolumeX, Bot, Users, ArrowLeft } from 'lucide-react';

export default function Header({
  soundEnabled,
  setSoundEnabled,
  gameMode = 'BOT', // 'BOT' or 'MULTIPLAYER'
  roomCode = null,
  playerId = null,
  currentView = 'ARENA', // 'LOBBY' or 'ARENA'
  onExitToLobby
}) {
  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-8 py-3 z-20">
      {/* Pill Badge on Left */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-black text-[#b5ff00] font-black text-sm sm:text-base tracking-wider px-4 py-1.5 rounded-full border-2 border-black shadow-[3px_3px_0px_#000]">
          <span>🏏</span>
          <span>HAND CRICKET</span>
        </div>

        {currentView === 'ARENA' && gameMode === 'BOT' && (
          <div className="hidden sm:flex items-center gap-1.5 bg-[#ffe600] text-black font-bold text-xs uppercase px-2.5 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_#000]">
            <Bot size={14} />
            <span>VS BOT AI</span>
          </div>
        )}

        {currentView === 'ARENA' && gameMode === 'MULTIPLAYER' && roomCode && (
          <div className="flex items-center gap-1.5 bg-[#ff66c4] text-black font-black text-xs uppercase px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_#000]">
            <Users size={14} />
            <span>ROOM: {roomCode}</span>
          </div>
        )}
      </div>

      {/* Right controls: Exit to Lobby + Sound Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {currentView === 'ARENA' && onExitToLobby && (
          <button
            onClick={onExitToLobby}
            className="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-wide px-3 py-1.5 rounded-lg border-2 border-black bg-white text-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase"
            title="Leave match and return to Lobby"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">LOBBY</span>
          </button>
        )}

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide px-3.5 py-1.5 rounded-lg border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${
            soundEnabled ? 'bg-[#ffe600] text-black' : 'bg-white text-gray-700'
          }`}
          title="Toggle Sound Effects"
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>SOUND: {soundEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </header>
  );
}
