import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import PitchMarkings from './components/PitchMarkings';
import Scoreboard from './components/Scoreboard';
import WebcamCard from './components/WebcamCard';
import OpponentCard from './components/OpponentCard';
import StatusBanner from './components/StatusBanner';
import ManualControls from './components/ManualControls';
import Lobby from './components/Lobby';
import { useMultiplayer } from './hooks/useMultiplayer';
import { playSound } from './utils/audio';

export default function App() {
  // Navigation & Game Mode
  const [currentView, setCurrentView] = useState('LOBBY'); // 'LOBBY' | 'ARENA'
  const [gameMode, setGameMode] = useState('BOT');         // 'BOT' | 'MULTIPLAYER'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const localStreamRef = useRef(null);

  const handleToggleMic = () => {
    setMicEnabled(prev => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = next;
        });
      }
      playSound('click', soundEnabledRef.current);
      return next;
    });
  };

  // Bot Mode: Rivalry record in localStorage
  const [botRivalryRecord, setBotRivalryRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('hand_cricket_rivalry');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return { won: 0, lost: 0 };
  });

  // Bot Mode: Local Game state
  // States: 'READY', 'COUNTDOWN', 'BALL_RESULT', 'INNINGS_BREAK', 'VICTORY', 'DEFEAT'
  const [botGameState, setBotGameState] = useState('READY');
  const [botCountdown, setBotCountdown] = useState(null); // 3, 2, 1, or null
  const [botInnings, setBotInnings] = useState(1);
  const [botPlayerIsBatting, setBotPlayerIsBatting] = useState(true);
  const [botPlayerScore, setBotPlayerScore] = useState(0);
  const [botFriendScore, setBotFriendScore] = useState(0);
  const [botTarget, setBotTarget] = useState(null);
  const [botPlayerOut, setBotPlayerOut] = useState(false);
  const [botFriendOut, setBotFriendOut] = useState(false);
  const [botInningsBreakReason, setBotInningsBreakReason] = useState(null);
  const [botRecentBalls, setBotRecentBalls] = useState([]);

  // Common gesture & move state
  const [currentGesture, setCurrentGesture] = useState({ number: null, label: 'READY', emoji: '❓' });
  const [lockedPlayerMove, setLockedPlayerMove] = useState(null);
  const [opponentMove, setOpponentMove] = useState(null);
  const [lastBallResult, setLastBallResult] = useState(null);
  const [manualOverrideMove, setManualOverrideMove] = useState(null);

  // Stale closure prevention refs
  const latestGestureRef = useRef(0);
  const manualOverrideRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const botPlayerIsBattingRef = useRef(botPlayerIsBatting);
  botPlayerIsBattingRef.current = botPlayerIsBatting;
  const botInningsRef = useRef(botInnings);
  botInningsRef.current = botInnings;
  const botPlayerScoreRef = useRef(botPlayerScore);
  botPlayerScoreRef.current = botPlayerScore;
  const botFriendScoreRef = useRef(botFriendScore);
  botFriendScoreRef.current = botFriendScore;
  const botTargetRef = useRef(botTarget);
  botTargetRef.current = botTarget;

  const botCountdownIntervalRef = useRef(null);

  // Multiplayer Hook Callbacks
  const handleMultiplayerCountdownTick = (count) => {
    if (count === 3) {
      setLockedPlayerMove(null);
      setOpponentMove(null);
      setLastBallResult(null);
    }
    if (count > 0) {
      playSound('tick', soundEnabledRef.current);
    }
  };

  const handleMultiplayerThrowTrigger = () => {
    playSound('throw', soundEnabledRef.current);

    // Read smoothed gesture or single-ball manual override
    let pMove = manualOverrideRef.current;
    if (!pMove && latestGestureRef.current >= 1 && latestGestureRef.current <= 6) {
      pMove = latestGestureRef.current;
    }
    if (!pMove) {
      pMove = Math.floor(Math.random() * 4) + 1;
    }

    // Freeze locked move immediately on local client
    setLockedPlayerMove(pMove);
    manualOverrideRef.current = null;
    setManualOverrideMove(null);

    // Submit move to Spring Boot STOMP endpoint
    multiplayer.submitMove(pMove);
  };

  const handleMultiplayerBallResolved = (state) => {
    const isP1 = (multiplayer.myPlayerId === state.playerOneId);
    const amIBatting = (state.batterId === multiplayer.myPlayerId);

    // Exact moves from server payload
    let myFinalMove = isP1 ? state.playerOneLastMove : state.playerTwoLastMove;
    let oppFinalMove = isP1 ? state.playerTwoLastMove : state.playerOneLastMove;

    if (state.lastBallOutcome) {
      myFinalMove = amIBatting ? state.lastBallOutcome.batterMove : state.lastBallOutcome.bowlerMove;
      oppFinalMove = amIBatting ? state.lastBallOutcome.bowlerMove : state.lastBallOutcome.batterMove;
    }

    setLockedPlayerMove(myFinalMove);
    setOpponentMove(oppFinalMove);

    if (state.lastBallOutcome) {
      setLastBallResult({
        playerMove: myFinalMove,
        botMove: oppFinalMove,
        runs: state.lastBallOutcome.runsScored,
        isOut: state.lastBallOutcome.isOut,
        text: state.lastBallOutcome.outcomeMessage
      });

      if (state.lastBallOutcome.isOut) {
        playSound('out', soundEnabledRef.current);
      } else {
        playSound('bat_hit', soundEnabledRef.current);
      }
    }
  };

  const handleMultiplayerInningsBreak = (state) => {
    playSound('out', soundEnabledRef.current);
  };

  const handleMultiplayerMatchOver = (state) => {
    if (state.winnerId === multiplayer.myPlayerId) {
      playSound('win', soundEnabledRef.current);
    } else {
      playSound('lose', soundEnabledRef.current);
    }
  };

  // Initialize useMultiplayer hook
  const multiplayer = useMultiplayer({
    onCountdownTick: handleMultiplayerCountdownTick,
    onThrowTrigger: handleMultiplayerThrowTrigger,
    onBallResolved: handleMultiplayerBallResolved,
    onInningsBreak: handleMultiplayerInningsBreak,
    onMatchOver: handleMultiplayerMatchOver
  });

  // Auto-transition to Arena when friend connects
  useEffect(() => {
    if (currentView === 'LOBBY' && multiplayer.serverState?.playerTwoId) {
      setCurrentView('ARENA');
      playSound('win', soundEnabledRef.current);
    }
  }, [currentView, multiplayer.serverState?.playerTwoId]);

  // --- LOBBY HANDLERS ---
  const handleCreateRoom = async () => {
    try {
      setGameMode('MULTIPLAYER');
      await multiplayer.createRoom();
      // Stay in Lobby until friend joins
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = async (code) => {
    try {
      setGameMode('MULTIPLAYER');
      await multiplayer.joinRoom(code);
      setCurrentView('ARENA');
      playSound('click', soundEnabledRef.current);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlayVsBot = () => {
    setGameMode('BOT');
    resetBotGame();
    setCurrentView('ARENA');
    playSound('click', soundEnabledRef.current);
  };

  const handleExitToLobby = () => {
    if (gameMode === 'MULTIPLAYER') {
      multiplayer.disconnect();
    }
    if (botCountdownIntervalRef.current) clearInterval(botCountdownIntervalRef.current);
    setCurrentView('LOBBY');
    setLockedPlayerMove(null);
    setOpponentMove(null);
    setLastBallResult(null);
    setManualOverrideMove(null);
    manualOverrideRef.current = null;
    playSound('click', soundEnabledRef.current);
  };

  // --- BOT SINGLE-PLAYER GAME LOOP ---
  const updateBotRivalry = (result) => {
    setBotRivalryRecord(prev => {
      const updated = {
        won: result === 'WIN' ? prev.won + 1 : prev.won,
        lost: result === 'LOSE' ? prev.lost + 1 : prev.lost,
      };
      try {
        localStorage.setItem('hand_cricket_rivalry', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const startBotBall = () => {
    if (botGameState === 'COUNTDOWN') return;

    manualOverrideRef.current = null;
    setManualOverrideMove(null);
    setLockedPlayerMove(null);
    setOpponentMove(null);
    setLastBallResult(null);

    setBotGameState('COUNTDOWN');
    setBotCountdown(3);
    playSound('tick', soundEnabledRef.current);

    let currentCount = 3;
    if (botCountdownIntervalRef.current) clearInterval(botCountdownIntervalRef.current);

    botCountdownIntervalRef.current = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setBotCountdown(currentCount);
        playSound('tick', soundEnabledRef.current);
      } else {
        clearInterval(botCountdownIntervalRef.current);
        setBotCountdown(null);
        handleBotThrowLockIn();
      }
    }, 1000);
  };

  const handleBotThrowLockIn = () => {
    const isSound = soundEnabledRef.current;
    playSound('throw', isSound);

    let pMove = manualOverrideRef.current;
    if (!pMove && latestGestureRef.current >= 1 && latestGestureRef.current <= 6) {
      pMove = latestGestureRef.current;
    }
    if (!pMove) {
      pMove = Math.floor(Math.random() * 4) + 1;
    }

    manualOverrideRef.current = null;
    setManualOverrideMove(null);
    setLockedPlayerMove(pMove);

    const bMove = Math.floor(Math.random() * 6) + 1;
    setOpponentMove(bMove);

    const isOut = pMove === bMove;
    const isBatting = botPlayerIsBattingRef.current;
    const curInnings = botInningsRef.current;
    const curPlayerScore = botPlayerScoreRef.current;
    const curFriendScore = botFriendScoreRef.current;
    const curTarget = botTargetRef.current;

    if (isBatting) {
      if (isOut) {
        playSound('out', isSound);
        setBotRecentBalls(prev => [...prev, 'OUT']);
        setLastBallResult({
          playerMove: pMove,
          botMove: bMove,
          runs: 0,
          isOut: true,
          text: `💥 OUT! Both threw ${pMove}. Your batting innings ends.`
        });

        if (curInnings === 1) {
          setBotPlayerOut(true);
          const newTarget = curPlayerScore + 1;
          setBotTarget(newTarget);
          setBotInningsBreakReason('YOU_OUT');
          setBotGameState('INNINGS_BREAK');
        } else {
          setBotPlayerOut(true);
          if (curPlayerScore >= curTarget) {
            playSound('win', isSound);
            updateBotRivalry('WIN');
            setBotGameState('VICTORY');
          } else {
            playSound('lose', isSound);
            updateBotRivalry('LOSE');
            setBotGameState('DEFEAT');
          }
        }
      } else {
        playSound('bat_hit', isSound);
        const runsScored = pMove;
        const newPlayerScore = curPlayerScore + runsScored;
        setBotPlayerScore(newPlayerScore);
        setBotRecentBalls(prev => [...prev, runsScored]);

        if (curInnings === 2 && curTarget !== null && newPlayerScore >= curTarget) {
          setLastBallResult({
            playerMove: pMove,
            botMove: bMove,
            runs: runsScored,
            isOut: false,
            text: `🔥 +${runsScored} RUNS! (You: ${pMove}, Friend: ${bMove}) — Target reached!`
          });
          playSound('win', isSound);
          updateBotRivalry('WIN');
          setBotGameState('VICTORY');
        } else {
          setLastBallResult({
            playerMove: pMove,
            botMove: bMove,
            runs: runsScored,
            isOut: false,
            text: `🏏 +${runsScored} RUNS! You threw ${pMove}, Friend bowled ${bMove}.`
          });
          setBotGameState('READY');
        }
      }
    } else {
      if (isOut) {
        playSound('out', isSound);
        setBotRecentBalls(prev => [...prev, 'OUT']);
        setLastBallResult({
          playerMove: pMove,
          botMove: bMove,
          runs: 0,
          isOut: true,
          text: `🎯 WICKET! Both threw ${pMove}. Friend is OUT!`
        });

        if (curInnings === 1) {
          setBotFriendOut(true);
          const newTarget = curFriendScore + 1;
          setBotTarget(newTarget);
          setBotInningsBreakReason('FRIEND_OUT');
          setBotGameState('INNINGS_BREAK');
        } else {
          setBotFriendOut(true);
          if (curFriendScore >= curTarget) {
            playSound('lose', isSound);
            updateBotRivalry('LOSE');
            setBotGameState('DEFEAT');
          } else {
            playSound('win', isSound);
            updateBotRivalry('WIN');
            setBotGameState('VICTORY');
          }
        }
      } else {
        playSound('bat_hit', isSound);
        const runsScored = bMove;
        const newFriendScore = curFriendScore + runsScored;
        setBotFriendScore(newFriendScore);
        setBotRecentBalls(prev => [...prev, runsScored]);

        if (curInnings === 2 && curTarget !== null && newFriendScore >= curTarget) {
          setLastBallResult({
            playerMove: pMove,
            botMove: bMove,
            runs: runsScored,
            isOut: false,
            text: `💥 Friend scored ${runsScored} (Target crossed).`
          });
          playSound('lose', isSound);
          updateBotRivalry('LOSE');
          setBotGameState('DEFEAT');
        } else {
          setLastBallResult({
            playerMove: pMove,
            botMove: bMove,
            runs: runsScored,
            isOut: false,
            text: `⚾ Friend scored ${runsScored} runs (You bowled ${pMove}, Friend hit ${bMove}).`
          });
          setBotGameState('READY');
        }
      }
    }
  };

  const continueBotInnings = () => {
    playSound('click', soundEnabledRef.current);
    setBotInnings(2);
    setBotPlayerIsBatting(!botPlayerIsBatting);
    setBotRecentBalls([]);
    setLockedPlayerMove(null);
    setOpponentMove(null);
    setLastBallResult(null);
    manualOverrideRef.current = null;
    setManualOverrideMove(null);
    setBotGameState('READY');
  };

  const resetBotGame = () => {
    playSound('click', soundEnabledRef.current);
    if (botCountdownIntervalRef.current) clearInterval(botCountdownIntervalRef.current);
    setBotGameState('READY');
    setBotCountdown(null);
    setBotInnings(1);
    setBotPlayerIsBatting(true);
    setBotPlayerScore(0);
    setBotFriendScore(0);
    setBotTarget(null);
    setBotPlayerOut(false);
    setBotFriendOut(false);
    setBotInningsBreakReason(null);
    setBotRecentBalls([]);
    setLockedPlayerMove(null);
    setOpponentMove(null);
    setLastBallResult(null);
    manualOverrideRef.current = null;
    setManualOverrideMove(null);
    latestGestureRef.current = 0;
  };

  // Manual Quick Number Override Button
  const handleSelectManualMove = (num) => {
    manualOverrideRef.current = num;
    setManualOverrideMove(num);
    latestGestureRef.current = num;
    setCurrentGesture({ number: num, label: `MANUAL ${num}`, emoji: '✋' });
    playSound('click', soundEnabledRef.current);
  };

  // --- DERIVE ACTIVE GAME VALUES ---
  let isBattingActive = botPlayerIsBatting;
  let activePlayerScore = botPlayerScore;
  let activeFriendScore = botFriendScore;
  let activeInnings = botInnings;
  let activeTarget = botTarget;
  let activePlayerOut = botPlayerOut;
  let activeFriendOut = botFriendOut;
  let activeInningsBreakReason = botInningsBreakReason;
  let activeGameState = botGameState;
  let activeCountdown = botCountdown;
  let activeRivalry = botRivalryRecord;

  if (gameMode === 'MULTIPLAYER' && multiplayer.serverState) {
    const s = multiplayer.serverState;
    const isP1 = multiplayer.isHost;

    isBattingActive = (s.batterId === multiplayer.myPlayerId);
    activePlayerScore = isP1 ? s.playerOneScore : s.playerTwoScore;
    activeFriendScore = isP1 ? s.playerTwoScore : s.playerOneScore;
    activeInnings = s.innings || 1;
    activeTarget = s.target;
    activePlayerOut = isP1 ? s.playerOneOut : s.playerTwoOut;
    activeFriendOut = isP1 ? s.playerTwoOut : s.playerOneOut;

    activeRivalry = {
      won: isP1 ? (s.p1Won || 0) : (s.p2Won || 0),
      lost: isP1 ? (s.p1Lost || 0) : (s.p2Lost || 0)
    };

    if (s.eventType === 'BALL_COUNTDOWN') {
      activeGameState = 'COUNTDOWN';
      activeCountdown = s.countdown > 0 ? s.countdown : null;
    } else if (s.eventType === 'INNINGS_BREAK') {
      activeGameState = 'INNINGS_BREAK';
      activeInningsBreakReason = activePlayerOut ? 'YOU_OUT' : 'FRIEND_OUT';
      activeCountdown = null;
    } else if (s.eventType === 'MATCH_OVER') {
      activeGameState = (s.winnerId === multiplayer.myPlayerId) ? 'VICTORY' : 'DEFEAT';
      activeCountdown = null;
    } else if (s.eventType === 'BALL_RESULT') {
      activeGameState = 'BALL_RESULT';
      activeCountdown = null;
    } else {
      activeGameState = 'READY';
      activeCountdown = null;
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#b5ff00] pitch-grid relative flex flex-col justify-between overflow-x-hidden">
      {/* Cricket Crease and Stumps Pitch Markings */}
      <PitchMarkings />

      {/* Top Header Bar */}
      <Header
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        gameMode={gameMode}
        roomCode={multiplayer.roomCode}
        playerId={multiplayer.myPlayerId}
        currentView={currentView}
        onExitToLobby={handleExitToLobby}
        micEnabled={micEnabled}
        onToggleMic={handleToggleMic}
      />

      {/* Main Container */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 py-2 z-10 max-w-5xl mx-auto">
        {currentView === 'LOBBY' ? (
          /* Lobby Mode Selection */
          <Lobby
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onPlayVsBot={handlePlayVsBot}
            createdRoomCode={multiplayer.roomCode}
            isWaitingForFriend={multiplayer.isHost && !multiplayer.serverState?.playerTwoId}
            errorMessage={multiplayer.errorMessage}
            isConnecting={multiplayer.connectionStatus === 'CONNECTING'}
          />
        ) : (
          /* Pitch Arena Gameplay */
          <>
            {/* Charcoal Scoreboard */}
            <Scoreboard
              playerScore={activePlayerScore}
              friendScore={activeFriendScore}
              playerIsBatting={isBattingActive}
              innings={activeInnings}
              target={activeTarget}
              playerOut={activePlayerOut}
              friendOut={activeFriendOut}
              recentBalls={gameMode === 'BOT' ? botRecentBalls : []}
            />

            {/* Two Side-by-Side Cards (YOU webcam & FRIEND card) */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 my-2 max-w-3xl">
              {/* Left Card: Mirrored Local Webcam */}
              <WebcamCard
                playerIsBatting={isBattingActive}
                countdown={activeCountdown}
                isThrowing={activeGameState === 'COUNTDOWN'}
                lockedPlayerMove={lockedPlayerMove}
                currentGesture={currentGesture}
                setCurrentGesture={setCurrentGesture}
                latestGestureRef={latestGestureRef}
                micEnabled={micEnabled}
                onStreamReady={(stream) => {
                  localStreamRef.current = stream;
                  if (gameMode === 'MULTIPLAYER') {
                    multiplayer.setLocalStream(stream);
                  }
                }}
              />

              {/* Right Card: Friend Live Video (Multiplayer) or Bot */}
              <OpponentCard
                playerIsBatting={isBattingActive}
                countdown={activeCountdown}
                opponentMove={opponentMove}
                isBot={gameMode === 'BOT'}
                lastOutcome={lastBallResult?.isOut ? 'OUT' : 'RUNS'}
                remoteStream={gameMode === 'MULTIPLAYER' ? multiplayer.remoteStream : null}
                remoteVideoRef={multiplayer.remoteVideoRef}
              />
            </div>

            {/* Status Banner for All Game States */}
            <StatusBanner
              gameState={activeGameState}
              playerScore={activePlayerScore}
              friendScore={activeFriendScore}
              target={activeTarget}
              inningsBreakReason={activeInningsBreakReason}
              rivalryRecord={activeRivalry}
              lastBallResult={lastBallResult}
              onStartBall={() => {
                if (gameMode === 'MULTIPLAYER') {
                  multiplayer.startBall();
                } else {
                  startBotBall();
                }
              }}
              onContinueInnings={() => {
                if (gameMode === 'MULTIPLAYER') {
                  multiplayer.startBall();
                } else {
                  continueBotInnings();
                }
              }}
              onPlayAgain={() => {
                if (gameMode === 'MULTIPLAYER') {
                  multiplayer.resetMatch();
                } else {
                  resetBotGame();
                }
              }}
              onResetGame={handleExitToLobby}
            />

            {/* Quick Number Override / Accessibility Controls */}
            <ManualControls
              disabled={activeGameState === 'COUNTDOWN'}
              selectedMove={manualOverrideMove}
              onSelectManualMove={handleSelectManualMove}
            />
          </>
        )}
      </main>

      {/* Neo-brutalist Footer */}
      <footer className="w-full py-2 px-4 text-center text-xs font-mono font-bold text-black/60 select-none z-10">
        NEO-BRUTALIST HAND CRICKET • POWERED BY MEDIAPIPE AI & WEBRTC
      </footer>
    </div>
  );
}
