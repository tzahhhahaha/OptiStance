import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Timer,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Camera as CameraIcon,
  RefreshCw,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Award,
  ChevronDown,
  Lock,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Pose as MediaPipePose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Pose, PracticeSession, MASTERY_THRESHOLD } from '../types';
import { analyzePomMotion, calculateMeasuredAngles } from './poseLibrary';
import { audioCoach } from '../utils/audio';
import { getRecommendedCameraFacing, getCameraConstraints, isCapacitorNative, CameraFacing } from '../utils/device';
import { isPoseLocked, visiblePosesFor } from '../utils/access';
import { mediapipeLocateFile, verifyMediapipeAssets } from '../utils/mediapipeAssets';
import { Camera, CameraDirection, MediaType } from '@capacitor/camera';

interface AICameraScreenProps {
  initialPose?: Pose | null;
  allPoses: Pose[];
  /** Verified athletes unlock Intermediate + Advanced target poses. */
  isVerified: boolean;
  audioCuesEnabled?: boolean;
  onClose: () => void;
  onSaveSession: (session: PracticeSession) => void;
}

export const AICameraScreen: React.FC<AICameraScreenProps> = ({
  initialPose,
  allPoses,
  isVerified,
  audioCuesEnabled = true,
  onClose,
  onSaveSession
}) => {
  const [currentPose, setCurrentPose] = useState<Pose | null>(initialPose ?? null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(audioCuesEnabled);
  const [timerDuration, setTimerDuration] = useState<number>(3); // 0, 3, 5
  const [flashOn, setFlashOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>(() => getRecommendedCameraFacing());
  const [useWebcam, setUseWebcam] = useState(true);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [ringAccuracy, setRingAccuracy] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showCorrectionBanner, setShowCorrectionBanner] = useState(false);
  const [customCorrection, setCustomCorrection] = useState<string>('');
  const [detectedPoseName, setDetectedPoseName] = useState<string>('No pose detected');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [lastCapturedSession, setLastCapturedSession] = useState<PracticeSession | null>(null);
  const [customMediaUrl, setCustomMediaUrl] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  // Set when the bundled pose engine is missing or fails to initialise. Without
  // this the camera screen sits on a black video with no landmarks and no
  // explanation, which reads as "the app is broken".
  const [poseEngineError, setPoseEngineError] = useState<string | null>(null);

  const activeTargetPose = currentPose ?? initialPose ?? null;
  const showTargetSelector = !initialPose;

  // Unverified athletes only see beginner-grade target poses in the selector.
  const accessiblePoses = visiblePosesFor(allPoses, isVerified);

  // Running inside the Capacitor native shell (installed iOS/Android app) —
  // used to pick between WebView getUserMedia and the native camera plugin.
  const isNative = isCapacitorNative();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<MediaPipePose | null>(null);
  const frameLoopRef = useRef<number | null>(null);
  const currentPoseRef = useRef<Pose | null>(currentPose);

  // Live value mirrors so frame handlers and capture can read fresh values
  // without re-rendering or capturing stale closure state.
  const accuracyRef = useRef<number>(0);
  const detectedPoseNameRef = useRef<string>('No pose detected');
  const measuredAnglesRef = useRef<Record<string, number>>({});
  const lastCapturedAccuracyRef = useRef<number | null>(null);
  const lastDetectedNameRef = useRef<string>('No pose detected');

  // Countdown interval + session timer refs (cleaned up on unmount).
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const customMediaUrlRef = useRef<string | null>(null);

  useEffect(() => {
    currentPoseRef.current = currentPose;
  }, [currentPose]);

  // Revoke the object URL when a new one replaces it and on unmount.
  useEffect(() => {
    return () => {
      if (customMediaUrlRef.current) {
        URL.revokeObjectURL(customMediaUrlRef.current);
        customMediaUrlRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!initialPose) {
      setCurrentPose(null);
      setDetectedPoseName('No pose detected');
      setCustomCorrection('');
      setShowCorrectionBanner(false);
      return;
    }

    setCurrentPose(initialPose);
    setDetectedPoseName(initialPose.name);
    setShowCorrectionBanner(true);
  }, [initialPose]);

  // Gating fallback: if an unverified athlete is somehow holding a non-beginner
  // target pose (passed in via initialPose, a stale ID, or a race), stop the
  // camera stream and block rendering with the access-denied modal. Dropping
  // useWebcam to false forces the camera-init effect below to tear down the
  // stream (the init effect runs after this one on mount).
  useEffect(() => {
    const locked = activeTargetPose && isPoseLocked(activeTargetPose, isVerified);
    if (locked) {
      stopCamera();
      setUseWebcam(false);
      setAccessDenied(true);
    } else if (accessDenied) {
      // The block was lifted (verification came back, or the target changed).
      setAccessDenied(false);
      setUseWebcam(true);
    }
    // activeTargetPose identity can change via initialPose without changing id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTargetPose?.id, isVerified]);

  const handleCloseAccessDenied = () => {
    setAccessDenied(false);
    setCurrentPose(null);
    setDetectedPoseName('No pose detected');
    setShowCorrectionBanner(false);
    audioCoach.stop();
    // Re-engage the camera-init effect to start the stream again.
    setUseWebcam(true);
  };

  // Initialize camera or athletic backdrop
  //
  // Deps are deliberately limited to cameraFacing and useWebcam. startCamera,
  // stopCamera and cleanupPose are re-created on every render, so listing them
  // here would tear the media stream down and re-request getUserMedia on every
  // single render. The two state values are the only real triggers: flipping
  // the camera, or the verification gate above dropping useWebcam to false.
  useEffect(() => {
    if (useWebcam) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
      cleanupPose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraFacing, useWebcam]);

  // When pose changes, update the target correction message without overriding live detection accuracy.
  useEffect(() => {
    if (!currentPose) {
      setCustomCorrection('');
      setShowCorrectionBanner(false);
      return;
    }

    if (currentPose.id === 'liberty') {
      setCustomCorrection('Keep your standing leg straight. Lift your bent knee higher towards your chest.');
    } else if (currentPose.id === 't-motion') {
      setCustomCorrection('Excellent T-Motion! Maintain level shoulder elevation.');
    } else if (currentPose.id === 'high-v') {
      setCustomCorrection('Lock your elbows completely and align wrists at 45° angle.');
    } else if (currentPose.id === 'half-t') {
      setCustomCorrection('Snap forearms parallel to chest line with rigid wrists.');
    } else {
      setCustomCorrection(currentPose.sampleCorrectionMessage || 'Ensure tight core and locked joint alignment.');
    }
  }, [currentPose]);

  useEffect(() => {
    setAudioEnabled(audioCuesEnabled);
    if (!audioCuesEnabled) {
      audioCoach.stop();
    }
  }, [audioCuesEnabled]);

  // Voice coaching on first load of correction
  useEffect(() => {
    if (audioEnabled && currentPose && customCorrection) {
      const timer = setTimeout(() => {
        audioCoach.speakCue(customCorrection, audioEnabled);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentPose, customCorrection, audioEnabled]);

  useEffect(() => {
    const from = ringAccuracy;
    const to = Math.min(100, Math.max(0, accuracy));

    if (Math.abs(to - from) < 0.01) {
      setRingAccuracy(to);
      return;
    }

    let rafId = 0;
    let startedAt: number | null = null;

    const animate = (timestamp: number) => {
      if (startedAt === null) {
        startedAt = timestamp;
      }

      const elapsed = timestamp - startedAt;
      const progress = Math.min(elapsed / 350, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = from + (to - from) * eased;

      setRingAccuracy(nextValue);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [accuracy, ringAccuracy]);

  const getVisibilityStatus = (landmarks: any[]) => {
    const requiredKeys = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
    const visibleCount = requiredKeys.filter((index) => {
      const landmark = landmarks[index];
      return !!landmark && (landmark.visibility ?? 0.6) > 0.2;
    }).length;

    const score = visibleCount / requiredKeys.length;
    return {
      score,
      visibleCount,
      isEnough: score >= 0.45,
      isStrong: score >= 0.7,
    };
  };

  const cleanupPose = () => {
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
  };

  const initializePose = async () => {
    if (!videoRef.current || poseRef.current || poseEngineError) return;

    // Confirm the vendored WASM/model files are actually in the bundle before
    // constructing the engine, so a skipped vendor step surfaces as a clear
    // message rather than a silently dead camera.
    const assetError = await verifyMediapipeAssets();
    if (assetError) {
      console.error('[mediapipe]', assetError);
      setPoseEngineError(assetError);
      return;
    }

    try {
      const pose = new MediaPipePose({
        // Served from the app bundle, not a CDN, so detection works offline.
        locateFile: mediapipeLocateFile,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const video = videoRef.current;
        const targetPose = currentPoseRef.current;
        if (!canvas || !ctx || !video) return;

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);

        if (results.poseLandmarks) {
          drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: '#34d399',
            lineWidth: 3,
          });
          drawLandmarks(ctx, results.poseLandmarks, {
            color: '#f8fafc',
            lineWidth: 1,
            radius: 3,
          });

          const visibilityStatus = getVisibilityStatus(results.poseLandmarks);
          const poseAnalysis = analyzePomMotion(results.poseLandmarks.reduce((acc: Record<number, { x: number; y: number; z?: number }>, landmark: any, index: number) => {
            acc[index] = { x: landmark.x, y: landmark.y, z: landmark.z };
            return acc;
          }, {}));
          measuredAnglesRef.current = calculateMeasuredAngles(results.poseLandmarks.reduce((acc: Record<number, { x: number; y: number; z?: number }>, landmark: any, index: number) => {
            acc[index] = { x: landmark.x, y: landmark.y, z: landmark.z };
            return acc;
          }, {}));

          const hasValidPose = poseAnalysis.pose && visibilityStatus.isStrong && poseAnalysis.confidence >= 0.45;
          const poseMatchConfidence = Math.max(0, Math.min(100, Math.round(poseAnalysis.confidence * 100)));

          // Compute this frame's values without triggering state updates yet.
          let nextDetectedName = detectedPoseNameRef.current;
          let nextAccuracy = accuracyRef.current;

          if (!targetPose) {
            if (poseAnalysis.pose && visibilityStatus.isStrong && poseAnalysis.confidence >= 0.78) {
              nextDetectedName = poseAnalysis.pose.name;
              nextAccuracy = poseMatchConfidence;
            } else {
              nextDetectedName = 'No pose detected';
              nextAccuracy = 0;
            }
          }

          if (targetPose) {
            if (!visibilityStatus.isEnough) {
              nextAccuracy = 0;
              if (lastDetectedNameRef.current !== 'Adjust framing') {
                setCustomCorrection('Adjust framing: keep the full body visible and turn toward the camera.');
                setShowCorrectionBanner(true);
              }
            } else if (hasValidPose) {
              nextAccuracy = poseMatchConfidence;
            } else {
              nextAccuracy = Math.max(0, Math.round(poseMatchConfidence * 0.4));
            }
          } else {
            nextAccuracy = hasValidPose ? poseMatchConfidence : 0;
          }

          // Only re-render when the displayed values actually change, so the
          // per-frame analysis loop doesn't trigger a React render every frame.
          if (nextDetectedName !== lastDetectedNameRef.current) {
            lastDetectedNameRef.current = nextDetectedName;
            setDetectedPoseName(nextDetectedName);
          }
          if (nextAccuracy !== lastCapturedAccuracyRef.current) {
            lastCapturedAccuracyRef.current = nextAccuracy;
            setAccuracy(nextAccuracy);
          }
          accuracyRef.current = nextAccuracy;
          detectedPoseNameRef.current = nextDetectedName;
        }
      });

      poseRef.current = pose;

      const tick = async () => {
        if (!videoRef.current || !poseRef.current) return;
        if (videoRef.current.readyState >= 2) {
          try {
            await poseRef.current.send({ image: videoRef.current });
          } catch (err) {
            console.error('MediaPipe pose send error:', err);
          }
        }
        frameLoopRef.current = requestAnimationFrame(tick);
      };

      frameLoopRef.current = requestAnimationFrame(tick);
    } catch (error) {
      console.error('Error initializing MediaPipe pose detection:', error);
      setUseWebcam(false);
    }
  };

  /**
   * Native (Capacitor) still capture. WKWebView (iOS) has no getUserMedia at
   * all, and some Android WebViews refuse it — so inside the app shell we open
   * the phone camera with the @capacitor/camera plugin and feed the captured
   * photo through the SAME live MediaPipe loop: the photo is loaded into the
   * <video> element (a video element renders a still image and reports
   * readyState >= 2), so scores, corrections, and snapshots all work as usual.
   */
  const takeNativePhoto = async (facing: CameraFacing = cameraFacing): Promise<boolean> => {
    try {
      const result = await Camera.takePhoto({
        quality: 90,
        targetWidth: 1280,
        targetHeight: 720,
        correctOrientation: true,
        cameraDirection: facing === 'environment' ? CameraDirection.Rear : CameraDirection.Front,
        editable: 'no',
        saveToGallery: false,
      });
      if (result.type !== MediaType.Photo) return false;

      // webPath (capacitor://…) is directly renderable; thumbnail (base64 JPEG)
      // is a valid fallback on Web.
      const src = result.webPath ?? (result.thumbnail ? `data:image/jpeg;base64,${result.thumbnail}` : null);
      if (!src) return false;

      if (customMediaUrlRef.current) {
        URL.revokeObjectURL(customMediaUrlRef.current);
        customMediaUrlRef.current = null;
      }
      setCustomMediaUrl(src);

      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
        video.src = src;
        video.onloadeddata = () => void initializePose();
      }
      return true;
    } catch (err) {
      console.error('Native camera capture failed:', err);
      return false;
    }
  };

  const startCamera = async () => {
    if (!useWebcam) return;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints(cameraFacing));
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          void initializePose();
        };
        videoRef.current.onloadeddata = () => {
          void initializePose();
        };
      }
    } catch (err) {
      // Inside the native shell (iOS WKWebView has no getUserMedia; some Android
      // WebViews refuse it) fall back to the phone's native camera for a still.
      if (isNative && (await takeNativePhoto())) {
        return;
      }
      // Fallback to simulator video/photo
      console.warn('Webcam unavailable — using media/backdrop mode:', err);
      setUseWebcam(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleFlipCamera = () => {
    setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
    if (!useWebcam) {
      setUseWebcam(true);
    }
  };

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    if (next) {
      audioCoach.speakCue('Audio feedback enabled', true);
    } else {
      audioCoach.stop();
    }
  };

  const cycleTimer = () => {
    if (timerDuration === 3) setTimerDuration(5);
    else if (timerDuration === 5) setTimerDuration(0);
    else setTimerDuration(3);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke the previous object URL before creating a new one.
    if (customMediaUrlRef.current) {
      URL.revokeObjectURL(customMediaUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    customMediaUrlRef.current = url;
    setCustomMediaUrl(url);
    setUseWebcam(false);

    // Uploaded media is previewed only – live analysis runs on the webcam
    // feed, so reset any previous score instead of faking one.
    setAccuracy(0);
    accuracyRef.current = 0;
    setRingAccuracy(0);

    audioCoach.playSuccessBeep();
    audioCoach.speakCue('Media loaded. Capture to score the pose.', audioEnabled);

    // Allow re-selecting the same file.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerCapture = () => {
    if (countdown !== null) return; // already counting down

    if (timerDuration > 0) {
      setCountdown(timerDuration);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev > 1) audioCoach.playWarningBeep();
          return prev - 1;
        });
      }, 1000);
    } else {
      executeSnapshot();
    }
  };

  // When the countdown reaches 0, stop the timer and run the capture.
  useEffect(() => {
    if (countdown === 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdown(null);
      executeSnapshot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const executeSnapshot = () => {
    const poseToUse = currentPose ?? activeTargetPose ?? allPoses[0];
    if (!poseToUse) return;

    setIsCapturing(true);
    audioCoach.playShutterSound();

    setTimeout(() => {
      setIsCapturing(false);
      // Use the REAL pose detection accuracy from the analysis, not a fake
      // value. If no pose was detected (accuracy = 0) that is reflected
      // honestly in the score and feedback.
      const finalScore = Math.max(0, Math.min(100, Math.round(accuracyRef.current)));

      // Stamp the session with the real capture time (ISO) and the real elapsed
      // practice time since the previous capture, so session history and
      // offline sync stay consistent.
      const capturedAt = new Date();
      const durationSeconds = Math.max(1, Math.round((capturedAt.getTime() - sessionStartRef.current) / 1000));

      const newSession: PracticeSession = {
        id: `sess-${Date.now()}`,
        poseId: poseToUse.id,
        poseName: poseToUse.name,
        timestamp: capturedAt.toISOString(),
        accuracyScore: finalScore,
        durationSeconds,
        corrections:
          finalScore >= 60
            ? [
                finalScore >= 90
                  ? 'Optimal kinematic form maintained'
                  : customCorrection || 'Maintain core engagement and locked joint alignment',
                'Joint angles captured for coach review; ICU compliance requires a qualified review.'
              ]
            : ['No pose match detected — adjust framing and try again.'],
        measuredAngles: { ...measuredAnglesRef.current },
        feedbackSummary:
          finalScore >= 90
            ? 'Superb joint alignment! Ready for routine integration.'
            : finalScore >= 60
              ? 'Good hold! Refine extension on highlighted joint markers.'
              : 'No detectable pose match this capture — reposition and try again.'
      };

      setLastCapturedSession(newSession);
      onSaveSession(newSession);
      setSummaryModalOpen(true);

      // The next capture measures its own practice interval.
      sessionStartRef.current = capturedAt.getTime();

      if (finalScore >= 88) {
        audioCoach.playSuccessBeep();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, 400);
  };

  // Summary modal helpers – derived from real pose data instead of hardcoded
  // measurement claims.
  const targetPoseForSummary = currentPose ?? activeTargetPose ?? allPoses[0] ?? null;
  const sessionScore = lastCapturedSession?.accuracyScore;
  const formLabel =
    sessionScore === undefined
      ? 'No capture yet'
      : sessionScore >= MASTERY_THRESHOLD
        ? 'Excellent Form'
        : sessionScore >= 60
          ? 'Solid Hold'
          : 'Needs Work';
  const angleLabel = (key: string) =>
    ({
      armSpread: 'Arm Spread',
      elbowAngle: 'Elbow Angle',
      torsoAngle: 'Torso Angle',
      standingLeg: 'Standing Leg',
      liftedLeg: 'Lifted Leg'
    }[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-hidden flex flex-col select-none">
      {/* Hidden file input for media upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Main Video / Camera Canvas */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Flash Overlay */}
        {flashOn && (
          <div className="absolute inset-0 bg-white/20 z-10 pointer-events-none transition-opacity" />
        )}

        {/* Live Webcam OR Background Imagery */}
        {useWebcam ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          </>
        ) : customMediaUrl ? (
          <img
            src={customMediaUrl}
            alt="Uploaded cheer stunt"
            className="w-full h-full object-cover"
          />
        ) : currentPose ? (
          <img
            src={currentPose.imageUrl}
            alt={currentPose.name}
            className="w-full h-full object-cover brightness-90"
          />
        ) : null}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-[#7800ce] border-4 border-white flex items-center justify-center animate-bounce shadow-2xl">
              <span className="text-6xl font-black text-white">{countdown}</span>
            </div>
          </div>
        )}

        {/* Shutter White Flash effect */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300 pointer-events-none" />
        )}

        {/* Top Controls Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 pb-4 bg-gradient-to-b from-[#050507]/90 via-[#050507]/40 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Close Camera"
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-violet-400"
            >
              <X className="w-5 h-5 text-violet-400" />
            </button>
            <button
              onClick={() => setSummaryModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold text-violet-400"
            >
              <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
              <span>Summary</span>
            </button>
          </div>

          {/* Target Pose Indicator & Switcher */}
          {showTargetSelector ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex flex-col items-center group focus:outline-none"
              >
                <span className="text-[9px] font-extrabold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-xl px-3 py-0.5 rounded-full uppercase tracking-[0.2em] mb-0.5 shadow-md flex items-center gap-1">
                  <span>Target Pose</span>
                  <ChevronDown className="w-3 h-3" />
                </span>
                <span className="text-lg md:text-xl font-extrabold text-white drop-shadow-md tracking-tight">
                  {activeTargetPose ? activeTargetPose.name : detectedPoseName}
                </span>
              </button>

              {/* Dropdown to switch poses */}
              {isDropdownOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-52 bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-left space-y-1">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-2 py-1">
                    Select Pose
                  </p>
                  {accessiblePoses.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setCurrentPose(p);
                        setDetectedPoseName(p.name);
                        setShowCorrectionBanner(true);
                        setIsDropdownOpen(false);
                        audioCoach.playSuccessBeep();
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                        activeTargetPose && p.id === activeTargetPose.id
                          ? 'bg-white text-black'
                          : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="text-[10px] opacity-60">{p.difficulty}</span>
                    </button>
                  ))}
                  {!isVerified && accessiblePoses.length < allPoses.length && (
                    <p className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-1.5 mt-1">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>Verify to unlock Intermediate & Advanced poses</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-[0.2em] mb-1">
                Target Pose
              </span>
              <span className="text-lg md:text-xl font-extrabold text-white drop-shadow-md tracking-tight">
                {activeTargetPose ? activeTargetPose.name : detectedPoseName}
              </span>
            </div>
          )}

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {audioCuesEnabled && (
              <button
                onClick={handleToggleAudio}
                className={`w-10 h-10 rounded-xl border border-white/10 backdrop-blur-xl flex items-center justify-center transition-all ${
                  audioEnabled ? 'bg-white/5 text-violet-400' : 'bg-violet-500/10 border-violet-400/30 text-violet-300'
                }`}
                title="Toggle Audio Cues"
              >
                {audioEnabled ? <Volume2 className="w-4 h-4 text-violet-400" /> : <VolumeX className="w-4 h-4 text-violet-300" />}
              </button>
            )}

            <button
              onClick={cycleTimer}
              className="px-3 h-10 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-1 text-xs font-bold hover:bg-white/10 transition-all text-violet-400"
              title="Countdown Timer"
            >
              <Timer className="w-3.5 h-3.5 text-violet-400" />
              <span>{timerDuration === 0 ? 'Off' : `${timerDuration}s`}</span>
            </button>

            <button
              onClick={() => setFlashOn(!flashOn)}
              className={`w-10 h-10 rounded-xl border border-white/10 backdrop-blur-xl flex items-center justify-center transition-all ${
                flashOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-white/5 text-white'
              }`}
              title="Virtual Flash"
            >
              {flashOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>

            {/* Native shell: camera was off — retry with the phone's camera. */}
            {isNative && !useWebcam && (
              <button
                onClick={() => setUseWebcam(true)}
                className="px-3 h-10 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-1.5 text-xs font-bold hover:bg-white/10 transition-all text-violet-300"
                title="Open the phone camera"
              >
                <CameraIcon className="w-4 h-4" />
                <span>Take Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Feedback Banner & Accuracy Ring */}
        <div className="absolute bottom-36 left-0 right-0 z-20 px-4 flex flex-col items-center pointer-events-none">
          {/* Accuracy Circular Badge */}
          <div className="relative w-16 h-16 mb-3 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/10"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-emerald-400 stroke-current transition-all duration-500"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeDasharray={`${ringAccuracy}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-base font-black text-white font-mono drop-shadow-md">{Math.round(ringAccuracy)}%</span>
            </div>
          </div>

          {/* Form Correction Banner */}
          {showCorrectionBanner && currentPose && customCorrection && (
            <div className="pointer-events-auto bg-[#12080a]/90 backdrop-blur-2xl rounded-2xl p-4 w-full max-w-sm shadow-[0_0_30px_rgba(244,63,94,0.2)] border border-rose-500/30 flex items-start gap-3 transform transition-all animate-fade-in-up">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] mb-0.5">
                  Form Correction Needed
                </h4>
                <p className="text-xs font-medium text-rose-200/90 leading-snug">
                  {customCorrection}
                </p>
              </div>
              <button
                onClick={() => setShowCorrectionBanner(false)}
                className="text-rose-400 hover:bg-rose-500/20 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Shutter & Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 px-6 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent flex items-center justify-between h-32">
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center text-white"
            title="Upload cheerleader photo/video"
          >
            <ImageIcon className="w-5 h-5 text-zinc-300" />
            <span className="text-[9px] font-semibold text-zinc-400 mt-0.5">Upload</span>
          </button>

          {/* Center Main Shutter Capture Button */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={triggerCapture}
              disabled={countdown !== null}
              aria-label="Capture Pose Snapshot"
              className="relative w-20 h-20 rounded-full border-4 border-white/40 flex items-center justify-center group focus:outline-none transition-all active:scale-95 shadow-[0_0_35px_rgba(255,255,255,0.3)] bg-[#050507]"
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:bg-zinc-200 transition-colors shadow-inner">
                <CameraIcon className="w-7 h-7 text-black group-hover:scale-110 transition-transform" />
              </div>
            </button>
          </div>

          {/* Flip / Toggle Camera */}
          <button
            onClick={handleFlipCamera}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center text-white"
            title="Flip / Enable Camera"
          >
            <RefreshCw className="w-5 h-5 text-zinc-300" />
            <span className="text-[9px] font-semibold text-zinc-400 mt-0.5">
              {useWebcam ? 'Flip' : 'Webcam'}
            </span>
          </button>
        </div>
      </div>

      {/* Summary / Analysis Result Modal - Immersive UI */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-2xl animate-fade-in-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">Kinematic Analysis</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{targetPoseForSummary?.name ?? 'Pose Analysis'} • ICU Standards Check</p>
                </div>
              </div>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Score Bento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Form Score
                  </p>
                  <p className="text-3xl font-black text-white font-mono my-1">
                    {lastCapturedSession?.accuracyScore ?? '—'}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sessionScore !== undefined && sessionScore >= MASTERY_THRESHOLD
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                    }`}
                  >
                    {formLabel}
                  </span>
                </div>

                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    ICU Execution
                  </p>
                  <p className="text-3xl font-black text-indigo-400 font-mono my-1">
                    {lastCapturedSession?.icuScore != null ? `${lastCapturedSession.icuScore} / 10` : 'Not measured'}
                  </p>
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    {sessionScore === undefined ? 'Awaiting Capture' : 'Requires coach review'}
                  </span>
                </div>
              </div>

              {/* Joint Kinematic Breakdown */}
              <div>
                <h4 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Joint Angle Calibration</span>
                </h4>
                <div className="space-y-2">
                  {lastCapturedSession?.measuredAngles && Object.keys(lastCapturedSession.measuredAngles).length > 0
                    ? Object.entries(lastCapturedSession.measuredAngles).map(([key, measured]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs"
                        >
                          <span className="font-semibold text-zinc-200">{angleLabel(key)}</span>
                          <span className="font-bold text-emerald-400 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Measured: {measured}°
                          </span>
                        </div>
                      ))
                    : (
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
                          <span className="font-semibold text-zinc-200">No valid angle measurement</span>
                          <span className="font-bold text-zinc-400 font-mono">Improve framing and try again</span>
                        </div>
                      )}
                </div>
              </div>

              {/* Coach Advice */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs">
                <p className="font-bold text-indigo-300 uppercase tracking-wider mb-1 text-[10px]">
                  Coach Cue:
                </p>
                  <p className="text-zinc-300 leading-relaxed">
                    {targetPoseForSummary?.sampleCorrectionMessage ?? 'Maintain core engagement and follow the movement cues for this pose.'}
                  </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-white/[0.08] bg-black/40 flex items-center gap-3">
              <button
                onClick={() => {
                  setSummaryModalOpen(false);
                  triggerCapture();
                }}
                className="flex-1 py-3 px-4 rounded-2xl border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/5 text-zinc-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                onClick={() => {
                  setSummaryModalOpen(false);
                  if (lastCapturedSession) {
                    onSaveSession(lastCapturedSession);
                  }
                  audioCoach.speakCue('Session saved to training history', audioEnabled);
                  onClose();
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-white text-black text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Denied modal — shown when an unverified athlete holds a premium pose */}
      {accessDenied && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl w-full max-w-sm p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-rose-500/25 backdrop-blur-2xl text-center animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Access Denied: Verification Required</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              <span className="font-semibold text-zinc-200">{activeTargetPose?.name ?? 'This pose'}</span> is an{' '}
              {activeTargetPose ? activeTargetPose.difficulty.toLowerCase() : ''} pose. Intermediate and Advanced
              poses require a verified athlete account.
            </p>
            <button
              onClick={handleCloseAccessDenied}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all"
            >
              Continue with free poses
            </button>
          </div>
        </div>
      )}

      {/* Pose engine failed to load (missing bundled assets). Blocking, because
          without the engine the camera shows video but never detects anything. */}
      {poseEngineError && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 rounded-3xl w-full max-w-sm p-6 border border-amber-500/25 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Pose Detection Unavailable</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5 break-words">{poseEngineError}</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all"
            >
              Go back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
