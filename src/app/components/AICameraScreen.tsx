import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Dumbbell,
  Minimize2,
  MoreVertical,
  Square,
  Video,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Pose as MediaPipePose } from '@mediapipe/pose';
import { Hands as MediaPipeHands, type InputImage, type NormalizedLandmarkListList } from '@mediapipe/hands';
import { Pose, PracticeSession, MASTERY_THRESHOLD } from '../types';
import { analyzePomMotion } from './poseLibrary';
import { scorePose, type PoseScoreResult } from '../scoring/scorePose';
import { recommendTrainingDrill, type TrainingDrill } from '../scoring/trainingDrills';
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
} from '../utils/device';
import { isPoseLocked, visiblePosesFor } from '../utils/access';
import {
  mediapipeHandsLocateFile,
  mediapipeLocateFile,
  verifyMediapipeAssets,
  verifyMediapipeHandsAssets,
} from '../utils/mediapipeAssets';
import { evaluateFraming, evaluateLightingFromSource } from '../utils/framingQuality';
import { analyzeUploadedImage, ImageQualityReport } from '../utils/imageQuality';
import { areImageFingerprintsSimilar, fingerprintUploadedImage } from '../utils/imageFingerprint';
import { getTodayPracticeSummary } from '../utils/todayPracticeSummary';

const HAND_INFERENCE_INTERVAL_MS = 100;
const POSE_INFERENCE_INTERVAL_MS = 1000 / 15;
const MAX_ATTEMPT_DURATION_MS = 10_000;

interface BestAttemptFrame {
  accuracy: number;
  rawImage: string;
  capturedImage: string;
  scoreResult: PoseScoreResult;
}

/**
 * Returns the specified command/cue for each target pose.
 */
export function getPoseCommandCue(pose: Pose): string {
  const cues: Record<string, string> = {
    't-motion': 'Extend arms horizontally at 180° with locked, rigid wrists.',
    'high-v': 'Lock elbows completely and align wrists at 45° angle overhead.',
    'low-v': 'Snap arms down at 45° angle with locked elbows and thumbs forward.',
    'half-t': 'Keep elbows lifted at shoulder height, bend them, and pull fists inward toward your chest.',
    'liberty': 'Lock standing leg straight. Lift free knee to 90° towards chest.',
    'scorpion': 'Arch back and maintain balance while extending lifted leg upward.',
    'heel-stretch': 'Lock standing leg straight, extend lifted leg upward with tall chest.',
    'arabesque': 'Balance on a straight standing leg, extend the rear leg near horizontal, keep your chest lifted, and reach both arms out at shoulder height.',
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
  isGuest: boolean;
  sessions: PracticeSession[];
  audioCuesEnabled?: boolean;
  showFormCorrectionOverlay?: boolean;
  autoCaptureEnabled?: boolean;
  onClose: () => void;
  onSaveSession: (session: PracticeSession) => void;
}

export const AICameraScreen: React.FC<AICameraScreenProps> = ({
  initialPose,
  allPoses,
  isVerified,
  isGuest,
  sessions,
  audioCuesEnabled = true,
  showFormCorrectionOverlay = true,
  autoCaptureEnabled = false,
  onClose,
  onSaveSession
}) => {
  const [currentPose, setCurrentPose] = useState<Pose | null>(initialPose ?? null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(audioCuesEnabled);
  const [timerDuration, setTimerDuration] = useState<number>(3); // 0, 3, 5
  const [flashOn, setFlashOn] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>(() => getRecommendedCameraFacing());
  const [useWebcam, setUseWebcam] = useState(true);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [ringAccuracy, setRingAccuracy] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isVideoAttemptRecording, setIsVideoAttemptRecording] = useState(false);
  const [videoAttemptSecondsLeft, setVideoAttemptSecondsLeft] = useState(10);
  const [videoAttemptError, setVideoAttemptError] = useState<string | null>(null);
  const [showCorrectionBanner, setShowCorrectionBanner] = useState(false);
  const [customCorrection, setCustomCorrection] = useState<string>('');
  const [detectedPoseName, setDetectedPoseName] = useState<string>('No pose detected');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryMode, setSummaryMode] = useState<'today' | 'capture'>('capture');
  const [lastCapturedSession, setLastCapturedSession] = useState<PracticeSession | null>(null);
  const [analysisSource, setAnalysisSource] = useState<'capture' | 'upload'>('capture');
  const [isFullScreenPhotoView, setIsFullScreenPhotoView] = useState(false);
  const [recommendedDrill, setRecommendedDrill] = useState<TrainingDrill | null>(null);
  const [customMediaUrl, setCustomMediaUrl] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  // Set when the bundled pose engine is missing or fails to initialise. Without
  // this the camera screen sits on a black video with no landmarks and no
  // explanation, which reads as "the app is broken".
  const [poseEngineError, setPoseEngineError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadReport, setUploadReport] = useState<{
    quality: ImageQualityReport;
    isDuplicate: boolean;
    hasPerson: boolean;
    isFullBody: boolean;
    savedToPracticeLog: boolean;
    detectedPoseName: string;
    targetPoseName: string | null;
    framingMessage: string;
    actionableCues: string[];
  } | null>(null);
  const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false);
  const [uploadAnalysisStep, setUploadAnalysisStep] = useState<'loading' | 'analyzing'>('loading');
  const [showUploadDiagnostics, setShowUploadDiagnostics] = useState(false);
  const [showFramingGuide, setShowFramingGuide] = useState(false);
  const [showSkeletonOnPhoto, setShowSkeletonOnPhoto] = useState(true);
  const [showPhotoActionsMenu, setShowPhotoActionsMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [baseLegDetected, setBaseLegDetected] = useState<'left' | 'right' | null>(null);

  const activeTargetPose = currentPose;
  const showTargetSelector = !initialPose;

  // Guests can browse all poses, but verification still controls practice access.
  const accessiblePoses = visiblePosesFor(allPoses, isVerified, isGuest);
  const handleCloseCamera = useCallback(() => {
    audioCoach.stop();
    onClose();
  }, [onClose]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoActionsMenuRef = useRef<HTMLDivElement | null>(null);
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
  const countdownActionRef = useRef<'snapshot' | 'attempt' | null>(null);
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
  const lastPoseInferenceAtRef = useRef(0);
  const lastScoreResultRef = useRef<PoseScoreResult | null>(null);
  const jumpDetectorRef = useRef<JumpPeakDetector>(new JumpPeakDetector());
  const stableHoldStartRef = useRef<number | null>(null);
  const videoAttemptRecordingRef = useRef(false);
  const bestAttemptFrameRef = useRef<BestAttemptFrame | null>(null);
  const attemptStartTimeRef = useRef(0);
  const attemptSampleAtRef = useRef(0);
  const attemptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadAnalysisRunRef = useRef(0);
  const uploadSessionSavedRef = useRef(false);

  const finishKinematicAnalysis = useCallback(() => {
    if (analysisSource === 'capture' && lastCapturedSession) {
      onSaveSession(lastCapturedSession);
      audioCoach.speakCue('Session saved to training history', audioEnabled);
    } else if (analysisSource === 'upload') {
      if (lastCapturedSession && !uploadSessionSavedRef.current) {
        uploadSessionSavedRef.current = true;
        onSaveSession(lastCapturedSession);
      }
      if (customMediaUrlRef.current) {
        URL.revokeObjectURL(customMediaUrlRef.current);
        customMediaUrlRef.current = null;
      }
      setCustomMediaUrl(null);
      setUploadReport(null);
      setUseWebcam(true);
    }
    setSummaryModalOpen(false);
    setLastCapturedSession(null);
    if (useWebcam && videoRef.current) {
      void videoRef.current.play();
    }
  }, [analysisSource, lastCapturedSession, onSaveSession, audioEnabled, useWebcam]);

  const retakeAfterAnalysis = () => {
    setSummaryModalOpen(false);
    setLastCapturedSession(null);
    if (useWebcam && videoRef.current) {
      void videoRef.current.play();
    }
    audioCoach.speakCue('Camera resumed. Ready for next stance.', audioEnabled);
  };

  useEffect(() => {
    const handleHardwareBack = (e: Event) => {
      e.preventDefault();
      if (showPhotoActionsMenu) {
        setShowPhotoActionsMenu(false);
      } else if (isFullScreenPhotoView) {
        setIsFullScreenPhotoView(false);
      } else if (summaryModalOpen) {
        if (summaryMode === 'today') {
          setSummaryModalOpen(false);
        } else {
          finishKinematicAnalysis();
        }
      } else if (lastCapturedSession) {
        setLastCapturedSession(null);
        if (useWebcam && videoRef.current) {
          void videoRef.current.play();
        }
      } else {
        handleCloseCamera();
      }
    };
    window.addEventListener('optistance:hardware-back', handleHardwareBack);
    return () => window.removeEventListener('optistance:hardware-back', handleHardwareBack);
  }, [summaryMode, summaryModalOpen, finishKinematicAnalysis, handleCloseCamera, isFullScreenPhotoView, lastCapturedSession, useWebcam, showPhotoActionsMenu]);

  useEffect(() => {
    if (!showPhotoActionsMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!photoActionsMenuRef.current?.contains(event.target as Node)) {
        setShowPhotoActionsMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowPhotoActionsMenu(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPhotoActionsMenu]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    currentPoseRef.current = currentPose;
  }, [currentPose]);

  useEffect(() => {
    if (!flashMessage) return;
    const timeout = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [flashMessage]);

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
      if (attemptTimerRef.current) {
        clearInterval(attemptTimerRef.current);
        attemptTimerRef.current = null;
      }
      videoAttemptRecordingRef.current = false;
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

  // Prevent an unverified athlete from practicing a non-beginner pose passed
  // through a stale target or direct camera launch.
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
  }, [activeTargetPose?.id, isVerified, accessDenied]);

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
      audioCoach.stop();
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

  // Voice coaching on target pose selection (target mode only) - triggers once per pose change
  useEffect(() => {
    if (audioEnabled && currentPose) {
      const command = getPoseCommandCue(currentPose);
      const timer = setTimeout(() => {
        audioCoach.speakCue(`Target pose: ${currentPose.name}. ${command}`, audioEnabled, true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentPose, audioEnabled]);

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

  const getVisibilityStatus = (landmarks: any[], isArmMotion: boolean = false) => {
    // For arm motions, only upper body (head & arms) is required
    const requiredKeys = isArmMotion
      ? [0, 11, 12, 13, 14, 15, 16]
      : [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
    const visibleCount = requiredKeys.filter((index) => {
      const landmark = landmarks[index];
      return !!landmark && (landmark.visibility ?? 0.6) > 0.15;
    }).length;

    const score = visibleCount / requiredKeys.length;
    return {
      score,
      visibleCount,
      isEnough: score >= 0.40,
      isStrong: score >= 0.65,
    };
  };

  const recordBestAttemptFrame = (
    video: HTMLVideoElement,
    landmarks: any[],
    scoreResult: PoseScoreResult | null,
    hasReliableFraming: boolean
  ) => {
    if (
      !videoAttemptRecordingRef.current ||
      !scoreResult ||
      !scoreResult.targetStandard ||
      !hasReliableFraming ||
      scoreResult.formScore <= (bestAttemptFrameRef.current?.accuracy ?? 0) ||
      performance.now() - attemptSampleAtRef.current < 120
    ) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const shouldMirror = cameraFacing === 'user';
    if (shouldMirror) {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    if (shouldMirror) ctx.restore();
    const rawImage = canvas.toDataURL('image/jpeg', 0.88);

    const displayLandmarks = shouldMirror
      ? landmarks.map((landmark) => ({ ...landmark, x: 1 - landmark.x }))
      : landmarks;
    drawBiomechanicalSkeleton(ctx, displayLandmarks, scoreResult, width, height);
    const hands = smoothedHandLandmarksRef.current.length
      ? smoothedHandLandmarksRef.current
      : lastHandLandmarksRef.current;
    drawHandLandmarks(ctx, hands, width, height, shouldMirror);

    bestAttemptFrameRef.current = {
      accuracy: scoreResult.formScore,
      rawImage,
      capturedImage: canvas.toDataURL('image/jpeg', 0.88),
      scoreResult,
    };
    attemptSampleAtRef.current = performance.now();
  };

  const finishVideoAttempt = () => {
    if (!videoAttemptRecordingRef.current) return;
    videoAttemptRecordingRef.current = false;
    void hapticFeedback.recordingToggle();
    setIsVideoAttemptRecording(false);
    if (attemptTimerRef.current) {
      clearInterval(attemptTimerRef.current);
      attemptTimerRef.current = null;
    }

    const bestFrame = bestAttemptFrameRef.current;
    if (!bestFrame) {
      setVideoAttemptError(
        'No reliable full-body frame was found. Keep your entire body visible and try again.'
      );
      return;
    }

    const poseToUse = currentPoseRef.current;
    if (!poseToUse) {
      setVideoAttemptError('The target pose changed before analysis finished. Please try again.');
      return;
    }

    const capturedAt = new Date();
    const scoreResult = bestFrame.scoreResult;
    const finalScore = Math.max(0, Math.min(100, Math.round(bestFrame.accuracy)));
    const primaryCueText = scoreResult.primaryCoachCue;
    const newSession: PracticeSession = {
      id: `sess-${Date.now()}`,
      poseId: poseToUse.id,
      poseName: poseToUse.name,
      timestamp: capturedAt.toISOString(),
      accuracyScore: finalScore,
      durationSeconds: Math.max(
        1,
        Math.round((capturedAt.getTime() - attemptStartTimeRef.current) / 1000)
      ),
      icuScore: scoreResult.icuScore,
      icuTier: scoreResult.icuTier,
      baseLeg: scoreResult.baseLeg,
      rawImage: bestFrame.rawImage,
      capturedImage: bestFrame.capturedImage,
      corrections: [primaryCueText],
      measuredAngles: { ...scoreResult.measuredAngles },
      feedbackSummary: primaryCueText,
    };

    setRecommendedDrill(recommendTrainingDrill(poseToUse, scoreResult.evaluations));
    setAnalysisSource('capture');
    setLastCapturedSession(newSession);
    setSummaryMode('capture');
    setSummaryModalOpen(true);
    setVideoAttemptError(null);
    audioCoach.speakCue(primaryCueText, audioEnabled);
    sessionStartRef.current = capturedAt.getTime();
  };

  const startVideoAttempt = () => {
    const video = videoRef.current;
    if (!currentPose || !video || video.readyState < 2) {
      setVideoAttemptError('The camera is not ready yet. Wait for the live preview, then try again.');
      return;
    }

    bestAttemptFrameRef.current = null;
    attemptSampleAtRef.current = 0;
    attemptStartTimeRef.current = Date.now();
    videoAttemptRecordingRef.current = true;
    void hapticFeedback.recordingToggle();
    setVideoAttemptError(null);
    setVideoAttemptSecondsLeft(MAX_ATTEMPT_DURATION_MS / 1000);
    setIsVideoAttemptRecording(true);
    audioCoach.speakCue('Recording started. Perform your movement, then stop when ready.', audioEnabled);

    attemptTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - attemptStartTimeRef.current;
      const remaining = Math.max(0, Math.ceil((MAX_ATTEMPT_DURATION_MS - elapsed) / 1000));
      setVideoAttemptSecondsLeft(remaining);
      if (remaining === 0) finishVideoAttempt();
    }, 200);
  };

  const handleAttemptButton = () => {
    if (isVideoAttemptRecording) {
      finishVideoAttempt();
    } else if (currentPose && useWebcam) {
      if (countdown !== null || countdownIntervalRef.current) return;
      if (timerDuration > 0) {
        countdownActionRef.current = 'attempt';
        setCountdown(timerDuration);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((previous) => {
            if (previous === null) return null;
            if (previous > 1) {
              audioCoach.playWarningBeep();
              void hapticFeedback.countdownTick();
            }
            return Math.max(0, previous - 1);
          });
        }, 1000);
      } else {
        startVideoAttempt();
      }
    }
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
    const tick = () => {
      if (!videoRef.current || !poseRef.current || !streamRef.current) {
        frameLoopRef.current = null;
        return;
      }
      frameLoopRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (video.paused || video.ended) {
        return;
      }
      if (useWebcam && lastHandLandmarksRef.current.length > 0) {
        smoothedHandLandmarksRef.current = smoothHandLandmarks(
          lastHandLandmarksRef.current,
          smoothedHandLandmarksRef.current
        );
        drawHandsOverlay(smoothedHandLandmarksRef.current, video);
      }
      const now = performance.now();
      if (
        isProcessingFrameRef.current ||
        now - lastPoseInferenceAtRef.current < POSE_INFERENCE_INTERVAL_MS ||
        video.readyState < 2
      ) {
        return;
      }
      isProcessingFrameRef.current = true;
      lastPoseInferenceAtRef.current = now;
      const pose = poseRef.current;
      void (async () => {
        try {
          await pose.send({ image: video });
          const inferenceFinishedAt = performance.now();
          if (
            handsRef.current &&
            inferenceFinishedAt - lastHandInferenceAtRef.current >= HAND_INFERENCE_INTERVAL_MS
          ) {
            lastHandInferenceAtRef.current = inferenceFinishedAt;
            await sendHandFrame(video);
          }
        } catch (err) {
          console.warn('MediaPipe inference error:', err);
        } finally {
          isProcessingFrameRef.current = false;
        }
      })();
    };
    frameLoopRef.current = requestAnimationFrame(tick);
  };

  const cleanupPose = () => {
    isInitializingRef.current = false;
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
        } catch (error) {
          console.error('Error initializing MediaPipe hand tracking:', error);
          await hands.close().catch((closeError) => {
            console.warn('Error closing hand detector after initialization failure:', closeError);
          });
        }
      } catch (error) {
        console.error('Error initializing MediaPipe hand tracking:', error);
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

  const initializePose = async (startWebcamLoop = true) => {
    if (poseRef.current) {
      if (startWebcamLoop && useWebcam && videoRef.current) {
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

          const isArmMotion = !targetPose || targetPose.category === 'Pom Motion';
          const framing = evaluateFraming(results.poseLandmarks, lightingStatusRef.current, { isArmMotion });
          lastFramingMsgRef.current = framing.message;

          const visibilityStatus = getVisibilityStatus(results.poseLandmarks, isArmMotion);

          // Score pose using pure Biomechanical Kinematic Engine
          const scoreResult = targetPose
            ? scorePose(targetPose.id, results.poseLandmarks, {
                difficulty: targetPose.difficulty,
                aspectRatio: video.videoWidth > 0 && video.videoHeight > 0
                  ? video.videoWidth / video.videoHeight
                  : 1,
              })
            : null;
          lastScoreResultRef.current = scoreResult;
          recordBestAttemptFrame(
            video,
            results.poseLandmarks,
            scoreResult,
            visibilityStatus.isEnough && framing.isFullyInFrame
          );

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
            // Free pose detection: compute real-time accuracy and detected pose
            const freeAnalysis = analyzePomMotion(results.poseLandmarks.reduce((acc: Record<number, { x: number; y: number; z?: number; visibility?: number }>, landmark: any, index: number) => {
              acc[index] = {
                x: landmark.x,
                y: landmark.y,
                z: landmark.z,
                visibility: landmark.visibility,
              };
              return acc;
            }, {}));
            if (freeAnalysis.pose && freeAnalysis.confidence >= 0.55) {
              nextDetectedName = freeAnalysis.pose.name;
              nextAccuracy = Math.max(80, Math.round(freeAnalysis.confidence * 100));
            } else {
              nextDetectedName = 'No pose detected';
              nextAccuracy = 0;
            }
          } else {
            // Target pose mode: evaluate accuracy score and form against the target pose
            if (!visibilityStatus.isEnough) {
              nextAccuracy = 0;
              nextDetectedName = 'Adjust Framing';
              setCustomCorrection(
                isArmMotion
                  ? 'Keep your upper body and arms visible in frame.'
                  : 'Adjust framing: keep your full body visible in frame.'
              );
              setShowCorrectionBanner(true);
            } else if (scoreResult) {
              nextAccuracy = scoreResult.formScore;
              nextDetectedName = scoreResult.isTargetRecognized ? targetPose.name : 'Adjusting Form';
              setCustomCorrection(scoreResult.primaryCoachCue);
              setShowCorrectionBanner(nextAccuracy < 70);

              // Capture automatically only when the athlete opts in and holds the target pose steadily.
              if (autoCaptureEnabled && nextAccuracy >= 65 && countdown === null && !isCapturing && !summaryModalOpen && !videoAttemptRecordingRef.current) {
                if (stableHoldStartRef.current === null) {
                  stableHoldStartRef.current = Date.now();
                } else if (Date.now() - stableHoldStartRef.current >= 5000) {
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
            if (nextAccuracy >= 80 && (lastCapturedAccuracyRef.current ?? 0) < 80) {
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
            if (now - lastRealtimeCueTimeRef.current >= 7500) {
              if (targetPose) {
                if (!visibilityStatus.isEnough) {
                  const cue = isArmMotion
                    ? 'Keep your upper body and arms in view.'
                    : 'Adjust framing: keep your full body in view.';
                  if (lastRealtimeCueRef.current !== cue) {
                    audioCoach.speakCue(cue, true);
                    lastRealtimeCueRef.current = cue;
                    lastRealtimeCueTimeRef.current = now;
                  }
                } else if (scoreResult && nextAccuracy < 65) {
                  const cue = scoreResult.primaryCoachCue;
                  if (cue && lastRealtimeCueRef.current !== cue) {
                    audioCoach.speakCue(cue, true);
                    lastRealtimeCueRef.current = cue;
                    lastRealtimeCueTimeRef.current = now;
                  }
                } else if (nextAccuracy >= 90) {
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
          lastLandmarksRef.current = null;
          lastScoreResultRef.current = null;
          measuredAnglesRef.current = {};
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

      await pose.initialize();
      poseRef.current = pose;
      await initializeHands();
      if (startWebcamLoop && useWebcam && videoRef.current) {
        startFrameLoop();
      }
    } catch (error) {
      console.error('Error initializing MediaPipe pose detection:', error);
      setUseWebcam(false);
    } finally {
      isInitializingRef.current = false;
    }
  };

  const startCamera = async () => {
    if (!useWebcam) return;
    setCameraError(null);
    if (!isCapacitorNative()) {
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
      setFlashOn(false);
      setFlashMessage(null);
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

  const handleToggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) {
      setFlashMessage('Turn on the live camera to use flash.');
      return;
    }

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    if (!capabilities.torch) {
      setFlashMessage('Flash is not supported by this camera or browser.');
      return;
    }

    const nextFlashOn = !flashOn;
    try {
      const advanced: Array<MediaTrackConstraintSet & { torch: boolean }> = [
        { torch: nextFlashOn },
      ];
      await track.applyConstraints({ advanced });
      setFlashOn(nextFlashOn);
      setFlashMessage(null);
    } catch (error) {
      console.warn('Camera torch could not be changed:', error);
      setFlashMessage('Could not change the camera flash setting.');
    }
  };

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    if (next) {
      audioCoach.speakCue('Audio feedback enabled', true, true);
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
    const analysisRun = ++uploadAnalysisRunRef.current;

    // Revoke the previous object URL before creating a new one.
    if (customMediaUrlRef.current) {
      URL.revokeObjectURL(customMediaUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    customMediaUrlRef.current = url;
    setCustomMediaUrl(url);
    setUseWebcam(false);
    const poseCanvas = canvasRef.current;
    const poseContext = poseCanvas?.getContext('2d');
    if (poseCanvas && poseContext) {
      poseContext.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
    }
    clearHandOverlay();
    if (frameLoopRef.current !== null) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
    setIsAnalyzingUpload(true);
    setUploadAnalysisStep('loading');
    setShowUploadDiagnostics(false);
    setLastCapturedSession(null);
    uploadSessionSavedRef.current = false;
    setUploadReport(null);
    setSummaryModalOpen(false);
    setAnalysisSource('upload');
    lastLandmarksRef.current = null;
    lastScoreResultRef.current = null;
    measuredAnglesRef.current = {};
    lastHandLandmarksRef.current = [];
    smoothedHandLandmarksRef.current = [];
    lastFramingMsgRef.current = '';
    detectedPoseNameRef.current = 'No pose detected';
    lastDetectedNameRef.current = 'No pose detected';
    accuracyRef.current = 0;
    lastCapturedAccuracyRef.current = 0;
    setDetectedPoseName('No pose detected');
    setAccuracy(0);
    setBaseLegDetected(null);
    setVideoAttemptError(null);
    setShowCorrectionBanner(false);

    const img = new Image();
    img.onload = async () => {
      if (analysisRun !== uploadAnalysisRunRef.current) return;
      try {
        const quality = analyzeUploadedImage(img);
        const imageFingerprint = fingerprintUploadedImage(img);
        const isDuplicateUpload = sessions.some(
          (session) =>
            session.source === 'upload' &&
            !!session.imageFingerprint &&
            areImageFingerprintsSimilar(session.imageFingerprint, imageFingerprint)
        );

        if (!poseRef.current) {
          await initializePose(false);
          if (analysisRun !== uploadAnalysisRunRef.current) return;
        }
        await initializeHands();
        if (analysisRun !== uploadAnalysisRunRef.current) return;

        const pose = poseRef.current;
        if (!pose) {
          throw new Error('Pose analysis is unavailable.');
        }
        setUploadAnalysisStep('analyzing');
        await Promise.all([pose.send({ image: img }), sendHandFrame(img)]);
        if (analysisRun !== uploadAnalysisRunRef.current) return;

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

        const targetPose = currentPoseRef.current;
        const scoreResult = lastScoreResultRef.current;
        setRecommendedDrill(
          targetPose && scoreResult
            ? recommendTrainingDrill(targetPose, scoreResult.evaluations)
            : null
        );
        const score = targetPose
          ? Math.max(0, Math.min(100, Math.round(accuracyRef.current)))
          : detectedPoseNameRef.current !== 'No pose detected' ? 85 : 0;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not prepare the analyzed image for saving.');
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const rawImage = canvas.toDataURL('image/jpeg', 0.88);
        const landmarks = lastLandmarksRef.current;
        if (hasPerson && landmarks && landmarks.length >= 29) {
          drawBiomechanicalSkeleton(ctx, landmarks, scoreResult, canvas.width, canvas.height);
        }
        if (hasPerson) {
          const hands = smoothedHandLandmarksRef.current.length
            ? smoothedHandLandmarksRef.current
            : lastHandLandmarksRef.current;
          drawHandLandmarks(ctx, hands, canvas.width, canvas.height, false);
        }
        const capturedImage = canvas.toDataURL('image/jpeg', 0.88);
        const capturedAt = new Date();
        const feedbackSummary = targetPose
          ? scoreResult?.primaryCoachCue ?? customCorrection ?? 'Refine joint alignment to match the target pose.'
          : 'Free pose detection mode: Select a target pose for calibrated kinematic scoring.';
        const session: PracticeSession = {
          id: `sess-${Date.now()}`,
          poseId: targetPose?.id ?? 'free-practice',
          poseName: targetPose?.name
            ?? (hasPerson ? `Free Practice (${detectedPoseNameRef.current})` : 'Free Practice'),
          source: 'upload',
          imageFingerprint,
          isDuplicateUpload,
          timestamp: capturedAt.toISOString(),
          accuracyScore: score,
          durationSeconds: 1,
          icuScore: scoreResult?.icuScore ?? (score >= 80 ? 9 : score >= 60 ? 7.5 : 5),
          icuTier: scoreResult?.icuTier ?? (score >= 80 ? 'Elite' : score >= 60 ? 'Proficient' : 'Form Deduction'),
          baseLeg: scoreResult?.baseLeg,
          rawImage,
          capturedImage,
          corrections: [feedbackSummary],
          measuredAngles: { ...(scoreResult?.measuredAngles ?? {}) },
          feedbackSummary,
        };
        setLastCapturedSession(session);
        setSummaryMode('capture');
        setSummaryModalOpen(true);

        setUploadReport({
          quality,
          isDuplicate: isDuplicateUpload,
          hasPerson,
          isFullBody: lastFramingMsgRef.current.includes('Optimal') || lastFramingMsgRef.current.includes('Full Body'),
          savedToPracticeLog: false,
          detectedPoseName: detectedPoseNameRef.current,
          targetPoseName: currentPoseRef.current?.name ?? null,
          framingMessage: lastFramingMsgRef.current || 'Framing evaluated.',
          actionableCues: cues,
        });
        setIsAnalyzingUpload(false);
        setUploadAnalysisStep('loading');

        if (quality.isBlurry) {
          audioCoach.speakCue('Warning: The image is blurry. Please upload a sharper photo.', audioEnabled);
        } else {
          audioCoach.playSuccessBeep();
        }
      } catch (error) {
        if (analysisRun !== uploadAnalysisRunRef.current) return;
        console.error('Uploaded image analysis failed:', error);
        setIsAnalyzingUpload(false);
        setUploadAnalysisStep('loading');
        setVideoAttemptError('Image analysis failed. Please try uploading the image again.');
      }
    };
    img.onerror = () => {
      if (analysisRun !== uploadAnalysisRunRef.current) return;
      setIsAnalyzingUpload(false);
      setUploadAnalysisStep('loading');
      setVideoAttemptError('The selected image could not be loaded. Please choose another image.');
    };
    img.src = url;

    // Allow re-selecting the same file.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelUploadAnalysis = () => {
    uploadAnalysisRunRef.current += 1;
    setIsAnalyzingUpload(false);
    setUploadAnalysisStep('loading');
    setVideoAttemptError(null);
    const poseCanvas = canvasRef.current;
    const poseContext = poseCanvas?.getContext('2d');
    if (poseCanvas && poseContext) {
      poseContext.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
    }
    clearHandOverlay();
  };

  const triggerCapture = () => {
    // Use the ref (not the `countdown` state) as the guard: this function is also
    // called from the detection loop, whose closure can hold a stale `countdown`.
    if (countdown !== null || countdownIntervalRef.current) return; // already counting down

    const isJump = currentPose?.id.includes('toe-touch') || false;
    if (isJump) {
      jumpDetectorRef.current.start();
      audioCoach.speakCue('Five, six, seven, eight... Hit!', audioEnabled);
    }

    if (timerDuration > 0) {
      countdownActionRef.current = 'snapshot';
      setCountdown(timerDuration);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev > 1) {
            audioCoach.playWarningBeep();
            void hapticFeedback.countdownTick();
          }
          return Math.max(0, prev - 1);
        });
      }, 1000);
    } else {
      executeSnapshot();
    }
  };

  // When the countdown reaches 0, stop the timer and run the capture.
  useEffect(() => {
    if (countdown !== null && countdown <= 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdown(null);
      void hapticFeedback.holdMilestoneSuccess();
      const action = countdownActionRef.current;
      countdownActionRef.current = null;
      if (action === 'attempt') {
        startVideoAttempt();
      } else {
        executeSnapshot();
      }
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
      let landmarksToDraw: typeof lastLandmarksRef.current = null;
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
            const shouldMirror = useWebcam && cameraFacing === 'user';
            // Draw clean photo (only mirror live front webcam, never uploaded photos)
            if (shouldMirror) {
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
            landmarksToDraw = jumpApex || lastLandmarksRef.current;
            if (landmarksToDraw && landmarksToDraw.length >= 29) {
              if (shouldMirror) {
                const mirrored = landmarksToDraw.map((l: any) => ({ ...l, x: 1.0 - l.x }));
                drawBiomechanicalSkeleton(sCtx, mirrored, lastScoreResultRef.current, sw, sh);
              } else {
                drawBiomechanicalSkeleton(sCtx, landmarksToDraw, lastScoreResultRef.current, sw, sh);
              }
            }
            const handsToDraw = smoothedHandLandmarksRef.current.length
              ? smoothedHandLandmarksRef.current
              : lastHandLandmarksRef.current;
            drawHandLandmarks(sCtx, handsToDraw, sw, sh, shouldMirror);
            telemetryPhotoDataUrl = snapCanvas.toDataURL('image/jpeg', 0.88);
          }
        } catch (err) {
          console.warn('Snapshot canvas capture error:', err);
        }
      }

      // Freeze live video feed so the camera scene becomes a still frame
      if (useWebcam && videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (pauseErr) {
          console.warn('Error pausing video feed on capture:', pauseErr);
        }
      }

      // In free practice, re-analyze the exact snapshot frame landmarks
      let detectedNameOnSnap = detectedPoseNameRef.current;
      let snapConfidence = 0.85;
      if (isFreePractice && landmarksToDraw && landmarksToDraw.length >= 29) {
        const snapAnalysis = analyzePomMotion(landmarksToDraw.reduce((acc: Record<number, { x: number; y: number; z?: number; visibility?: number }>, landmark: any, index: number) => {
          acc[index] = {
            x: landmark.x,
            y: landmark.y,
            z: landmark.z,
            visibility: landmark.visibility,
          };
          return acc;
        }, {}));
        if (snapAnalysis.pose && snapAnalysis.confidence >= 0.55) {
          detectedNameOnSnap = snapAnalysis.pose.name;
          snapConfidence = snapAnalysis.confidence;
        }
      }

      const hasFreePose = isFreePractice && detectedNameOnSnap !== 'No pose detected';
      const finalScore = isFreePractice
        ? (hasFreePose ? Math.max(85, Math.round(snapConfidence * 100)) : 0)
        : Math.max(0, Math.min(100, Math.round(accuracyRef.current)));

      const capturedAt = new Date();
      const durationSeconds = Math.max(1, Math.round((capturedAt.getTime() - sessionStartRef.current) / 1000));

      const scoreRes = lastScoreResultRef.current;
      setRecommendedDrill(
        !isFreePractice && scoreRes ? recommendTrainingDrill(poseToUse, scoreRes.evaluations) : null
      );
      const icuScoreVal = scoreRes?.icuScore ?? (finalScore >= 80 ? 9.0 : finalScore >= 60 ? 7.5 : 5.0);
      const icuTierVal = scoreRes?.icuTier ?? (finalScore >= 80 ? 'Elite' : finalScore >= 60 ? 'Proficient' : 'Form Deduction');
      const primaryCueText = scoreRes?.primaryCoachCue || customCorrection || (finalScore >= 80 ? (hasFreePose ? `Great form hold on ${detectedNameOnSnap}!` : 'Flawless execution! Routine ready.') : 'Refine joint alignment to standard.');

      const newSession: PracticeSession = {
        id: `sess-${Date.now()}`,
        poseId: isFreePractice ? (hasFreePose ? `free-${detectedNameOnSnap.toLowerCase().replace(/\s+/g, '-')}` : 'free-practice') : poseToUse.id,
        poseName: isFreePractice
          ? (hasFreePose ? `Free Practice (${detectedNameOnSnap})` : 'Free Practice')
          : poseToUse.name,
        timestamp: capturedAt.toISOString(),
        accuracyScore: finalScore,
        durationSeconds,
        icuScore: icuScoreVal,
        icuTier: icuTierVal,
        baseLeg: scoreRes?.baseLeg,
        rawImage: rawPhotoDataUrl,
        capturedImage: telemetryPhotoDataUrl || rawPhotoDataUrl,
        corrections: [primaryCueText],
        measuredAngles: { ...measuredAnglesRef.current },
        feedbackSummary: primaryCueText,
      };

      setAnalysisSource('capture');
      setLastCapturedSession(newSession);
      setSummaryMode('capture');
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
  const todayDateLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(new Date());
  const hasRecognizedSummaryPose = (lastCapturedSession?.accuracyScore ?? 0) >= 40;
  const summaryPoseLabel = hasRecognizedSummaryPose
    ? analysisSource === 'upload' && uploadReport
      ? uploadReport.targetPoseName
        ?? (uploadReport.detectedPoseName !== 'No pose detected'
          ? `Free Detection: ${uploadReport.detectedPoseName}`
          : null)
      : lastCapturedSession?.poseName ?? null
    : null;
  const summaryPoseLabelText = summaryPoseLabel ?? 'No pose detected';
  const summarySubtitle = summaryMode === 'today'
    ? todayDateLabel
    : [
        analysisSource === 'upload' ? 'Uploaded Image' : null,
        summaryPoseLabelText,
        analysisSource === 'upload' && !uploadReport?.targetPoseName
          ? 'Image & pose diagnostics'
          : 'ICU Standards Check',
      ].filter((part): part is string => Boolean(part)).join(' • ');
  const uploadDetectedPoseLabel = hasRecognizedSummaryPose && uploadReport
    ? uploadReport.targetPoseName ?? uploadReport.detectedPoseName
    : 'No pose detected';
  const sessionScore = lastCapturedSession?.accuracyScore;
  const todaySummary = getTodayPracticeSummary(sessions);
  const practiceTimeLabel = todaySummary.practiceSeconds < 60
    ? `${todaySummary.practiceSeconds}s`
    : `${Math.floor(todaySummary.practiceSeconds / 60)}m ${todaySummary.practiceSeconds % 60}s`;
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
      finalUrl = await createBrandedScorecard(
        baseImg,
        lastCapturedSession.poseName,
        lastCapturedSession.accuracyScore,
        lastCapturedSession.icuScore ?? 8.5,
        lastCapturedSession.feedbackSummary
      );
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

  const renderPhotoActionsMenu = (isFullScreen = false) => (
    <div ref={photoActionsMenuRef} className="absolute top-3 right-3 z-20">
      <button
        type="button"
        aria-label="More photo actions"
        aria-haspopup="menu"
        aria-expanded={showPhotoActionsMenu}
        onClick={() => setShowPhotoActionsMenu((open) => !open)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-black/75 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {showPhotoActionsMenu && (
        <div
          role="menu"
          aria-label="Photo actions"
          className="absolute right-0 top-full mt-2 min-w-40 overflow-hidden rounded-xl border border-white/15 bg-zinc-950/95 p-1 shadow-xl backdrop-blur-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setShowPhotoActionsMenu(false);
              setIsFullScreenPhotoView(!isFullScreen);
            }}
            className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
          >
            {isFullScreen ? 'Exit Full View' : 'Full View'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setShowPhotoActionsMenu(false);
              void handleDownloadPhoto();
            }}
            disabled={isExporting}
            className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10 disabled:cursor-wait disabled:opacity-60"
          >
            {isExporting ? 'Saving...' : 'Save Photo'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setShowSkeletonOnPhoto((visible) => !visible);
              setShowPhotoActionsMenu(false);
            }}
            className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
          >
            {showSkeletonOnPhoto ? 'Hide Skeleton' : 'Show Skeleton'}
          </button>
        </div>
      )}
    </div>
  );

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
        {currentPose && !isAnalyzingUpload && (
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
        {!isAnalyzingUpload && !lastCapturedSession && baseLegDetected && activeTargetPose && ['liberty', 'arabesque', 'heel-stretch', 'scorpion'].some(k => activeTargetPose.id.includes(k)) && (
          <div className="absolute top-[calc(env(safe-area-inset-top,0px)+68px)] left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center gap-2 backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-in fade-in duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{baseLegDetected === 'left' ? 'Left' : 'Right'} Base Leg Detected</span>
          </div>
        )}

        {/* Live Webcam OR Background Imagery */}
        {useWebcam ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`relative z-0 w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 z-[5] w-full h-full object-cover pointer-events-none ${isAnalyzingUpload ? 'hidden' : ''} ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
            />
            <canvas
              ref={handCanvasRef}
              className={`absolute inset-0 z-10 w-full h-full object-cover pointer-events-none ${isAnalyzingUpload ? 'hidden' : ''} ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
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
              className={`absolute inset-0 z-[5] w-full h-full object-cover pointer-events-none ${
                isAnalyzingUpload || (analysisSource === 'upload' && !lastCapturedSession) ? 'hidden' : ''
              }`}
            />
            <canvas
              ref={handCanvasRef}
              className={`absolute inset-0 z-10 w-full h-full object-cover pointer-events-none ${
                isAnalyzingUpload || (analysisSource === 'upload' && !lastCapturedSession) ? 'hidden' : ''
              }`}
            />
          </>
        ) : currentPose ? (
          <img
            src={currentPose.imageUrl}
            alt={currentPose.name}
            className="w-full h-full object-cover brightness-90"
          />
        ) : null}

        {/* Frozen Still Capture Overlay - Displays Full Uncropped Pose with Skeleton */}
        {!isAnalyzingUpload && lastCapturedSession?.capturedImage && (
          <div className="absolute inset-0 z-15 flex items-center justify-center bg-black">
            <img
              src={showSkeletonOnPhoto ? lastCapturedSession.capturedImage : (lastCapturedSession.rawImage || lastCapturedSession.capturedImage)}
              alt="Frozen Kinematic Stance"
              className="w-full h-full object-contain select-none"
            />
          </div>
        )}

        {/* Camera Permission / Error Banner */}
        {!isAnalyzingUpload && cameraError && !useWebcam && (
          <div className="absolute top-[calc(env(safe-area-inset-top,0px)+68px)] inset-x-4 z-30 bg-amber-950/90 border border-amber-500/40 rounded-2xl p-3.5 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-200 font-medium leading-snug">{cameraError}</p>
            </div>
            <button
              disabled={isVideoAttemptRecording}
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
        {/* Silhouette / Framing Guide Alignment Box */}
        {!isAnalyzingUpload && showFramingGuide && !lastCapturedSession && (
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
        {!isAnalyzingUpload && countdown !== null && (
          <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-[#7800ce] border-4 border-white flex items-center justify-center animate-bounce shadow-2xl">
              <span className="text-6xl font-black text-white">{countdown}</span>
            </div>
          </div>
        )}

        {/* Shutter White Flash effect */}
        {!isAnalyzingUpload && isCapturing && (
          <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300 pointer-events-none" />
        )}

        {/* Upload Analysis In-Progress Indicator */}
        {isAnalyzingUpload && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest animate-pulse">
              {uploadAnalysisStep === 'loading' ? 'Preparing pose analysis...' : 'Analyzing the pose...'}
            </p>
            <button
              type="button"
              onClick={cancelUploadAnalysis}
              className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <X className="h-4 w-4" />
              Cancel analysis
            </button>
          </div>
        )}

        {/* Top Controls Overlay - Safe-Area Aware & Ergonomic */}
        {!isAnalyzingUpload && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 safe-top-camera pb-3 bg-gradient-to-b from-[#050507]/90 via-[#050507]/40 to-transparent grid grid-cols-[1fr_auto_1fr] items-center pointer-events-none">
          {/* Left: Close Button */}
          <div className="flex items-center gap-2 pointer-events-auto justify-self-start">
            <button
              onClick={handleCloseCamera}
              aria-label="Close Camera"
              className="w-10 h-10 rounded-2xl bg-[#09090d]/80 border border-white/15 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white shadow-lg"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Center: Target Pose Indicator & Switcher */}
          <div className="pointer-events-auto max-w-[min(58vw,420px)] text-center justify-self-center">
            {showTargetSelector ? (
              <div className="relative inline-block">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isVideoAttemptRecording}
                  className="flex flex-col items-center group focus:outline-none"
                >
                  <span className="text-[9px] font-extrabold text-indigo-300 bg-indigo-500/25 border border-indigo-400/40 backdrop-blur-xl px-2.5 py-0.5 rounded-full uppercase tracking-[0.18em] mb-0.5 shadow-md flex items-center gap-1">
                    <span>{activeTargetPose ? 'Target Pose' : 'Mode'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </span>
                  <span className="text-base sm:text-lg font-black text-white drop-shadow-md tracking-tight truncate max-w-[170px] sm:max-w-xs block">
                    {activeTargetPose ? activeTargetPose.name : 'Free Detection'}
                  </span>
                </button>

                {/* Dropdown to switch poses */}
                {isDropdownOpen && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-60 max-h-80 overflow-y-auto bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-left space-y-1">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-2 py-1">
                      Select Pose
                    </p>
                    <button
                      onClick={() => {
                        setCurrentPose(null);
                        setDetectedPoseName('No pose detected');
                        setShowCorrectionBanner(false);
                        setAccuracy(0);
                        accuracyRef.current = 0;
                        setIsDropdownOpen(false);
                        audioCoach.speakCue('Free pose detection mode', audioEnabled, true);
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
                      const isPoseCurrentlyLocked = isPoseLocked(p, isVerified);
                      return (
                        <button
                          key={p.id}
                          disabled={isPoseCurrentlyLocked || isVideoAttemptRecording}
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
                            <span className="truncate">{p.name}</span>
                          </div>
                          <span className="text-[10px] opacity-60 shrink-0">
                            {isPoseCurrentlyLocked ? 'Locked' : p.difficulty}
                          </span>
                        </button>
                      );
                    })}
                    {!isVerified && accessiblePoses.some((pose) => isPoseLocked(pose, isVerified)) && (
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
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-[0.18em] mb-0.5">
                  Target Pose
                </span>
                <span className="text-base sm:text-lg font-black text-white drop-shadow-md tracking-tight truncate max-w-[170px] sm:max-w-xs block">
                  {activeTargetPose ? activeTargetPose.name : detectedPoseName}
                </span>
              </div>
            )}
          </div>

          {/* Right: Summary / Stats Button */}
          <div className="flex items-center gap-2 pointer-events-auto justify-self-end">
            <button
              onClick={() => {
                setSummaryMode('today');
                setSummaryModalOpen(true);
              }}
              className="h-10 w-10 rounded-2xl bg-[#09090d]/80 border border-white/15 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-xs font-bold text-white shadow-lg"
              title="Practice Summary"
              aria-label="Practice Summary"
            >
              <BarChart2 className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
        </div>
        )}

        {/* Right-Hand Floating Camera Tools Dock (Vertical Ergonomic Toolbar) */}
        {!isAnalyzingUpload && !lastCapturedSession && (
          <div className="absolute right-3.5 camera-tool-dock z-20 flex flex-col items-center gap-2.5">
          {audioCuesEnabled && (
            <button
              onClick={handleToggleAudio}
              className={`w-10 h-10 rounded-2xl border backdrop-blur-xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                audioEnabled
                  ? 'bg-indigo-600/90 border-indigo-400 text-white shadow-indigo-600/30'
                  : 'bg-[#09090d]/80 border-white/15 text-zinc-400 hover:text-white'
              }`}
              title={audioEnabled ? 'Audio Coaching Cues On' : 'Audio Coaching Cues Muted'}
              aria-label="Toggle Audio Coaching Cues"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={cycleTimer}
            className="w-10 h-10 rounded-2xl bg-[#09090d]/80 border border-white/15 backdrop-blur-xl flex flex-col items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white shadow-lg"
            title="Countdown Timer (0s, 3s, 5s)"
            aria-label="Countdown Timer"
          >
            <Timer className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-[9px] font-black leading-none mt-0.5">{timerDuration === 0 ? '0s' : `${timerDuration}s`}</span>
          </button>

          <div className="relative">
            <button
              onClick={() => void handleToggleFlash()}
              className={`w-10 h-10 rounded-2xl border backdrop-blur-xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                flashOn
                  ? 'bg-amber-400 border-amber-300 text-black shadow-amber-400/30'
                  : 'bg-[#09090d]/80 border-white/15 text-zinc-300 hover:text-white'
              }`}
              title={flashOn ? 'Turn off camera flash' : 'Turn on camera flash'}
              aria-label={flashOn ? 'Turn off camera flash' : 'Turn on camera flash'}
            >
              {flashOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
            {flashMessage && (
              <p
                role="status"
                className="absolute right-full top-1/2 z-30 mr-2 w-max max-w-32 -translate-y-1/2 rounded-lg bg-black/90 px-2 py-1 text-center text-[10px] text-amber-200 shadow-lg"
              >
                {flashMessage}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowFramingGuide(!showFramingGuide)}
            className={`w-10 h-10 rounded-2xl border backdrop-blur-xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
              showFramingGuide
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/30'
                : 'bg-[#09090d]/80 border-white/15 text-zinc-300 hover:text-white'
            }`}
            title="Toggle Posture Alignment Frame"
            aria-label="Toggle Posture Alignment Frame"
          >
            <Target className="w-4 h-4" />
          </button>

          <button
            onClick={handleFlipCamera}
            disabled={isVideoAttemptRecording}
            className="w-10 h-10 rounded-2xl bg-[#09090d]/80 border border-white/15 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white shadow-lg disabled:opacity-50"
            title={useWebcam ? 'Flip camera' : 'Enable live camera'}
            aria-label={useWebcam ? 'Flip camera' : 'Enable live camera'}
          >
            <RefreshCw className="w-4 h-4 text-zinc-300" />
          </button>
        </div>
        )}

        {/* Capture and recording feedback */}
        {!isAnalyzingUpload && (lastCapturedSession || isVideoAttemptRecording || videoAttemptError) && (
        <div className="absolute camera-indicator-top left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-20 flex justify-center pointer-events-none">
          {lastCapturedSession ? (
            <div className="px-4 py-1.5 rounded-full bg-[#0d0d12]/90 backdrop-blur-xl border border-indigo-500/40 text-xs font-bold text-white shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Still Frame Captured • Review Full Pose</span>
            </div>
          ) : isVideoAttemptRecording ? (
            <div role="status" className="px-4 py-1.5 rounded-full bg-rose-950/90 backdrop-blur-xl border border-rose-500/50 text-xs font-bold text-rose-200 shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span>Analyzing attempt • {videoAttemptSecondsLeft}s left • tap stop to finish</span>
            </div>
          ) : videoAttemptError ? (
            <div role="alert" className="px-4 py-1.5 rounded-full bg-rose-950/90 backdrop-blur-xl border border-rose-500/50 text-xs font-bold text-rose-200 shadow-xl text-center">
              {videoAttemptError}
            </div>
          ) : null}
        </div>
        )}

        {/* Live Feedback Banner & Accuracy Ring */}
        {!isAnalyzingUpload && !lastCapturedSession && (
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

            </>
          ) : (
            /* Free Pose Detection: No accuracy scoring display in camera overlay, minor cue only */
            <>
              {detectedPoseName !== 'No pose detected' && (
                <div className="mb-3 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span className="text-xs font-semibold text-zinc-300">
                    {`Detected: ${detectedPoseName}`}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Form Correction Banner (Target Mode only - no form correction in free mode because pose not specified) */}
          {showFormCorrectionOverlay && showCorrectionBanner && currentPose && customCorrection && accuracy < 75 && (
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
        )}

        {/* Bottom Shutter & Controls Bar - Elevated for Mobile Home Bar */}
        {!isAnalyzingUpload && (
        <div className="absolute bottom-0 left-0 right-0 z-30 safe-bottom-shutter pt-4 px-6 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent">
          <div className="relative flex h-20 w-full items-center justify-between">
          {lastCapturedSession ? (
            analysisSource === 'upload' ? (
              <div className="w-full flex items-center justify-between gap-3 pb-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-zinc-300" />
                  <span>Upload Another</span>
                </button>
                <button
                  onClick={() => {
                    setSummaryMode('capture');
                    setSummaryModalOpen(true);
                  }}
                  className="flex-1 py-3 px-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border border-indigo-400/30 text-xs font-black text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-95 transition-all"
                >
                  <Award className="w-4 h-4 text-indigo-200" />
                  <span>View Analysis</span>
                </button>
                <button
                  onClick={() => {
                    setLastCapturedSession(null);
                    setUploadReport(null);
                    setCustomMediaUrl(null);
                    setUseWebcam(true);
                  }}
                  className="flex-1 py-3 px-3 rounded-2xl bg-white text-black text-xs font-black flex items-center justify-center gap-2 hover:bg-zinc-200 shadow-md active:scale-95 transition-all"
                >
                  <CameraIcon className="w-4 h-4 text-black" />
                  <span>Live Camera</span>
                </button>
              </div>
            ) : (
            /* Review Actions Dock for Still Kinematic Image */
            <div className="w-full flex items-center justify-between gap-3 pb-2">
              <button
                onClick={() => {
                  setLastCapturedSession(null);
                  setSummaryModalOpen(false);
                  if (useWebcam && videoRef.current) {
                    void videoRef.current.play();
                  }
                  audioCoach.speakCue('Camera resumed. Ready for next stance.', audioEnabled);
                }}
                className="flex-1 py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4 text-zinc-300" />
                <span>Retake</span>
              </button>

              <button
                onClick={() => {
                  setSummaryMode('capture');
                  setSummaryModalOpen(true);
                }}
                className="flex-1 py-3 px-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border border-indigo-400/30 text-xs font-black text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-95 transition-all"
              >
                <Award className="w-4 h-4 text-indigo-200" />
                <span>View Analysis</span>
              </button>

              <button
                onClick={() => {
                  if (lastCapturedSession) {
                    onSaveSession(lastCapturedSession);
                    setLastCapturedSession(null);
                  }
                  if (useWebcam && videoRef.current) {
                    void videoRef.current.play();
                  }
                  audioCoach.speakCue('Session saved to training history', audioEnabled);
                  onClose();
                }}
                className="flex-1 py-3 px-3 rounded-2xl bg-white text-black text-xs font-black flex items-center justify-center gap-2 hover:bg-zinc-200 shadow-md active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>Save</span>
              </button>
            </div>
            )
          ) : (
            <>
              <div className="absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 grid-cols-[3rem_5rem_3rem] items-center gap-2">
                {useWebcam ? (
                  <button
                    onClick={handleAttemptButton}
                    disabled={!currentPose || countdown !== null}
                    aria-label={
                      isVideoAttemptRecording
                        ? 'Stop and analyze attempt'
                        : currentPose
                          ? 'Start 10-second pose attempt'
                          : 'Select a target pose to record an attempt'
                    }
                    title={
                      isVideoAttemptRecording
                        ? 'Stop and analyze attempt'
                        : currentPose
                          ? 'Record pose attempt for up to 10 seconds'
                          : 'Select a target pose to enable recording'
                    }
                    className={`w-12 h-12 rounded-2xl border backdrop-blur-xl flex items-center justify-center transition-all duration-300 ease-out active:scale-95 disabled:opacity-50 motion-reduce:transition-none ${
                      isVideoAttemptRecording
                        ? 'scale-105 bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/30'
                        : currentPose
                          ? 'bg-rose-950/80 border-rose-400/70 text-rose-200 hover:bg-rose-900'
                          : 'bg-white/5 border-white/15 text-zinc-500'
                    }`}
                  >
                    <span className="relative h-5 w-5">
                      <Video
                        aria-hidden="true"
                        className={`absolute inset-0 h-5 w-5 transition-all duration-200 ease-out motion-reduce:transition-none ${
                          isVideoAttemptRecording
                            ? 'rotate-12 scale-75 opacity-0'
                            : 'rotate-0 scale-100 opacity-100'
                        }`}
                      />
                      <Square
                        aria-hidden="true"
                        className={`absolute inset-0 h-5 w-5 fill-current transition-all duration-200 ease-out motion-reduce:transition-none ${
                          isVideoAttemptRecording
                            ? 'rotate-0 scale-100 opacity-100'
                            : '-rotate-12 scale-75 opacity-0'
                        }`}
                      />
                    </span>
                  </button>
                ) : <span aria-hidden="true" />}

                <button
                  onClick={triggerCapture}
                  disabled={countdown !== null || isVideoAttemptRecording || (!useWebcam && !!customMediaUrl)}
                  aria-label={!useWebcam && customMediaUrl ? 'Camera capture unavailable for uploaded image' : 'Capture Pose Snapshot'}
                  className="w-20 h-20 rounded-full border-4 border-white/40 bg-[#050507] flex items-center justify-center group focus:outline-none transition-all active:scale-95 shadow-[0_0_35px_rgba(255,255,255,0.3)] disabled:opacity-50"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:bg-zinc-200 transition-colors shadow-inner">
                    <CameraIcon className="w-7 h-7 text-black group-hover:scale-110 transition-transform" />
                  </div>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isVideoAttemptRecording}
                  aria-label="Upload image or video"
                  title="Upload cheerleader photo/video"
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white disabled:opacity-50"
                >
                  <ImageIcon className="w-5 h-5 text-zinc-300" />
                </button>
              </div>

            </>
          )}
          </div>
        </div>
        )}
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
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    {summaryMode === 'today' ? "Today's Practice Summary" : 'Kinematic Analysis'}
                  </h3>
                  {summarySubtitle && (
                    <p className="text-xs text-zinc-400 mt-0.5">{summarySubtitle}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {summaryMode === 'today' ? (
                todaySummary.sessionCount === 0 ? (
                  <div className="flex flex-col items-center text-center py-10">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                      <BarChart2 className="w-7 h-7 text-indigo-400" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">No poses practiced today yet</h4>
                    <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
                      Complete a pose practice session and your progress for today will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sessions</p>
                        <p className="text-2xl font-black text-white font-mono mt-1">{todaySummary.sessionCount}</p>
                      </div>
                      <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Poses Practiced</p>
                        <p className="text-2xl font-black text-indigo-400 font-mono mt-1">{todaySummary.poses.length}</p>
                      </div>
                      <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Best Score</p>
                        <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{todaySummary.bestScore}%</p>
                      </div>
                      <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Average Score</p>
                        <p className="text-2xl font-black text-amber-300 font-mono mt-1">{todaySummary.averageScore}%</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/25 flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-200">Total Practice Time</span>
                      <span className="text-sm font-black text-white font-mono">{practiceTimeLabel}</span>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em]">
                        Poses Practiced
                      </h4>
                      <div className="space-y-2">
                        {todaySummary.poses.map((pose) => (
                          <div
                            key={pose.poseId}
                            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs"
                          >
                            <span className="font-semibold text-zinc-100">{pose.poseName}</span>
                            <span className="font-bold text-indigo-300">
                              {pose.attempts} {pose.attempts === 1 ? 'session' : 'sessions'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <>
              {/* Captured Athlete Photo Display - Full Still Image (Uncropped) */}
              {lastCapturedSession?.capturedImage && (
                <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl flex items-center justify-center min-h-[220px] max-h-[50vh]">
                  <img
                    src={showSkeletonOnPhoto ? lastCapturedSession.capturedImage : (lastCapturedSession.rawImage || lastCapturedSession.capturedImage)}
                    alt="Captured Cheer Pose"
                    className="w-auto h-auto max-h-[50vh] max-w-full object-contain mx-auto select-none"
                  />
                  {!isFullScreenPhotoView && renderPhotoActionsMenu()}
                </div>
              )}

              {analysisSource === 'upload' && uploadReport && (
                <div className="space-y-3">
                  <button
                    type="button"
                    aria-expanded={showUploadDiagnostics}
                    aria-controls="upload-image-diagnostics"
                    onClick={() => setShowUploadDiagnostics((visible) => !visible)}
                    className="w-full flex items-center justify-between gap-3 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    <h4 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em]">
                      Image Quality & Framing
                    </h4>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 whitespace-nowrap">
                      {showUploadDiagnostics ? 'Hide details' : 'Show details'}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${showUploadDiagnostics ? 'rotate-180' : ''}`}
                      />
                    </span>
                  </button>
                  <div
                    id="upload-image-diagnostics"
                    className={showUploadDiagnostics ? 'space-y-3' : 'hidden'}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-3 rounded-2xl border ${
                          uploadReport.quality.isBlurry
                            ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                            : uploadReport.quality.sharpness === 'slight-blur'
                              ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          {uploadReport.quality.isBlurry ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>
                            {uploadReport.quality.isBlurry
                              ? 'Image is Blurry'
                              : uploadReport.quality.sharpness === 'slight-blur'
                                ? 'Slight Blur'
                                : 'Sharp & Crisp'}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-80 mt-1">
                          {uploadReport.quality.isBlurry ? 'Motion blur detected' : 'Sharp edge definition'}
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-2xl border ${
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
                        <p className="text-[10px] opacity-80 mt-1">
                          {uploadReport.quality.lighting === 'optimal' ? 'Balanced exposure' : 'Adjust room light'}
                        </p>
                      </div>
                    </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pose Detection</span>
                      <span className="text-xs font-bold text-indigo-300">{uploadDetectedPoseLabel}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        uploadReport.hasPerson
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                      }`}>
                        {uploadReport.hasPerson ? 'Athlete detected' : 'No athlete detected'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        uploadReport.isFullBody
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                      }`}>
                        {uploadReport.isFullBody ? 'Full body in frame' : 'Check full-body framing'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{uploadReport.framingMessage}</p>
                  </div>

                  {uploadReport.isDuplicate && (
                    <div
                      role="status"
                      className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200"
                    >
                      <p className="text-xs font-bold">This image looks like one you uploaded before.</p>
                      <p className="text-[11px] leading-relaxed mt-1 text-amber-100/80">
                        You can still analyze it and save it to Practice Log, but repeated uploads do not count toward pose mastery or achievement progress.
                      </p>
                    </div>
                  )}

                  {uploadReport.savedToPracticeLog && (
                    <p
                      role="status"
                      className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-center font-bold text-xs"
                    >
                      <CheckCircle2 className="inline-block w-4 h-4 mr-2 -mt-0.5" />
                      Saved to Practice Log
                    </p>
                  )}

                  {uploadReport.actionableCues.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] mb-2">
                        Image Analysis Feedback
                      </h4>
                      <div className="space-y-2">
                        {uploadReport.actionableCues.map((cue, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-300 flex items-start gap-2"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{cue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
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
                    {analysisSource === 'upload' && !uploadReport?.targetPoseName
                      ? 'Pose Detection'
                      : 'Form Score'}
                  </p>
                  <p className="text-3xl font-black text-white font-mono my-1">
                    {analysisSource === 'upload' && !uploadReport?.targetPoseName
                      ? 'Not scored'
                      : `${lastCapturedSession?.accuracyScore ?? '—'}%`}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sessionScore !== undefined && sessionScore >= MASTERY_THRESHOLD
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                    }`}
                  >
                    {analysisSource === 'upload' && !uploadReport?.targetPoseName
                      ? 'Select a target pose to score'
                      : formLabel}
                  </span>
                </div>

                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    ICU Execution
                  </p>
                  <p className="text-3xl font-black text-indigo-400 font-mono my-1">
                    {analysisSource === 'upload' && !uploadReport?.targetPoseName
                      ? 'Not measured'
                      : lastCapturedSession?.icuScore != null
                        ? `${lastCapturedSession.icuScore} / 10`
                        : 'Not measured'}
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
                    {analysisSource === 'upload' && !uploadReport?.targetPoseName
                      ? 'Pose not specified'
                      : lastCapturedSession?.icuTier === 'Elite'
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

              {recommendedDrill && (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/25 text-xs shadow-inner">
                  <p className="font-bold text-emerald-300 uppercase tracking-wider mb-2 text-[10px] flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>Recommended Training Drill</span>
                  </p>
                  <h4 className="text-sm font-bold text-white mb-1">{recommendedDrill.title}</h4>
                  <p className="text-zinc-200 leading-relaxed">{recommendedDrill.instructions}</p>
                  <p className="text-emerald-200 font-semibold mt-2">{recommendedDrill.dosage}</p>
                  <p className="text-zinc-400 leading-relaxed mt-2">
                    Warm up before practice, stop if you feel pain, and get qualified coaching for advanced or high-risk movements.
                  </p>
                </div>
              )}

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
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-white/[0.08] bg-black/40 flex items-center gap-3">
              {summaryMode === 'today' ? (
                <button
                  onClick={() => setSummaryModalOpen(false)}
                  className="w-full py-3 px-4 rounded-2xl bg-white text-black text-xs font-extrabold hover:bg-zinc-200 transition-colors"
                >
                  Close
                </button>
              ) : analysisSource === 'upload' ? (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 px-4 rounded-2xl border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/5 text-zinc-300 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload Another</span>
                  </button>
                  <button
                    onClick={finishKinematicAnalysis}
                    className="flex-1 py-3 px-4 rounded-2xl bg-white text-black text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Back to AI Camera</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={retakeAfterAnalysis}
                    className="flex-1 py-3 px-4 rounded-2xl border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/5 text-zinc-300 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake</span>
                  </button>
                  <button
                    onClick={finishKinematicAnalysis}
                    className="flex-1 py-3 px-4 rounded-2xl bg-white text-black text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Done & Save</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Still Image Inspector Overlay */}
      {isFullScreenPhotoView && lastCapturedSession?.capturedImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-2xl flex flex-col justify-between safe-top-camera safe-bottom-shutter p-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between z-10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white px-3 py-1 rounded-full bg-white/10 border border-white/15">
                {lastCapturedSession.poseName} • Full Kinematic View
              </span>
            </div>
            <button
              onClick={() => setIsFullScreenPhotoView(false)}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all"
              aria-label="Exit Full Screen View"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
            <img
              src={showSkeletonOnPhoto ? lastCapturedSession.capturedImage : (lastCapturedSession.rawImage || lastCapturedSession.capturedImage)}
              alt="Full Cheer Pose Capture"
              className="max-w-full max-h-full w-auto h-auto object-contain mx-auto rounded-2xl shadow-2xl select-none"
            />
            {renderPhotoActionsMenu(true)}
          </div>
        </div>
      )}

      {/* Shown if an unverified athlete attempts to target a non-beginner pose. */}
      {accessDenied && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl w-full max-w-sm p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-amber-500/25 backdrop-blur-2xl text-center animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-4">
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
              onClick={handleCloseCamera}
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
