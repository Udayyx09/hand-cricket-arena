import { useState, useRef, useCallback, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');
const BACKEND_HTTP = BACKEND_URL;
const BACKEND_WS = `${BACKEND_URL}/ws-cricket`;

// Google STUN + Free OpenRelay STUN & TURN servers for carrier-grade NAT / 5G / firewall traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

/**
 * Attaches or replaces tracks in RTCPeerConnection cleanly with stream associations.
 */
function attachTracksToPc(pc, stream) {
  if (!pc || !stream) return;
  const senders = pc.getSenders();

  stream.getTracks().forEach((track) => {
    // 1. If this exact track instance is already attached to any sender, nothing to do
    if (senders.some((s) => s.track === track)) return;

    // 2. Look for existing sender of this media kind
    const existingSender = senders.find((s) => s.track && s.track.kind === track.kind);
    if (existingSender) {
      existingSender.replaceTrack(track).catch((err) => {
        console.warn(`[WebRTC] replaceTrack error for ${track.kind}:`, err);
      });
      return;
    }

    // 3. Attach track with full MediaStream association (guarantees a=msid in SDP)
    try {
      pc.addTrack(track, stream);
    } catch (err) {
      console.warn(`[WebRTC] addTrack error for ${track.kind}:`, err);
    }
  });
}

export function useMultiplayer({ 
  onCountdownTick, 
  onThrowTrigger, 
  onBallResolved, 
  onInningsBreak, 
  onMatchOver,
  remoteVideoRef: externalRemoteVideoRef
} = {}) {
  const [roomCode, setRoomCode] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [serverState, setServerState] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED'); // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState(null);

  // Synchronous refs to prevent stale closure bugs in callbacks
  const roomCodeRef = useRef(null);
  const myPlayerIdRef = useRef(null);
  const isHostRef = useRef(false);
  const stompClientRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteMediaStreamRef = useRef(null);
  const iceCandidateQueue = useRef([]);
  const localIceQueue = useRef([]);
  const sendOfferRef = useRef(null);

  const internalRemoteVideoRef = useRef(null);
  const remoteVideoRef = externalRemoteVideoRef || internalRemoteVideoRef;

  // Initialize or return RTCPeerConnection with STUN + TURN servers
  const getOrCreatePeerConnection = useCallback((room, myId) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    console.log("[WebRTC] Creating RTCPeerConnection for room:", room, "player:", myId);
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    });

    // Attach local tracks immediately if camera stream is already initialized
    if (localStreamRef.current) {
      attachTracksToPc(pc, localStreamRef.current);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && room) {
        const candidateData = event.candidate.toJSON ? event.candidate.toJSON() : {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        };
        const payload = {
          senderId: myId,
          type: 'ice-candidate',
          data: candidateData
        };
        if (stompClientRef.current?.connected) {
          stompClientRef.current.publish({
            destination: `/app/room/${room}/signal`,
            body: JSON.stringify(payload)
          });
        } else {
          localIceQueue.current.push(payload);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack received:", event.track.kind, "id:", event.track.id, "streams:", event.streams);

      const incomingStream = (event.streams && event.streams[0]) ? event.streams[0] : null;

      if (!remoteMediaStreamRef.current) {
        remoteMediaStreamRef.current = new MediaStream();
      }

      if (incomingStream) {
        incomingStream.getTracks().forEach((t) => {
          if (!remoteMediaStreamRef.current.getTracks().some((existing) => existing.id === t.id)) {
            remoteMediaStreamRef.current.addTrack(t);
          }
        });
      } else {
        if (!remoteMediaStreamRef.current.getTracks().some((existing) => existing.id === event.track.id)) {
          remoteMediaStreamRef.current.addTrack(event.track);
        }
      }

      // Handle unmute event (fires when media packets start arriving)
      event.track.onunmute = () => {
        console.log(`[WebRTC] Remote track ${event.track.kind} unmuted`);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.play().catch((err) => {
            console.warn("Remote video auto-play prevented on track unmute:", err);
          });
        }
      };

      // Pass fresh MediaStream instance wrapper so React detects reference change and re-renders!
      const freshStream = new MediaStream(remoteMediaStreamRef.current.getTracks());
      setRemoteStream(freshStream);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteMediaStreamRef.current;
        remoteVideoRef.current.play().catch((err) => {
          console.warn("Remote video auto-play prevented:", err);
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.play().catch((err) => {
            console.warn("Remote video auto-play prevented on ICE connect:", err);
          });
        }
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [remoteVideoRef]);

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

        // Send offer helper
        const sendOffer = async (iceRestart = false) => {
          if (!pc || !client.connected) return;

          try {
            if (localStreamRef.current) {
              attachTracksToPc(pc, localStreamRef.current);
            }

            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
              iceRestart: !!iceRestart
            });
            await pc.setLocalDescription(offer);

            console.log("[WebRTC] Publishing offer to /app/room/" + room + "/signal");
            client.publish({
              destination: `/app/room/${room}/signal`,
              body: JSON.stringify({
                senderId: playerId,
                type: 'offer',
                data: pc.localDescription
              })
            });
          } catch (err) {
            console.warn("[WebRTC] Error creating/sending offer:", err);
          }
        };

        sendOfferRef.current = sendOffer;

        // Flush any queued local ICE candidates
        while (localIceQueue.current.length > 0) {
          const payload = localIceQueue.current.shift();
          client.publish({
            destination: `/app/room/${room}/signal`,
            body: JSON.stringify(payload)
          });
        }

        // Request immediate state sync from backend
        client.publish({
          destination: `/app/room/${room}/sync`,
          body: JSON.stringify({})
        });

        // If guest, announce readiness to host with repeat pings to avoid any timing race
        if (!isRoomHost) {
          const announceReady = () => {
            if (client.connected) {
              console.log("[WebRTC] Guest announcing ready to Host...");
              client.publish({
                destination: `/app/room/${room}/signal`,
                body: JSON.stringify({
                  senderId: playerId,
                  type: 'ready',
                  data: {}
                })
              });
            }
          };
          announceReady();
          setTimeout(announceReady, 500);
          setTimeout(announceReady, 1500);
        }

        // 1. Subscribe to Game State topic
        client.subscribe(`/topic/room/${room}/state`, (message) => {
          try {
            const state = JSON.parse(message.body);
            setServerState(state);

            // Sync countdown and ball resolution events
            if (state.eventType === 'BALL_COUNTDOWN') {
              if (onCountdownTick) onCountdownTick(state.countdown);
              if (state.countdown === 0 && onThrowTrigger) {
                onThrowTrigger();
              }
            } else if (state.eventType === 'BALL_RESULT') {
              if (onBallResolved) onBallResolved(state);
            } else if (state.eventType === 'INNINGS_BREAK') {
              if (onBallResolved) onBallResolved(state);
              if (onInningsBreak) onInningsBreak(state);
            } else if (state.eventType === 'MATCH_OVER') {
              if (onBallResolved) onBallResolved(state);
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

            if (signal.type === 'ready') {
              console.log("[WebRTC] Received 'ready' from peer:", signal.senderId, "pc state:", pc.signalingState);
              if (isRoomHost) {
                if (pc.signalingState === 'have-local-offer' && pc.localDescription) {
                  // Peer missed previous offer, re-send existing offer
                  console.log("[WebRTC] Re-sending existing localDescription offer to Guest");
                  client.publish({
                    destination: `/app/room/${room}/signal`,
                    body: JSON.stringify({
                      senderId: playerId,
                      type: 'offer',
                      data: pc.localDescription
                    })
                  });
                } else if (pc.signalingState === 'stable') {
                  sendOffer();
                }
              }
            } else if (signal.type === 'offer') {
              console.log("[WebRTC] Received offer from", signal.senderId, "in state:", pc.signalingState);
              if (localStreamRef.current) {
                attachTracksToPc(pc, localStreamRef.current);
              }

              // Handle glare/collision gracefully
              if (pc.signalingState !== 'stable') {
                console.log("[WebRTC] Resolving offer collision in state:", pc.signalingState);
                await Promise.all([
                  pc.setLocalDescription({ type: 'rollback' }).catch(() => {}),
                  pc.setRemoteDescription(new RTCSessionDescription(signal.data))
                ]);
              } else {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
              }

              // Drain queued ICE candidates
              while (iceCandidateQueue.current.length > 0) {
                const queued = iceCandidateQueue.current.shift();
                try {
                  await pc.addIceCandidate(queued);
                } catch (e) {
                  console.warn("Error adding queued ICE candidate:", e);
                }
              }

              const answer = await pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              });
              await pc.setLocalDescription(answer);

              console.log("[WebRTC] Publishing answer to /app/room/" + room + "/signal");
              client.publish({
                destination: `/app/room/${room}/signal`,
                body: JSON.stringify({
                  senderId: playerId,
                  type: 'answer',
                  data: pc.localDescription
                })
              });
            } else if (signal.type === 'answer') {
              console.log("[WebRTC] Received answer from", signal.senderId, "in state:", pc.signalingState);
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                while (iceCandidateQueue.current.length > 0) {
                  const queued = iceCandidateQueue.current.shift();
                  try {
                    await pc.addIceCandidate(queued);
                  } catch (e) {
                    console.warn("Error adding queued ICE candidate:", e);
                  }
                }
              } else {
                console.warn("[WebRTC] Answer received but signalingState is", pc.signalingState);
              }
            } else if (signal.type === 'ice-candidate') {
              if (signal.data && (signal.data.candidate || signal.data.sdpMid !== undefined)) {
                try {
                  const candidate = new RTCIceCandidate(signal.data);
                  if (pc.remoteDescription && pc.remoteDescription.type) {
                    await pc.addIceCandidate(candidate);
                  } else {
                    iceCandidateQueue.current.push(candidate);
                  }
                } catch (err) {
                  console.warn("Error adding ICE candidate:", err);
                }
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
      roomCodeRef.current = data.roomCode;
      myPlayerIdRef.current = data.playerId;
      isHostRef.current = true;
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
      roomCodeRef.current = cleanCode;
      myPlayerIdRef.current = data.playerId;
      isHostRef.current = false;

      // Immediate pre-fetch of room state so Guest gets roles/scores right away
      try {
        const stateRes = await fetch(`${BACKEND_HTTP}/api/rooms/${cleanCode}`);
        if (stateRes.ok) {
          const roomData = await stateRes.json();
          setServerState({
            roomCode: cleanCode,
            eventType: 'READY',
            playerOneId: roomData.playerOneId,
            playerTwoId: roomData.playerTwoId || data.playerId,
            batterId: roomData.batterId || roomData.playerOneId,
            bowlerId: roomData.bowlerId || data.playerId,
            playerOneScore: roomData.playerOneScore || 0,
            playerTwoScore: roomData.playerTwoScore || 0,
            innings: roomData.innings || 1,
            target: roomData.target,
            playerOneOut: roomData.playerOneOut || false,
            playerTwoOut: roomData.playerTwoOut || false
          });
        }
      } catch (e) {
        console.warn("Could not pre-fetch room state:", e);
      }

      connectStomp(cleanCode, data.playerId, false);
      return data;
    } catch (err) {
      console.error(err);
      setConnectionStatus('ERROR');
      setErrorMessage(err.message || "Failed to join room");
      throw err;
    }
  };

  // Save local camera stream & update active RTCPeerConnection immediately
  const setLocalStream = (stream) => {
    localStreamRef.current = stream;
    const pc = peerConnectionRef.current;
    if (pc) {
      attachTracksToPc(pc, stream);
      if (isHostRef.current && pc.signalingState === 'stable') {
        sendOfferRef.current?.();
      } else if (!isHostRef.current && stompClientRef.current?.connected && roomCodeRef.current) {
        // If guest, notify host that media stream is active so host can re-offer if needed
        stompClientRef.current.publish({
          destination: `/app/room/${roomCodeRef.current}/signal`,
          body: JSON.stringify({
            senderId: myPlayerIdRef.current,
            type: 'ready',
            data: {}
          })
        });
      }
    }
  };

  // Trigger synchronized ball countdown
  const startBall = () => {
    if (stompClientRef.current?.connected && roomCodeRef.current) {
      stompClientRef.current.publish({
        destination: `/app/room/${roomCodeRef.current}/start-ball`,
        body: JSON.stringify({})
      });
    }
  };

  // Submit player throw move (1 to 6)
  const submitMove = (move) => {
    if (stompClientRef.current?.connected && roomCodeRef.current && myPlayerIdRef.current) {
      stompClientRef.current.publish({
        destination: `/app/room/${roomCodeRef.current}/move`,
        body: JSON.stringify({
          playerId: myPlayerIdRef.current,
          move: Number(move)
        })
      });
    }
  };

  // Reset match for rematch
  const resetMatch = () => {
    if (stompClientRef.current?.connected && roomCodeRef.current) {
      stompClientRef.current.publish({
        destination: `/app/room/${roomCodeRef.current}/reset`,
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
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteMediaStreamRef.current = null;
    setRemoteStream(null);
    setServerState(null);
    setRoomCode(null);
    setMyPlayerId(null);
    setIsHost(false);
    roomCodeRef.current = null;
    myPlayerIdRef.current = null;
    isHostRef.current = false;
    sendOfferRef.current = null;
    setConnectionStatus('DISCONNECTED');
    setErrorMessage(null);
    iceCandidateQueue.current = [];
    localIceQueue.current = [];
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
    remoteVideoRef,
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
