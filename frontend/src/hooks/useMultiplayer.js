import { useState, useRef, useCallback, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');
const BACKEND_HTTP = BACKEND_URL;
const BACKEND_WS = `${BACKEND_URL}/ws-cricket`;

export function useMultiplayer({ onCountdownTick, onThrowTrigger, onBallResolved, onInningsBreak, onMatchOver }) {
  const [roomCode, setRoomCode] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [serverState, setServerState] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED'); // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState(null);

  const stompClientRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidateQueue = useRef([]);
  const offerSentRef = useRef(false);

  // Initialize or return RTCPeerConnection
  const getOrCreatePeerConnection = useCallback((room, myId) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Add local tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && stompClientRef.current?.connected && room) {
        stompClientRef.current.publish({
          destination: `/app/room/${room}/signal`,
          body: JSON.stringify({
            senderId: myId,
            type: 'ice-candidate',
            data: event.candidate
          })
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  // Connect STOMP WebSocket
  const connectStomp = useCallback((room, playerId, isRoomHost) => {
    setConnectionStatus('CONNECTING');
    setErrorMessage(null);

    const client = new Client({
      webSocketFactory: () => new SockJS(BACKEND_WS),
      reconnectDelay: 4000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setConnectionStatus('CONNECTED');
        const pc = getOrCreatePeerConnection(room, playerId);

        // 1. Subscribe to Game State topic
        client.subscribe(`/topic/room/${room}/state`, (message) => {
          try {
            const state = JSON.parse(message.body);
            setServerState(state);

            // Host initiates WebRTC offer when guest joins
            if (isRoomHost && state.playerTwoId && !offerSentRef.current) {
              offerSentRef.current = true;
              pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
                .then((offer) => pc.setLocalDescription(offer))
                .then(() => {
                  client.publish({
                    destination: `/app/room/${room}/signal`,
                    body: JSON.stringify({
                      senderId: playerId,
                      type: 'offer',
                      data: pc.localDescription
                    })
                  });
                })
                .catch((err) => console.warn("Error creating offer:", err));
            }

            // Sync countdown and ball resolution events
            if (state.eventType === 'BALL_COUNTDOWN') {
              if (onCountdownTick) onCountdownTick(state.countdown);
              if (state.countdown === 0 && onThrowTrigger) {
                onThrowTrigger();
              }
            } else if (state.eventType === 'BALL_RESULT') {
              if (onBallResolved) onBallResolved(state);
            } else if (state.eventType === 'INNINGS_BREAK') {
              if (onInningsBreak) onInningsBreak(state);
            } else if (state.eventType === 'MATCH_OVER') {
              if (onMatchOver) onMatchOver(state);
            }
          } catch (e) {
            console.error("Failed to parse state message:", e);
          }
        });

        // 2. Subscribe to WebRTC Signaling topic
        client.subscribe(`/topic/room/${room}/signal`, async (message) => {
          try {
            const signal = JSON.parse(message.body);
            if (signal.senderId === playerId) return; // Ignore own echoes

            if (signal.type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
              while (iceCandidateQueue.current.length > 0) {
                await pc.addIceCandidate(iceCandidateQueue.current.shift());
              }
              const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
              await pc.setLocalDescription(answer);
              client.publish({
                destination: `/app/room/${room}/signal`,
                body: JSON.stringify({
                  senderId: playerId,
                  type: 'answer',
                  data: answer
                })
              });
            } else if (signal.type === 'answer') {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
              while (iceCandidateQueue.current.length > 0) {
                await pc.addIceCandidate(iceCandidateQueue.current.shift());
              }
            } else if (signal.type === 'ice-candidate') {
              const candidate = new RTCIceCandidate(signal.data);
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(candidate);
              } else {
                iceCandidateQueue.current.push(candidate);
              }
            }
          } catch (e) {
            console.error("Signaling error:", e);
          }
        });
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        setConnectionStatus('ERROR');
        setErrorMessage("WebSocket connection error. Could not connect to backend at " + BACKEND_URL);
      },
      onWebSocketClose: () => {
        setConnectionStatus('DISCONNECTED');
      }
    });

    client.activate();
    stompClientRef.current = client;
  }, [getOrCreatePeerConnection, onCountdownTick, onThrowTrigger, onBallResolved, onInningsBreak, onMatchOver]);

  // Create room via REST
  const createRoom = async () => {
    try {
      setErrorMessage(null);
      setConnectionStatus('CONNECTING');
      const res = await fetch(`${BACKEND_HTTP}/api/rooms/create`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to create room on server");
      const data = await res.json();
      setRoomCode(data.roomCode);
      setMyPlayerId(data.playerId);
      setIsHost(true);
      offerSentRef.current = false;
      connectStomp(data.roomCode, data.playerId, true);
      return data;
    } catch (err) {
      console.error(err);
      setConnectionStatus('ERROR');
      setErrorMessage("Could not connect to Spring Boot backend at " + BACKEND_HTTP);
      throw err;
    }
  };

  // Join room via REST
  const joinRoom = async (code) => {
    try {
      setErrorMessage(null);
      setConnectionStatus('CONNECTING');
      const cleanCode = code.toUpperCase().trim();
      const res = await fetch(`${BACKEND_HTTP}/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Room not found or already full");
      }
      setRoomCode(cleanCode);
      setMyPlayerId(data.playerId);
      setIsHost(false);
      offerSentRef.current = false;
      connectStomp(cleanCode, data.playerId, false);
      return data;
    } catch (err) {
      console.error(err);
      setConnectionStatus('ERROR');
      setErrorMessage(err.message || "Failed to join room");
      throw err;
    }
  };

  // Save local camera stream
  const setLocalStream = (stream) => {
    localStreamRef.current = stream;
    if (peerConnectionRef.current) {
      stream.getTracks().forEach((track) => {
        const senders = peerConnectionRef.current.getSenders();
        const hasTrack = senders.some((s) => s.track === track);
        if (!hasTrack) {
          peerConnectionRef.current.addTrack(track, stream);
        }
      });
    }
  };

  // Trigger synchronized ball countdown
  const startBall = () => {
    if (stompClientRef.current?.connected && roomCode) {
      stompClientRef.current.publish({
        destination: `/app/room/${roomCode}/start-ball`,
        body: JSON.stringify({})
      });
    }
  };

  // Submit player throw move (1 to 6)
  const submitMove = (move) => {
    if (stompClientRef.current?.connected && roomCode && myPlayerId) {
      stompClientRef.current.publish({
        destination: `/app/room/${roomCode}/move`,
        body: JSON.stringify({
          playerId: myPlayerId,
          move: Number(move)
        })
      });
    }
  };

  // Reset match for rematch
  const resetMatch = () => {
    if (stompClientRef.current?.connected && roomCode) {
      stompClientRef.current.publish({
        destination: `/app/room/${roomCode}/reset`,
        body: JSON.stringify({})
      });
    }
  };

  // Disconnect & cleanup
  const disconnect = () => {
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    setServerState(null);
    setRoomCode(null);
    setMyPlayerId(null);
    setIsHost(false);
    setConnectionStatus('DISCONNECTED');
    setErrorMessage(null);
    offerSentRef.current = false;
    iceCandidateQueue.current = [];
  };

  useEffect(() => {
    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
      if (peerConnectionRef.current) peerConnectionRef.current.close();
    };
  }, []);

  return {
    roomCode,
    myPlayerId,
    isHost,
    serverState,
    remoteStream,
    connectionStatus,
    errorMessage,
    createRoom,
    joinRoom,
    setLocalStream,
    startBall,
    submitMove,
    resetMatch,
    disconnect
  };
}
