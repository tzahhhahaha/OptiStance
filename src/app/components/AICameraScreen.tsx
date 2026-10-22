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
  AlertTriangle,
  Target,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Pose as MediaPipePose } from '@mediapipe/pose';
import { Hands as MediaPipeHands, type InputImage, type NormalizedLandmarkListList } from '@mediapipe/hands';
import { Pose, PracticeSession, MASTERY_THRESHOLD } from '../types';
import { analyzePomMotion } from './poseLibrary';
import { scorePose, type PoseScoreResult } from '../scoring/scorePose';
import {
  drawBiomechanicalSkeleton,
  drawHandLandmarks,
  smoothHandLandmarks,
  createBrandedScorecard,
} from '../scoring/drawTelemetry';
import { JumpPeakDetector } from '../scoring/jumpPeak';
import { audioCoach } from '../utils/audio';
import { hapticFeedback } from '../utils/haptics';
import {
  getRecommendedCameraFacing,
  getCameraConstraints,
  getBrowserCameraAvailabilityError,
  isCapacitorNative,
  CameraFacing,
} from '../utils/device';
import { isPoseLocked, visiblePosesFor } from '../utils/access';
import {
  mediapipeHandsLocateFile,
  mediapipeLocateFile,
  verifyMediapipeAssets,
  verifyMediapipeHandsAssets,
} from '../utils/mediapipeAssets';
import { evaluateFraming, evaluateLightingFromSource, FramingFeedback } from '../utils/framingQuality';
import { analyzeUploadedImage, ImageQualityReport } from '../utils/imageQuality';
import { Camera, CameraDirection, MediaType } from '@capacitor/camera';

const HAND_INFERENCE_INTERVAL_MS = 100;

/**
 * Returns the specified command/cue for each target pose.
 */
export function getPoseCommandCue(pose: Pose): string {
  const cues: Record<string, string> = {
    't-motion': 'Extend arms horizontally at 180° with locked, rigid wrists.',
    'high-v': 'Lock elbows completely and align wrists at 45° angle overhead.',
    'low-v': 'Snap arms down at 45° angle with locked elbows and thumbs forward.',
    'half-t': 'Snap forearms parallel to chest line with 90° elbows and rigid wrists.',
    'liberty': 'Lock standing leg straight. Lift free knee to 90° towards chest.',
    'scorpion': 'Arch back and maintain balance while extending lifted leg upward.',
    'heel-stretch': 'Lock standing leg straight, extend lifted leg upward with tall chest.',
    'arabesque': 'Chest lifted, standing leg locked, free leg extended straight back.',
    'toe-touch': 'Snap legs wide into horizontal straddle with pointed toes and tall chest.',
  };
  return (
    cues[pose.id] ||
    pose.practiceTips?.[0]?.text ||
    pose.sampleCorrectionMessage ||
    'Ensure tight core and locked joint alignment.'
  );
}

interface AICameraScreenProps {
  initialPose?: Pose | null;
  allPoses: Pose[];
  /** Verified athletes unlock Intermediate + Advanced target poses. */
  isVerified: boolean;
  isAdmin?: boolean;
  audioCuesEnabled?: boolean;
  onClose: () => void;
  onSaveSession: (session: PracticeSession) => void;
}

export const AICameraScreen: React.FC<AICameraScreenProps> = ({
  initialPose,
  allPoses,
  isVerified,
  isAdmin = false,
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
  const [handTrackingError, setHandTrackingError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadReport, setUploadReport] = useState<{
    quality: ImageQualityReport;
    hasPerson: boolean;
    isFullBody: boolean;
    detectedPoseName: string;
    targetPoseName: string | null;
    targetAccuracy: number | null;
    framingMessage: string;
    actionableCues: string[];
  } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false);
  const [framingFeedback, setFramingFeedback] = useState<FramingFeedback>({
    status: 'adjust',
    message: 'Position yourself in front of the camera',
    isFullyInFrame: false,
    lightingStatus: 'optimal',
    distanceStatus: 'optimal'
  });
  const [showFramingGuide, setShowFramingGuide] = useState(false);
  const [showSkeletonOnPhoto, setShowSkeletonOnPhoto] = useState(true);
  const [exportWithBadge, setExportWithBadge] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [baseLegDetected, setBaseLegDetected] = useState<'left' | 'right' | null>(null);

  const activeTargetPose = currentPose;
  const showTargetSelector = !initialPose;

  // Unverified athletes only see beginner-grade target poses in the selector.
  const accessiblePoses = visiblePosesFor(allPoses, isVerified, isAdmin);

  // Running inside the Capacitor native shell (installed iOS/Android app) —
  // used to pick between WebView getUserMedia and the native camera plugin.
  const isNative = isCapacitorNative();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<MediaPipePose | null>(null);
  const handsRef = useRef<MediaPipeHands | null>(null);
  const frameLoopRef = useRef<number | null>(null);
  const isInitializingRef = useRef(false);
  const isProcessingFrameRef = useRef(false);
  const handsInitializationRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);
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
  const frameCountRef = useRef(0);
  const lightingStatusRef = useRef<'optimal' | 'low' | 'overexposed'>('optimal');
  const lastFramingMsgRef = useRef<string>('');
  const audioEnabledRef = useRef<boolean>(audioEnabled);
  const lastRealtimeCueTimeRef = useRef<number>(0);
  const lastRealtimeCueRef = useRef<string>('');
  const lastLandmarksRef = useRef<any[] | null>(null);
  const lastHandLandmarksRef = useRef<NormalizedLandmarkListList>([]);
  const smoothedHandLandmarksRef = useRef<NormalizedLandmarkListList>([]);
  const lastHandInferenceAtRef = useRef(0);
  const lastScoreResultRef = useRef<PoseScoreResult | null>(null);
  const jumpDetectorRef = useRef<JumpPeakDetector>(new JumpPeakDetector());
  const stableHoldStartRef = useRef<number | null>(null);

  useEffect(() => {
    const handleHardwareBack = (e: Event) => {
      e.preventDefault();
      if (summaryModalOpen) {
        setSummaryModalOpen(false);
      } else if (showUploadModal) {
        setShowUploadModal(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('optistance:hardware-back', handleHardwareBack);
    return () => window.removeEventListener('optistance:hardware-back', handleHardwareBack);
  }, [summaryModalOpen, showUploadModal, onClose]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

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
    const locked = !isAdmin && activeTargetPose && isPoseLocked(activeTargetPose, isVerified, isAdmin);
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
  }, [activeTargetPose?.id, activeTargetPose?.isLocked, isVerified, isAdmin, accessDenied]);

  const handleCloseAccessDenied = () => {
    setAccessDenied(false);
    setCurrentPose(null);
    setDetectedPoseName('No pose detected');
    setShowCorrectionBanner(false);
    audioCoach.stop();
    // Re-engage the camera-init effect to start the stream again.
    setUseWebcam(true);
  };

  // Manage camera media stream on facing/webcam changes.
  useEffect(() => {
    if (useWebcam) {
      void startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraFacing, useWebcam]);

  // Clean up pose engine and RAF loop only on unmount.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupPose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When target pose changes, update the target command cue. In free mode, clear corrections.
  useEffect(() => {
    if (!currentPose) {
      setCustomCorrection('');
      setShowCorrectionBanner(false);
      setAccuracy(0);
      accuracyRef.current = 0;
      setRingAccuracy(0);
      return;
    }

    const command = getPoseCommandCue(currentPose);
    setCustomCorrection(command);
  }, [currentPose]);

  useEffect(() => {
    setAudioEnabled(audioCuesEnabled);
    if (!audioCuesEnabled) {
      audioCoach.stop();
    }
  }, [audioCuesEnabled]);

  // Voice coaching on target pose selection (target mode only)
  useEffect(() => {
    if (audioEnabled && currentPose && customCorrection) {
      const timer = setTimeout(() => {
        audioCoach.speakCue(`Target pose: ${currentPose.name}. ${customCorrection}`, audioEnabled);
      }, 700);
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

  const drawHandsOverlay = (
    landmarks: NormalizedLandmarkListList,
    source: HTMLVideoElement | HTMLImageElement
  ) => {
    const canvas = handCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = 'videoWidth' in source ? source.videoWidth : source.naturalWidth;
    const height = 'videoHeight' in source ? source.videoHeight : source.naturalHeight;
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);
    drawHandLandmarks(ctx, landmarks, width, height);
  };

  const clearHandOverlay = () => {
    const canvas = handCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const cleanupHands = () => {
    const hands = handsRef.current;
    handsRef.current = null;
    lastHandLandmarksRef.current = [];
    smoothedHandLandmarksRef.current = [];
    clearHandOverlay();
    if (hands) {
      void hands.close().catch((err) => {
        console.warn('Error closing hand detector:', err);
      });
    }
  };

  const handleHandTrackingError = (error: unknown) => {
    console.error('MediaPipe hand tracking error:', error);
    const message = error instanceof Error ? error.message : String(error);
    setHandTrackingError(`Hand tracking unavailable: ${message}`);
    cleanupHands();
  };

  const sendHandFrame = async (image: InputImage) => {
    const hands = handsRef.current;
    if (!hands) return;

    try {
      await hands.send({ image });
    } catch (error) {
      handleHandTrackingError(error);
    }
  };

  const startFrameLoop = () => {
    if (frameLoopRef.current) return;
    const tick = async () => {
      if (!videoRef.current || !poseRef.current || !streamRef.current) {
        frameLoopRef.current = null;
        return;
      }
      const video = videoRef.current;
      if (useWebcam && lastHandLandmarksRef.current.length > 0) {
        smoothedHandLandmarksRef.current = smoothHandLandmarks(
          lastHandLandmarksRef.current,
          smoothedHandLandmarksRef.current
        );
        drawHandsOverlay(smoothedHandLandmarksRef.current, video);
      }
      if (!isProcessingFrameRef.current && video.readyState >= 2 && !video.paused && !video.ended) {
        isProcessingFrameRef.current = true;
        const pose = poseRef.current;
        try {
          await pose.send({ image: video });
        } catch (err) {
          console.warn('MediaPipe pose send error:', err);
        }
        const now = performance.now();
        if (handsRef.current && now - lastHandInferenceAtRef.current >= HAND_INFERENCE_INTERVAL_MS) {
          lastHandInferenceAtRef.current = now;
          await sendHandFrame(video);
        }
        isProcessingFrameRef.current = false;
      }
      frameLoopRef.current = streamRef.current ? requestAnimationFrame(tick) : null;
    };
    frameLoopRef.current = requestAnimationFrame(tick);
  };

  const cleanupPose = () => {
    isInitializingRef.current = false;
    isProcessingFrameRef.current = false;
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
    cleanupHands();
    if (poseRef.current) {
      try {
        poseRef.current.close();
      } catch (err) {
        console.warn('Error closing pose detector:', err);
      }
      poseRef.current = null;
    }
  };

  const initializeHands = async () => {
    if (handsRef.current) return;
    if (handsInitializationRef.current) return handsInitializationRef.current;

    const initialization = (async () => {
      try {
        const assetError = await verifyMediapipeHandsAssets();
        if (assetError) {
          console.error('[mediapipe hands]', assetError);
          setHandTrackingError(assetError);
          return;
        }

        const hands = new MediaPipeHands({ locateFile: mediapipeHandsLocateFile });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        hands.onResults((results) => {
          lastHandLandmarksRef.current = results.multiHandLandmarks ?? [];
          const image = imageRef.current;
          if (!lastHandLandmarksRef.current.length) {
            smoothedHandLandmarksRef.current = [];
            clearHandOverlay();
          } else if (image?.complete && image.naturalWidth > 0) {
            smoothedHandLandmarksRef.current = lastHandLandmarksRef.current;
            drawHandsOverlay(smoothedHandLandmarksRef.current, image);
          }
        });

        try {
          await hands.initialize();
          if (!isMountedRef.current) {
            await hands.close();
            return;
          }
          handsRef.current = hands;
          setHandTrackingError(null);
        } catch (error) {
          console.error('Error initializing MediaPipe hand tracking:', error);
          const message = error instanceof Error ? error.message : String(error);
          setHandTrackingError(`Hand tracking unavailable: ${message}`);
          await hands.close().catch((closeError) => {
            console.warn('Error closing hand detector after initialization failure:', closeError);
          });
        }
      } catch (error) {
        console.error('Error initializing MediaPipe hand tracking:', error);
        const message = error instanceof Error ? error.message : String(error);
        setHandTrackingError(`Hand tracking unavailable: ${message}`);
      }
    })();

    handsInitializationRef.current = initialization;
    try {
      await initialization;
    } finally {
      if (handsInitializationRef.current === initialization) {
        handsInitializationRef.current = null;
      }
    }
  };

  const initializePose = async () => {
    if (poseRef.current) {
      if (useWebcam && videoRef.current) {
        startFrameLoop();
      }
      return;
    }
    if (isInitializingRef.current || poseEngineError) return;
    isInitializingRef.current = true;

    try {
      // Confirm the vendored WASM/model files are actually in the bundle before
      // constructing the engine, so a skipped vendor step surfaces as a clear
      // message rather than a silently dead camera.
      const assetError = await verifyMediapipeAssets();
      if (assetError) {
        console.error('[mediapipe]', assetError);
        setPoseEngineError(assetError);
        return;
      }

      const pose = new MediaPipePose({
        // Served from the app bundle, not a CDN, so detection works offline.
        locateFile: mediapipeLocateFile,
      });

      pose.setOptions({
        // 0 selects pose_landmark_lite.tflite, which is the only landmark model
        // vendored into the bundle.
        modelComplexity: 0,
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
        const image = imageRef.current;
        const targetPose = currentPoseRef.current;
        if (!canvas || !ctx) return;

        const width = (useWebcam ? video?.videoWidth : image?.naturalWidth) || video?.videoWidth || image?.naturalWidth || 640;
        const height = (useWebcam ? video?.videoHeight : image?.naturalHeight) || video?.videoHeight || image?.naturalHeight || 480;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
          lastLandmarksRef.current = results.poseLandmarks;

          // Track jump frames if athlete is practicing Toe Touch
          if (targetPose && targetPose.id.includes('toe-touch')) {
            jumpDetectorRef.current.addFrame(results.poseLandmarks);
          }

          // Check environmental lighting periodically (~every second) from real video feed
          if (frameCountRef.current % 30 === 0) {
            lightingStatusRef.current = evaluateLightingFromSource(video);
          }
          frameCountRef.current++;

          const framing = evaluateFraming(results.poseLandmarks, lightingStatusRef.current);
          if (framing.message !== lastFramingMsgRef.current) {
            lastFramingMsgRef.current = framing.message;
            setFramingFeedback(framing);
          }

          const visibilityStatus = getVisibilityStatus(results.poseLandmarks);

          // Score pose using pure Biomechanical Kinematic Engine
          const scoreResult = targetPose
            ? scorePose(targetPose.id, results.poseLandmarks, { difficulty: targetPose.difficulty })
            : null;
          lastScoreResultRef.current = scoreResult;

          if (scoreResult) {
            measuredAnglesRef.current = scoreResult.measuredAngles;
            if (scoreResult.baseLeg && scoreResult.baseLeg !== baseLegDetected) {
              setBaseLegDetected(scoreResult.baseLeg);
            }
          }

          // Render color-coded biomechanical skeleton directly onto overlay canvas
          drawBiomechanicalSkeleton(ctx, results.poseLandmarks, scoreResult, width, height);

          // Compute this frame's values without triggering state updates yet.
          let nextDetectedName = detectedPoseNameRef.current;
          let nextAccuracy = accuracyRef.current;

          if (!targetPose) {
            // Free pose detection: no concluding accuracy penalty because pose was unspecified.
            nextAccuracy = 0;
            const freeAnalysis = analyzePomMotion(results.poseLandmarks.reduce((acc: Record<number, { x: number; y: number; z?: number }>, landmark: any, index: number) => {
              acc[index] = { x: landmark.x, y: landmark.y, z: landmark.z };
              return acc;
            }, {}));
            if (freeAnalysis.pose && visibilityStatus.isStrong && freeAnalysis.confidence >= 0.70) {
              nextDetectedName = freeAnalysis.pose.name;
            } else {
              nextDetectedName = 'No pose detected';
            }
          } else {
            // Target pose mode: evaluate accuracy score and form against the target pose
            if (!visibilityStatus.isEnough) {
              nextAccuracy = 0;
              nextDetectedName = 'Adjust Framing';
              setCustomCorrection('Adjust framing: keep your full body visible in frame.');
              setShowCorrectionBanner(true);
            } else if (scoreResult) {
              nextAccuracy = scoreResult.formScore;
              nextDetectedName = scoreResult.isTargetRecognized ? targetPose.name : 'Adjusting Form';
              setCustomCorrection(scoreResult.primaryCoachCue);
              setShowCorrectionBanner(nextAccuracy < 70);

              // Auto-capture stable hold detection: triggers timer when pose held stable >= 65% for 1.2s
              if (nextAccuracy >= 65 && timerDuration > 0 && countdown === null && !isCapturing && !summaryModalOpen) {
                if (stableHoldStartRef.current === null) {
                  stableHoldStartRef.current = Date.now();
                } else if (Date.now() - stableHoldStartRef.current >= 1200) {
                  stableHoldStartRef.current = null;
                  void hapticFeedback.holdMilestoneSuccess();
                  triggerCapture();
                }
              } else {
                stableHoldStartRef.current = null;
              }
            }
          }

          // Only re-render when the displayed values actually change
          if (nextDetectedName !== lastDetectedNameRef.current) {
            lastDetectedNameRef.current = nextDetectedName;
            setDetectedPoseName(nextDetectedName);
          }
          if (nextAccuracy !== lastCapturedAccuracyRef.current) {
            if (targetPose && nextAccuracy >= 80 && (lastCapturedAccuracyRef.current ?? 0) < 80) {
              void hapticFeedback.targetPoseHit();
            }
            lastCapturedAccuracyRef.current = nextAccuracy;
            setAccuracy(nextAccuracy);
          }
          accuracyRef.current = nextAccuracy;
          detectedPoseNameRef.current = nextDetectedName;

          // Real-time audio coaching cue when audio is enabled
          if (audioEnabledRef.current && !countdown && !isCapturing && !summaryModalOpen) {
            const now = Date.now();
            if (now - lastRealtimeCueTimeRef.current >= 5500) {
              if (targetPose) {
                if (!visibilityStatus.isEnough) {
                  const cue = 'Adjust framing: keep your full body in view.';
                  if (lastRealtimeCueRef.current !== cue) {
                    audioCoach.speakCue(cue, true);
                    lastRealtimeCueRef.current = cue;
                    lastRealtimeCueTimeRef.current = now;
                  }
                } else if (scoreResult && nextAccuracy < 70) {
                  const cue = scoreResult.primaryCoachCue;
                  if (cue && lastRealtimeCueRef.current !== cue) {
                    audioCoach.speakCue(cue, true);
                    lastRealtimeCueRef.current = cue;
                    lastRealtimeCueTimeRef.current = now;
                  }
                } else if (nextAccuracy >= 88) {
                  const praise = `Great hold on ${targetPose.name}! Lock it!`;
                  if (lastRealtimeCueRef.current !== praise) {
                    audioCoach.speakCue(praise, true);
                    lastRealtimeCueRef.current = praise;
                    lastRealtimeCueTimeRef.current = now;
                  }
                }
              }
            }
          }
        } else {
          if (detectedPoseNameRef.current !== 'No pose detected') {
            detectedPoseNameRef.current = 'No pose detected';
            lastDetectedNameRef.current = 'No pose detected';
            setDetectedPoseName('No pose detected');
          }
          if (accuracyRef.current !== 0) {
            accuracyRef.current = 0;
            lastCapturedAccuracyRef.current = 0;
            setAccuracy(0);
          }
        }
      });

      poseRef.current = pose;
      void initializeHands();
      if (useWebcam && videoRef.current) {
        startFrameLoop();
      }
    } catch (error) {
      console.error('Error initializing MediaPipe pose detection:', error);
      setUseWebcam(false);
    } finally {
      isInitializingRef.current = false;
    }
  };

  /**
   * Native (Capacitor) still capture. Feed the captured photo through MediaPipe
   * so scores, corrections, and skeleton overlays function accurately.
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

      const src = result.webPath ?? (result.thumbnail ? `data:image/jpeg;base64,${result.thumbnail}` : null);
      if (!src) return false;

      if (customMediaUrlRef.current) {
        URL.revokeObjectURL(customMediaUrlRef.current);
        customMediaUrlRef.current = null;
      }
      setCustomMediaUrl(src);
      setUseWebcam(false);

      const img = new Image();
      img.onload = async () => {
        if (!poseRef.current) {
          await initializePose();
        }
        await initializeHands();
        if (poseRef.current) {
          try {
            await poseRef.current.send({ image: img });
          } catch (err) {
            console.warn('Native photo pose send error:', err);
          }
        }
        await sendHandFrame(img);
      };
      img.src = src;
      return true;
    } catch (err) {
      console.error('Native camera capture failed:', err);
      return false;
    }
  };

  const startCamera = async () => {
    if (!useWebcam) return;
    setCameraError(null);
    if (!isNative) {
      const availabilityError = getBrowserCameraAvailabilityError(
        window.isSecureContext,
        typeof navigator.mediaDevices?.getUserMedia === 'function'
      );
      if (availabilityError) {
        setCameraError(availabilityError);
        setUseWebcam(false);
        return;
      }
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints(cameraFacing));
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[AICamera] video.play() error:', playErr);
        }
        if (videoRef.current.readyState >= 2) {
          void initializePose();
        } else {
          videoRef.current.onloadeddata = () => {
            void initializePose();
          };
        }
      }
    } catch (err: any) {
      // Inside the native shell fall back to the phone's native camera for a still.
      if (isNative && (await takeNativePhoto())) {
        return;
      }
      console.warn('Webcam unavailable — using media/backdrop mode:', err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const isNotFound = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
      const isBusy = err?.name === 'NotReadableError' || err?.name === 'TrackStartError';
      if (isDenied) {
        setCameraError('Camera access was denied. Please allow camera permissions in your settings.');
      } else if (isNotFound) {
        setCameraError('No camera found on this device.');
      } else if (isBusy) {
        setCameraError('Camera is currently in use by another application.');
      } else {
        setCameraError('Camera unavailable. Using practice backdrop.');
      }
      setUseWebcam(false);
    }
  };

  const stopCamera = () => {
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
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
    setIsAnalyzingUpload(true);
    setShowCorrectionBanner(false);

    const img = new Image();
    img.onload = async () => {
      // 1. Analyze image quality & blur
      const quality = analyzeUploadedImage(img);

      // 2. Ensure pose engine is ready
      if (!poseRef.current) {
        await initializePose();
      }
      await initializeHands();

      // 3. Send image to pose detection
      if (poseRef.current) {
        try {
          await poseRef.current.send({ image: img });
        } catch (err) {
          console.warn('File upload pose send error:', err);
        }
      }
      await sendHandFrame(img);

      // Wait for onResults to finish drawing and updating refs
      setTimeout(() => {
        const hasPerson = detectedPoseNameRef.current !== 'No pose detected' || accuracyRef.current > 0;
        const cues: string[] = [...quality.feedbackTips];

        if (!hasPerson) {
          cues.push('No cheerleader detected in photo. Ensure full athlete is visible and facing the camera.');
        }

        if (currentPoseRef.current) {
          const acc = accuracyRef.current;
          if (acc >= 80) {
            cues.push(`Excellent form match for ${currentPoseRef.current.name}!`);
          } else {
            cues.push(customCorrection || `Refine joint alignment to match ${currentPoseRef.current.name}.`);
          }
        } else {
          cues.push('Pose not specified: no accuracy scoring concluded. Select a target pose to get calibrated scoring.');
        }

        setUploadReport({
          quality,
          hasPerson,
          isFullBody: lastFramingMsgRef.current.includes('Optimal') || lastFramingMsgRef.current.includes('Full Body'),
          detectedPoseName: detectedPoseNameRef.current,
          targetPoseName: currentPoseRef.current?.name ?? null,
          targetAccuracy: currentPoseRef.current ? accuracyRef.current : null,
          framingMessage: lastFramingMsgRef.current || 'Framing evaluated.',
          actionableCues: cues,
        });

        setIsAnalyzingUpload(false);
        setShowUploadModal(true);

        if (quality.isBlurry) {
          audioCoach.speakCue('Warning: The image is blurry. Please upload a sharper photo.', audioEnabled);
        } else {
          audioCoach.playSuccessBeep();
        }
      }, 300);
    };
    img.src = url;

    // Allow re-selecting the same file.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerCapture = () => {
    if (countdown !== null) return; // already counting down

    const isJump = currentPose?.id.includes('toe-touch') || false;
    if (isJump) {
      jumpDetectorRef.current.start();
      audioCoach.speakCue('Five, six, seven, eight... Hit!', audioEnabled);
    }

    if (timerDuration > 0) {
      setCountdown(timerDuration);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev > 1) {
            audioCoach.playWarningBeep();
            void hapticFeedback.countdownTick();
          }
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
      void hapticFeedback.holdMilestoneSuccess();
      executeSnapshot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const executeSnapshot = () => {
    const isFreePractice = !currentPose;
    const poseToUse = currentPose ?? activeTargetPose ?? allPoses[0];
    if (!poseToUse) return;

    setIsCapturing(true);
    audioCoach.playShutterSound();

    setTimeout(() => {
      setIsCapturing(false);

      // 1. Capture actual photo frames (clean and with skeleton telemetry)
      let rawPhotoDataUrl: string | undefined;
      let telemetryPhotoDataUrl: string | undefined;
      const sourceElem = useWebcam ? videoRef.current : imageRef.current;

      if (sourceElem && typeof document !== 'undefined') {
        try {
          const sw = (sourceElem as HTMLVideoElement).videoWidth || (sourceElem as HTMLImageElement).naturalWidth || 640;
          const sh = (sourceElem as HTMLVideoElement).videoHeight || (sourceElem as HTMLImageElement).naturalHeight || 480;
          const snapCanvas = document.createElement('canvas');
          snapCanvas.width = sw;
          snapCanvas.height = sh;
          const sCtx = snapCanvas.getContext('2d');
          if (sCtx) {
            // Draw clean photo
            if (cameraFacing === 'user') {
              sCtx.save();
              sCtx.translate(sw, 0);
              sCtx.scale(-1, 1);
              sCtx.drawImage(sourceElem, 0, 0, sw, sh);
              sCtx.restore();
            } else {
              sCtx.drawImage(sourceElem, 0, 0, sw, sh);
            }
            rawPhotoDataUrl = snapCanvas.toDataURL('image/jpeg', 0.88);

            // Now draw color-coded skeleton on top for telemetry image
            const jumpApex = poseToUse.id.includes('toe-touch') ? jumpDetectorRef.current.getApexFrame().apexLandmarks : null;
            const landmarksToDraw = jumpApex || lastLandmarksRef.current;
            if (landmarksToDraw && landmarksToDraw.length >= 29) {
              if (cameraFacing === 'user') {
                const mirrored = landmarksToDraw.map((l: any) => ({ ...l, x: 1.0 - l.x }));
                drawBiomechanicalSkeleton(sCtx, mirrored, lastScoreResultRef.current, sw, sh);
              } else {
                drawBiomechanicalSkeleton(sCtx, landmarksToDraw, lastScoreResultRef.current, sw, sh);
              }
            }
            const handsToDraw = smoothedHandLandmarksRef.current.length
              ? smoothedHandLandmarksRef.current
              : lastHandLandmarksRef.current;
            drawHandLandmarks(sCtx, handsToDraw, sw, sh, cameraFacing === 'user');
            telemetryPhotoDataUrl = snapCanvas.toDataURL('image/jpeg', 0.88);
          }
        } catch (err) {
          console.warn('Snapshot canvas capture error:', err);
        }
      }

      // In target pose mode: use real accuracy score.
      const finalScore = isFreePractice
        ? (detectedPoseNameRef.current !== 'No pose detected' ? 85 : 0)
        : Math.max(0, Math.min(100, Math.round(accuracyRef.current)));

      const capturedAt = new Date();
      const durationSeconds = Math.max(1, Math.round((capturedAt.getTime() - sessionStartRef.current) / 1000));

      const scoreRes = lastScoreResultRef.current;
      const icuScoreVal = scoreRes?.icuScore ?? (finalScore >= 80 ? 9.0 : finalScore >= 60 ? 7.5 : 5.0);
      const icuTierVal = scoreRes?.icuTier ?? (finalScore >= 80 ? 'Elite' : finalScore >= 60 ? 'Proficient' : 'Form Deduction');
      const primaryCueText = scoreRes?.primaryCoachCue || customCorrection || (finalScore >= 80 ? 'Flawless execution! Routine ready.' : 'Refine joint alignment to standard.');

      const newSession: PracticeSession = {
        id: `sess-${Date.now()}`,
        poseId: isFreePractice ? 'free-practice' : poseToUse.id,
        poseName: isFreePractice
          ? (detectedPoseNameRef.current !== 'No pose detected' ? `Free Practice (${detectedPoseNameRef.current})` : 'Free Practice')
          : poseToUse.name,
        timestamp: capturedAt.toISOString(),
        accuracyScore: finalScore,
        durationSeconds,
        icuScore: icuScoreVal,
        icuTier: icuTierVal,
        baseLeg: scoreRes?.baseLeg,
        rawImage: rawPhotoDataUrl,
        capturedImage: telemetryPhotoDataUrl || rawPhotoDataUrl,
        corrections: isFreePractice
          ? ['Free pose detection mode: Select a target pose for calibrated kinematic scoring.']
          : [primaryCueText],
        measuredAngles: { ...measuredAnglesRef.current },
        feedbackSummary: primaryCueText,
      };

      setLastCapturedSession(newSession);
      onSaveSession(newSession);
      setSummaryModalOpen(true);

      // Speak primary cheer coach cue immediately upon capture
      audioCoach.speakCue(primaryCueText, audioEnabled);

      // The next capture measures its own practice interval.
      sessionStartRef.current = capturedAt.getTime();

      if (finalScore >= 80 && !isFreePractice) {
        audioCoach.playSuccessBeep();
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 }
        });
      }
    }, 350);
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

  const handleDownloadPhoto = async () => {
    if (!lastCapturedSession) return;
    setIsExporting(true);
    try {
      const baseImg = showSkeletonOnPhoto
        ? lastCapturedSession.capturedImage
        : (lastCapturedSession.rawImage || lastCapturedSession.capturedImage);
      if (!baseImg) return;
      let finalUrl = baseImg;
      if (exportWithBadge) {
        finalUrl = await createBrandedScorecard(
          baseImg,
          lastCapturedSession.poseName,
          lastCapturedSession.accuracyScore,
          lastCapturedSession.icuScore ?? 8.5,
          lastCapturedSession.feedbackSummary
        );
      }
      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = `optistance-${lastCapturedSession.poseName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Download error:', err);
    } finally {
      setIsExporting(false);
    }
  };

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
        {/* Giant Glanceable Peripheral Edge Glow (2-3m glanceability) */}
        {currentPose && (
          <div
            className={`absolute inset-0 pointer-events-none transition-all duration-300 z-10 ${
              accuracy >= 80
                ? 'shadow-[inset_0_0_80px_rgba(16,185,129,0.35)] ring-4 ring-inset ring-emerald-500/40'
                : accuracy >= 55
                ? 'shadow-[inset_0_0_80px_rgba(245,158,11,0.35)] ring-4 ring-inset ring-amber-500/40'
                : 'shadow-[inset_0_0_80px_rgba(244,63,94,0.35)] ring-4 ring-inset ring-rose-500/40'
            }`}
          />
        )}

        {/* Active Single-Leg Stunt Base Indicator */}
        {baseLegDetected && activeTargetPose && ['liberty', 'arabesque', 'heel-stretch', 'scorpion'].some(k => activeTargetPose.id.includes(k)) && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center gap-2 backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-in fade-in duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{baseLegDetected === 'left' ? 'Left' : 'Right'} Base Leg Detected</span>
          </div>
        )}

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
              className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
            />
            <canvas
              ref={handCanvasRef}
              className={`absolute inset-0 z-10 w-full h-full object-cover pointer-events-none ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
            />
          </>
        ) : customMediaUrl ? (
          <>
            <img
              ref={imageRef}
              src={customMediaUrl}
              alt="Uploaded cheer stunt"
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <canvas
              ref={handCanvasRef}
              className="absolute inset-0 z-10 w-full h-full object-cover pointer-events-none"
            />
          </>
        ) : currentPose ? (
          <img
            src={currentPose.imageUrl}
            alt={currentPose.name}
            className="w-full h-full object-cover brightness-90"
          />
        ) : null}

        {/* Camera Permission / Error Banner */}
        {cameraError && !useWebcam && (
          <div className="absolute top-20 inset-x-4 z-30 bg-amber-950/90 border border-amber-500/40 rounded-2xl p-3.5 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-200 font-medium leading-snug">{cameraError}</p>
            </div>
            <button
              onClick={() => {
                setCameraError(null);
                setUseWebcam(true);
              }}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
            >
              Retry
            </button>
          </div>
        )}
        {handTrackingError && (
          <div className="absolute top-28 inset-x-4 z-20 mx-auto max-w-lg rounded-xl border border-amber-500/30 bg-amber-950/80 px-3 py-2 text-center text-[11px] font-medium text-amber-200 backdrop-blur-md">
            {handTrackingError}
          </div>
        )}

        {/* Silhouette / Framing Guide Alignment Box */}
        {showFramingGuide && (
          <div className="absolute inset-x-8 inset-y-16 pointer-events-none z-10 flex flex-col items-center justify-between border-2 border-dashed border-indigo-400/40 rounded-3xl">
            <div className="w-full text-center py-2 bg-indigo-950/70 backdrop-blur-md rounded-t-3xl border-b border-indigo-500/20">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                Align Head at Top • Keep Feet in Lower Bounds
              </span>
            </div>
            <div className="w-14 h-14 border border-indigo-400/30 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-indigo-400/60 rounded-full" />
            </div>
            <div className="w-full text-center py-2 bg-indigo-950/70 backdrop-blur-md rounded-b-3xl border-t border-indigo-500/20">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                Full Body Posture Frame
              </span>
            </div>
          </div>
        )}

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

        {/* Upload Analysis In-Progress Indicator */}
        {isAnalyzingUpload && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest animate-pulse">
              Analyzing photo quality & pose...
            </p>
          </div>
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
                  <span>{activeTargetPose ? 'Target Pose' : 'Mode'}</span>
                  <ChevronDown className="w-3 h-3" />
                </span>
                <span className="text-lg md:text-xl font-extrabold text-white drop-shadow-md tracking-tight">
                  {activeTargetPose ? activeTargetPose.name : 'Free Detection'}
                </span>
              </button>

              {/* Dropdown to switch poses */}
              {isDropdownOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-left space-y-1">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-2 py-1">
                    Select Mode / Pose
                  </p>
                  <button
                    onClick={() => {
                      setCurrentPose(null);
                      setDetectedPoseName('No pose detected');
                      setShowCorrectionBanner(false);
                      setAccuracy(0);
                      accuracyRef.current = 0;
                      setIsDropdownOpen(false);
                      audioCoach.speakCue('Free pose detection mode', audioEnabled);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                      !activeTargetPose
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Free Detection (No Target)</span>
                    </span>
                    <span className="text-[10px] opacity-75">No Score</span>
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  {accessiblePoses.map((p) => {
                    const isPoseCurrentlyLocked = !isAdmin && isPoseLocked(p, isVerified, isAdmin);
                    return (
                      <button
                        key={p.id}
                        disabled={isPoseCurrentlyLocked}
                        onClick={() => {
                          if (isPoseCurrentlyLocked) return;
                          setCurrentPose(p);
                          setDetectedPoseName(p.name);
                          setShowCorrectionBanner(false);
                          setIsDropdownOpen(false);
                          audioCoach.playSuccessBeep();
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                          isPoseCurrentlyLocked
                            ? 'opacity-40 cursor-not-allowed text-zinc-500 bg-white/[0.02]'
                            : activeTargetPose && p.id === activeTargetPose.id
                            ? 'bg-white text-black'
                            : 'text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {p.isLocked && (
                            <Lock className={`w-3 h-3 shrink-0 ${isAdmin ? 'text-amber-400/70' : 'text-amber-400'}`} />
                          )}
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] opacity-60 shrink-0">
                          {isPoseCurrentlyLocked ? 'Locked' : p.isLocked && isAdmin ? 'Locked (Admin Access)' : p.difficulty}
                        </span>
                      </button>
                    );
                  })}
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

            <button
              onClick={() => setShowFramingGuide(!showFramingGuide)}
              className={`w-10 h-10 rounded-xl border border-white/10 backdrop-blur-xl flex items-center justify-center transition-all ${
                showFramingGuide
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/5 text-violet-400 hover:text-white'
              }`}
              title="Toggle Posture Alignment Frame"
            >
              <Target className="w-4 h-4" />
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

        {/* Environmental & Framing Feedback Indicator */}
        <div className="absolute top-28 left-0 right-0 z-20 flex justify-center pointer-events-none px-4">
          <div
            className={`px-4 py-1.5 rounded-full backdrop-blur-xl border text-xs font-bold flex items-center gap-2 shadow-lg transition-all duration-300 ${
              framingFeedback.status === 'optimal'
                ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : framingFeedback.status === 'warning'
                ? 'bg-amber-950/85 border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                : 'bg-zinc-900/90 border-white/15 text-zinc-300 shadow-[0_0_20px_rgba(0,0,0,0.6)]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                framingFeedback.status === 'optimal'
                  ? 'bg-emerald-400 animate-pulse'
                  : framingFeedback.status === 'warning'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-indigo-400'
              }`}
            />
            <span>{framingFeedback.message}</span>
          </div>
        </div>

        {/* Live Feedback Banner & Accuracy Ring */}
        <div className="absolute bottom-36 left-0 right-0 z-20 px-4 flex flex-col items-center pointer-events-none">
          {/* Target Pose Mode: Display live accuracy scoring ring and specified command */}
          {activeTargetPose ? (
            <>
              {/* Accuracy Circular Badge */}
              <div className="relative w-16 h-16 mb-2 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className={`${
                      ringAccuracy >= 80
                        ? 'text-emerald-400'
                        : ringAccuracy >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    } stroke-current transition-all duration-500`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeDasharray={`${ringAccuracy}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-base font-black text-white font-mono drop-shadow-md">
                    {Math.round(ringAccuracy)}%
                  </span>
                </div>
              </div>

              {/* Specified Command / Cue for this Pose */}
              {customCorrection && (
                <div className="mb-2 px-3.5 py-1 rounded-full bg-indigo-950/80 backdrop-blur-md border border-indigo-500/30 text-[11px] font-semibold text-indigo-200 flex items-center gap-1.5 shadow-md max-w-sm text-center">
                  <span className="text-indigo-400 font-bold shrink-0">Command:</span>
                  <span className="truncate">{customCorrection}</span>
                </div>
              )}
            </>
          ) : (
            /* Free Pose Detection: No accuracy scoring display in camera overlay, minor cue only */
            <div className="mb-3 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold text-zinc-300">
                {detectedPoseName !== 'No pose detected'
                  ? `Detected: ${detectedPoseName}`
                  : 'No pose detected'}
              </span>
            </div>
          )}

          {/* Form Correction Banner (Target Mode only - no form correction in free mode because pose not specified) */}
          {showCorrectionBanner && currentPose && customCorrection && accuracy < 75 && (
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
              {/* Captured Athlete Photo Display */}
              {lastCapturedSession?.capturedImage && (
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-2xl">
                  <img
                    src={showSkeletonOnPhoto ? lastCapturedSession.capturedImage : (lastCapturedSession.rawImage || lastCapturedSession.capturedImage)}
                    alt="Captured Cheer Pose"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setShowSkeletonOnPhoto(!showSkeletonOnPhoto)}
                      className="px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 border border-white/20 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                    >
                      {showSkeletonOnPhoto ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{showSkeletonOnPhoto ? 'Hide Skeleton' : 'Show Skeleton'}</span>
                    </button>

                    <button
                      onClick={handleDownloadPhoto}
                      disabled={isExporting}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400/30 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExporting ? 'Saving...' : 'Save Photo'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setExportWithBadge(!exportWithBadge)}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 border border-white/15 text-[9px] font-bold text-zinc-300 backdrop-blur-md"
                  >
                    {exportWithBadge ? 'Scorecard Badge ON' : 'Clean Photo'}
                  </button>
                </div>
              )}

              {/* Single-Leg Stunt Base Indicator */}
              {lastCapturedSession?.baseLeg && (
                <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-300">Base / Standing Leg Detected</span>
                  <span className="font-bold text-white capitalize">{lastCapturedSession.baseLeg} Leg Base</span>
                </div>
              )}

              {/* Score Bento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Form Score
                  </p>
                  <p className="text-3xl font-black text-white font-mono my-1">
                    {lastCapturedSession?.accuracyScore ?? '—'}%
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
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (lastCapturedSession?.icuScore ?? 0) >= 9.0
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : (lastCapturedSession?.icuScore ?? 0) >= 7.5
                        ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                        : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    }`}
                  >
                    {lastCapturedSession?.icuTier === 'Elite'
                      ? '🟢 Elite Execution'
                      : lastCapturedSession?.icuTier === 'Proficient'
                      ? '🟡 Proficient Form'
                      : lastCapturedSession?.icuTier === 'Form Deduction'
                      ? '🔴 Form Deduction'
                      : 'Measured ICU Form'}
                  </span>
                </div>
              </div>

              {/* Dynamic Cheer Coach Cue */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs shadow-inner">
                <p className="font-bold text-indigo-300 uppercase tracking-wider mb-1 text-[10px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Coach Cue</span>
                </p>
                <p className="text-zinc-100 font-medium leading-relaxed">
                  {lastCapturedSession?.feedbackSummary || 'Lock your core and maintain solid cheer alignment.'}
                </p>
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

      {/* Access Denied / Locked modal — shown when an unverified athlete holds a premium pose or pose is locked by coach */}
      {accessDenied && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl w-full max-w-sm p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-amber-500/25 backdrop-blur-2xl text-center animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7" />
            </div>
            {activeTargetPose?.isLocked ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest mb-3">
                  <Lock className="w-3 h-3" />
                  <span>Currently Unavailable</span>
                </div>
                <h3 className="text-xl font-black text-white mb-2">Pose Currently Unavailable</h3>
                <p className="text-xs text-zinc-300 leading-relaxed mb-5">
                  <span className="font-semibold text-white">{activeTargetPose?.name ?? 'This pose'}</span> has been temporarily locked by your admin. Please check back later or choose another active pose.
                </p>
                <button
                  onClick={handleCloseAccessDenied}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all"
                >
                  Choose another pose
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
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

      {/* Upload Analysis Feedback Modal */}
      {showUploadModal && uploadReport && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e0e14] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Image Analysis Results</h3>
                  <p className="text-[11px] text-zinc-400">Quality, lighting & pose diagnostics</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quality Diagnostic Badges */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {/* Sharpness Badge */}
              <div
                className={`p-3 rounded-2xl border flex flex-col gap-1 ${
                  uploadReport.quality.isBlurry
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : uploadReport.quality.sharpness === 'slight-blur'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {uploadReport.quality.isBlurry ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>
                    {uploadReport.quality.isBlurry
                      ? 'Image is Blurry'
                      : uploadReport.quality.sharpness === 'slight-blur'
                      ? 'Slight Blur'
                      : 'Sharp & Crisp'}
                  </span>
                </div>
                <p className="text-[10px] opacity-80 leading-tight">
                  {uploadReport.quality.isBlurry
                    ? 'Motion blur detected'
                    : 'Sharp edge definition'}
                </p>
              </div>

              {/* Lighting Badge */}
              <div
                className={`p-3 rounded-2xl border flex flex-col gap-1 ${
                  uploadReport.quality.lighting === 'optimal'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Zap className="w-4 h-4" />
                  <span>
                    {uploadReport.quality.lighting === 'optimal'
                      ? 'Good Lighting'
                      : uploadReport.quality.lighting === 'low'
                      ? 'Low Lighting'
                      : 'Overexposed'}
                  </span>
                </div>
                <p className="text-[10px] opacity-80 leading-tight">
                  {uploadReport.quality.lighting === 'optimal'
                    ? 'Balanced exposure'
                    : 'Adjust room light'}
                </p>
              </div>
            </div>

            {/* Pose & Framing Assessment */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {uploadReport.targetPoseName ? 'Target Pose Score' : 'Pose Detection Mode'}
                </span>
                <span className="text-xs font-bold text-indigo-300">
                  {uploadReport.targetPoseName ?? 'Free Detection'}
                </span>
              </div>

              {uploadReport.targetPoseName ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white font-mono">
                    {uploadReport.targetAccuracy ?? 0}%
                  </span>
                  <span className="text-xs text-zinc-400">Target Match</span>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-white">
                    {uploadReport.detectedPoseName !== 'No pose detected'
                      ? `Detected: ${uploadReport.detectedPoseName}`
                      : 'No specific pose detected'}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    No accuracy score computed (pose was not specified).
                  </p>
                </div>
              )}
            </div>

            {/* Actionable Feedback Tips */}
            <div className="space-y-1.5 mb-5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Analysis Feedback
              </span>
              {uploadReport.actionableCues.map((cue, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-300 flex items-start gap-2"
                >
                  <span className="text-indigo-400 font-bold mt-0.5">•</span>
                  <span className="leading-snug">{cue}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  executeSnapshot();
                  setShowUploadModal(false);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all"
              >
                Save To Practice Log
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-xs active:scale-[0.98] transition-all"
                >
                  Upload Another
                </button>
                <button
                  onClick={() => {
                    setCustomMediaUrl(null);
                    setUseWebcam(true);
                    setShowUploadModal(false);
                  }}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-xs active:scale-[0.98] transition-all"
                >
                  Live Camera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
