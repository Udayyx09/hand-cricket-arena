import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

let handLandmarkerInstance = null;
let isInitializing = false;

export async function initHandLandmarker() {
  if (handLandmarkerInstance) return handLandmarkerInstance;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return handLandmarkerInstance;
  }

  isInitializing = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });
    console.log("MediaPipe HandLandmarker initialized successfully!");
  } catch (err) {
    console.warn("GPU delegate failed, falling back to CPU:", err);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "CPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
    } catch (fallbackErr) {
      console.error("Failed to initialize MediaPipe HandLandmarker:", fallbackErr);
      throw fallbackErr;
    }
  } finally {
    isInitializing = false;
  }

  return handLandmarkerInstance;
}

/**
 * Classifies hand landmarks into cricket moves (1 to 6).
 * 
 * Rules:
 * - 1 to 4 fingers extended (Index, Middle, Ring, Pinky where tip.y < pip.y) = 1, 2, 3, 4
 * - All 4 fingers + Thumb extended = 5
 * - Thumbs-up gesture (Thumb extended upward/outward while Index, Middle, Ring, Pinky are curled closed) = 6
 */
export function classifyHandGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { number: null, label: 'NO HAND', emoji: '❓' };
  }

  // 1. Count the 4 main fingers (Index, Middle, Ring, Pinky)
  // extended where tip.y < pip.y and tip.y < mcp.y (smaller Y is higher up on screen)
  const isIndexExtended = landmarks[8].y < landmarks[6].y && landmarks[8].y < landmarks[5].y;
  const isMiddleExtended = landmarks[12].y < landmarks[10].y && landmarks[12].y < landmarks[9].y;
  const isRingExtended = landmarks[16].y < landmarks[14].y && landmarks[16].y < landmarks[13].y;
  const isPinkyExtended = landmarks[20].y < landmarks[18].y && landmarks[20].y < landmarks[17].y;

  const extendedFingers = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended];
  const fingersUpCount = extendedFingers.filter(Boolean).length;

  // 2. Check if Thumb is extended
  const thumbTipToPalm = Math.hypot(landmarks[4].x - landmarks[9].x, landmarks[4].y - landmarks[9].y);
  const thumbIpToPalm = Math.hypot(landmarks[3].x - landmarks[9].x, landmarks[3].y - landmarks[9].y);
  const isThumbExtended = thumbTipToPalm > thumbIpToPalm * 1.2;

  // 3. Strict rule for 6 (Thumbs-Up):
  // Return 6 ONLY when fingersUpCount === 0 (all 4 fingers strictly curled closed: tip.y > pip.y)
  // AND the thumb is extended upward (landmarks[4].y < landmarks[5].y)
  const allFourCurled =
    landmarks[8].y > landmarks[6].y &&
    landmarks[12].y > landmarks[10].y &&
    landmarks[16].y > landmarks[14].y &&
    landmarks[20].y > landmarks[18].y;

  const isThumbUpward = landmarks[4].y < landmarks[5].y;

  if (fingersUpCount === 0 && allFourCurled && isThumbUpward) {
    return { number: 6, label: '6 (THUMBS UP)', emoji: '👍' };
  }

  // 4. Strict rule for 5 (Open Palm):
  // When all 4 fingers are extended (fingersUpCount === 4) and thumb is extended, ALWAYS return 5 (never 6).
  if (fingersUpCount === 4 && isThumbExtended) {
    return { number: 5, label: '5 (FULL PALM)', emoji: '✋' };
  }

  // If 4 fingers are extended but thumb is curled/tucked:
  if (fingersUpCount === 4) {
    return { number: 4, label: '4 FINGERS', emoji: '🖖' };
  }

  // 5. For 1, 2, 3: Return fingersUpCount
  if (fingersUpCount === 3) {
    return { number: 3, label: '3 FINGERS', emoji: '🤟' };
  }

  if (fingersUpCount === 2) {
    return { number: 2, label: '2 FINGERS', emoji: '✌️' };
  }

  if (fingersUpCount === 1) {
    return { number: 1, label: '1 FINGER', emoji: '☝️' };
  }

  // 0 fingers extended
  if (fingersUpCount === 0) {
    return { number: null, label: 'FIST / SHOW HAND', emoji: '✊' };
  }

  return { number: null, label: 'READY', emoji: '👋' };
}
