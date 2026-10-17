import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { initHandLandmarker, classifyHandGesture } from '../utils/handDetector';

const gestureMeta = {
  1: { emoji: '☝️', label: '1 FINGER' },
  2: { emoji: '✌️', label: '2 FINGERS' },
  3: { emoji: '🤟', label: '3 FINGERS' },
  4: { emoji: '🖖', label: '4 FINGERS' },
  5: { emoji: '✋', label: '5 (FULL PALM)' },
  6: { emoji: '👍', label: '6 (THUMBS UP)' },
};

function getModeGesture(buffer) {
  if (!buffer || buffer.length === 0) return null;
  const counts = {};
  let maxCount = 0;
  let modeNum = null;

  for (let i = buffer.length - 1; i >= 0; i--) {
    const val = buffer[i];
    if (val >= 1 && val <= 6) {
      counts[val] = (counts[val] || 0) + 1;
      if (counts[val] > maxCount) {
        maxCount = counts[val];
        modeNum = val;
      }
    }
  }
  return modeNum;
}

export default function WebcamCard({
  playerIsBatting,
  countdown,          // null or 3, 2, 1, 0
  isThrowing,
  lockedPlayerMove,   // locked move after throw
  onGestureDetected,  // callback sending detected move
  currentGesture,     // { number, label, emoji }
  setCurrentGesture,
  latestGestureRef,   // ref to store latest smoothed gesture for 0-latency lock-in
  onStreamReady       // callback passing local MediaStream for WebRTC
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [landmarkerReady, setLandmarkerReady] = useState(false);
  const animationFrameId = useRef(null);
  const gestureBufferRef = useRef([]);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let active = true;
    initHandLandmarker()
      .then(() => {
        if (active) setLandmarkerReady(true);
      })
      .catch((err) => {
        console.error("Landmarker init error:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Initialize Webcam Stream
  useEffect(() => {
    let stream = null;

    async function startCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 640 },
            facingMode: 'user'
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraActive(true);
            if (onStreamReady) {
              onStreamReady(stream);
            }
          };
        }
      } catch (err) {
        console.warn("Camera access error:", err);
        setCameraError("Webcam not available or permission denied. You can still use the 1-6 buttons below!");
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Frame detection loop
  useEffect(() => {
    let isDetecting = true;

    async function detectLoop() {
      if (!isDetecting) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= 2 && landmarkerReady) {
        try {
          const landmarker = await initHandLandmarker();
          if (landmarker && video) {
            const results = landmarker.detectForVideo(video, performance.now());

            if (results.landmarks && results.landmarks.length > 0) {
              const primaryHand = results.landmarks[0];
              const rawClassification = classifyHandGesture(primaryHand);

              // 5-Frame smoothing buffer
              gestureBufferRef.current.push(rawClassification.number);
              if (gestureBufferRef.current.length > 5) {
                gestureBufferRef.current.shift();
              }

              const modeNum = getModeGesture(gestureBufferRef.current);
              const smoothed = modeNum && gestureMeta[modeNum]
                ? { number: modeNum, emoji: gestureMeta[modeNum].emoji, label: gestureMeta[modeNum].label }
                : rawClassification;

              setCurrentGesture(smoothed);
              if (latestGestureRef) {
                latestGestureRef.current = smoothed.number || 0;
              }
              if (onGestureDetected) {
                onGestureDetected(smoothed);
              }

              // Draw minimal landmarks on canvas
              if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ffe600';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;

                primaryHand.forEach((pt) => {
                  const x = pt.x * canvas.width;
                  const y = pt.y * canvas.height;
                  ctx.beginPath();
                  ctx.arc(x, y, 4, 0, 2 * Math.PI);
                  ctx.fill();
                  ctx.stroke();
                });
              }
            } else {
              // No hand in this specific frame
              gestureBufferRef.current.push(null);
              if (gestureBufferRef.current.length > 5) {
                gestureBufferRef.current.shift();
              }

              const modeNum = getModeGesture(gestureBufferRef.current);
              if (modeNum && gestureMeta[modeNum]) {
                const smoothed = { number: modeNum, emoji: gestureMeta[modeNum].emoji, label: gestureMeta[modeNum].label };
                setCurrentGesture(smoothed);
                if (latestGestureRef) {
                  latestGestureRef.current = smoothed.number || 0;
                }
                if (onGestureDetected) {
                  onGestureDetected(smoothed);
                }
              } else {
                const fallback = { number: null, label: 'NO HAND DETECTED', emoji: '❓' };
                setCurrentGesture(fallback);
                if (latestGestureRef) {
                  latestGestureRef.current = 0;
                }
                if (onGestureDetected) {
                  onGestureDetected(fallback);
                }
              }

              if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
            }
          }
        } catch (err) {
          // ignore transient detection errors
        }
      }

      animationFrameId.current = requestAnimationFrame(detectLoop);
    }

    if (cameraActive && landmarkerReady) {
      animationFrameId.current = requestAnimationFrame(detectLoop);
    }

    return () => {
      isDetecting = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [cameraActive, landmarkerReady, onGestureDetected, setCurrentGesture, latestGestureRef]);

  return (
    <div className="flex-1 flex flex-col items-center">
      {/* Container */}
      <div className="w-full max-w-[340px] sm:max-w-[400px] bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000] overflow-hidden flex flex-col">
        {/* Yellow Header */}
        <div className="bg-[#ffe600] border-b-4 border-black px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{playerIsBatting ? '🏏' : '⚾'}</span>
            <span className="font-black text-sm sm:text-base tracking-wider text-black uppercase">
              {playerIsBatting ? '🏏 YOU (BATTING)' : '⚾ YOU (BOWLING)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-green-600 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-[11px] font-black uppercase tracking-wider">
              {cameraActive ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Video / Webcam Aspect Square Box */}
        <div className="relative aspect-square w-full bg-[#111111] overflow-hidden flex items-center justify-center">
          {/* Mirrored Local Webcam */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
              cameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Mirrored Landmarks Canvas */}
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none opacity-80"
          />

          {/* Fallback if camera is inactive / error */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#1a1a1a] text-white">
              <CameraOff size={48} className="text-[#ffe600] mb-3 animate-pulse" />
              <p className="font-bold text-sm mb-2 text-gray-200">
                {cameraError || "Waiting for camera permissions..."}
              </p>
              <p className="text-xs text-gray-400 max-w-xs">
                Hold your hand clearly in front of the lens. You can also click the quick buttons below.
              </p>
            </div>
          )}

          {/* Live Gesture Detection Dark Badge (Top-Left) */}
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-black/90 text-white font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg border-2 border-white/40 shadow-[2px_2px_0px_#000] flex items-center gap-2 backdrop-blur-sm">
              <span className="text-base sm:text-lg">{currentGesture?.emoji || '❓'}</span>
              <span className="tracking-wider text-[#ffe600]">
                {currentGesture?.number ? `${currentGesture.emoji} ${currentGesture.number}` : (currentGesture?.label || 'READY')}
              </span>
            </div>
          </div>

          {/* Circular Pink Countdown Overlay (3-2-1) */}
          {countdown !== null && countdown > 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="relative flex items-center justify-center">
                {/* Outer animated ring */}
                <div className="w-32 h-32 rounded-full border-8 border-dashed border-black animate-spin"></div>
                {/* Inner circular pink badge */}
                <div className="absolute w-28 h-28 rounded-full bg-[#ff66c4] border-4 border-black shadow-[6px_6px_0px_#000] flex items-center justify-center animate-brutal-pulse">
                  <span className="text-6xl font-black text-black select-none">
                    {countdown}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Locked In Move Indicator on Throw */}
          {lockedPlayerMove !== null && countdown === null && (
            <div className="absolute bottom-3 right-3 z-10 animate-bounce">
              <div className="bg-[#ffe600] text-black font-black text-xs px-3 py-1 rounded-md border-2 border-black shadow-[2px_2px_0px_#000] uppercase">
                LOCKED: {lockedPlayerMove}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
