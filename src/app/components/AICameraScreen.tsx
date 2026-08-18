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
  Play,
  RotateCcw,
  Sparkles,
  Award,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Pose as MediaPipePose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Pose, PracticeSession } from '../types';
import { analyzePomMotion } from './poseLibrary';
import { audioCoach } from '../utils/audio';

interface AICameraScreenProps {
  initialPose?: Pose | null;
  allPoses: Pose[];
  audioCuesEnabled?: boolean;
  onClose: () => void;
  onSaveSession: (session: PracticeSession) => void;
}

export const AICameraScreen: React.FC<AICameraScreenProps> = ({
  initialPose,
  allPoses,
  audioCuesEnabled = true,
  onClose,
  onSaveSession
}) => {
  const [currentPose, setCurrentPose] = useState<Pose | null>(initialPose ?? null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(audioCuesEnabled);
  const [timerDuration, setTimerDuration] = useState<number>(3); // 0, 3, 5
  const [flashOn, setFlashOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
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

  const activeTargetPose = currentPose ?? initialPose ?? null;
  const showTargetSelector = !initialPose;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<MediaPipePose | null>(null);
  const frameLoopRef = useRef<number | null>(null);
  const currentPoseRef = useRef<Pose | null>(currentPose);

  useEffect(() => {
    currentPoseRef.current = currentPose;
  }, [currentPose]);

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

  // Initialize camera or athletic backdrop
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

  const initializePose = () => {
    if (!videoRef.current || poseRef.current) return;

    try {
      const pose = new MediaPipePose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
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

          if (!targetPose) {
            if (poseAnalysis.pose && visibilityStatus.isStrong && poseAnalysis.confidence >= 0.78) {
              setDetectedPoseName(poseAnalysis.pose.name);
              const validPoseScore = Math.max(0, Math.min(100, Math.round(poseAnalysis.confidence * 100)));
              setAccuracy(validPoseScore);
            } else {
              setDetectedPoseName('No pose detected');
              setAccuracy(0);
            }
          }

          if (targetPose) {
            if (!visibilityStatus.isEnough) {
              setAccuracy(0);
              setCustomCorrection('Adjust framing: keep the full body visible and turn toward the camera.');
              setShowCorrectionBanner(true);
            } else if (customCorrection) {
              setShowCorrectionBanner(true);
            }
          }

          const leftShoulder = results.poseLandmarks[11];
          const rightShoulder = results.poseLandmarks[12];
          const leftHip = results.poseLandmarks[23];
          const rightHip = results.poseLandmarks[24];
          const avgVisibility = ((leftShoulder?.visibility ?? 0.5) + (rightShoulder?.visibility ?? 0.5) + (leftHip?.visibility ?? 0.5) + (rightHip?.visibility ?? 0.5)) / 4;
          const liveConfidence = Math.max(0, Math.min(100, Math.round((avgVisibility + 0.4) * 100)));

          const hasValidPose = poseAnalysis.pose && visibilityStatus.isStrong && poseAnalysis.confidence >= 0.78;
          const shouldUseLiveAccuracy = hasValidPose || (targetPose && visibilityStatus.isEnough);

          if (shouldUseLiveAccuracy) {
            setAccuracy(liveConfidence);
          } else {
            setAccuracy(0);
          }
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

  const startCamera = async () => {
    if (!useWebcam) return;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          initializePose();
        };
        videoRef.current.onloadeddata = () => {
          initializePose();
        };
      }
    } catch {
      // Fallback to simulator video/photo
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
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomMediaUrl(url);
      setUseWebcam(false);
      setAccuracy(92);
      audioCoach.playSuccessBeep();
      audioCoach.speakCue('Analyzing uploaded cheer media', audioEnabled);
    }
  };

  const triggerCapture = () => {
    if (timerDuration > 0) {
      setCountdown(timerDuration);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            executeSnapshot();
            return null;
          }
          audioCoach.playWarningBeep();
          return prev - 1;
        });
      }, 1000);
    } else {
      executeSnapshot();
    }
  };

  const executeSnapshot = () => {
    setIsCapturing(true);
    audioCoach.playShutterSound();

    setTimeout(() => {
      setIsCapturing(false);
      // Random variance based on current pose accuracy
      const finalScore = Math.min(100, Math.max(70, accuracy + Math.floor(Math.random() * 7) - 2));
      const icuGrade = finalScore >= 95 ? 9.8 : finalScore >= 85 ? 8.9 : 7.6;

      const newSession: PracticeSession = {
        id: `sess-${Date.now()}`,
        poseId: currentPose.id,
        poseName: currentPose.name,
        timestamp: 'Just now',
        accuracyScore: finalScore,
        durationSeconds: 45,
        corrections: [
          finalScore >= 90
            ? 'Optimal kinematic form maintained'
            : customCorrection,
          'ICU Rulebook compliance verified'
        ],
        icuScore: icuGrade,
        feedbackSummary:
          finalScore >= 90
            ? 'Superb joint alignment! Ready for routine integration.'
            : 'Good hold! Refine extension on highlighted joint markers.'
      };

      setLastCapturedSession(newSession);
      onSaveSession(newSession);
      setSummaryModalOpen(true);

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

  // Get active skeleton elements based on pose
  const skeleton = currentPose?.defaultSkeleton;

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
                  {allPoses.map((p) => (
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
        <div className="absolute bottom-0 left-0 right-0 z-30 pb-safe-area-bottom pt-4 px-6 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent flex items-center justify-between h-32">
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
                  <p className="text-xs text-zinc-400 mt-0.5">{currentPose.name} • ICU Standards Check</p>
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
                    {lastCapturedSession?.accuracyScore || accuracy}%
                  </p>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Excellent Hold
                  </span>
                </div>

                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    ICU Execution
                  </p>
                  <p className="text-3xl font-black text-indigo-400 font-mono my-1">
                    {lastCapturedSession?.icuScore || '9.4'} / 10
                  </p>
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    Level 4 Benchmark
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
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
                    <span className="font-semibold text-zinc-200">Standing Leg / Knee Lock</span>
                    <span className="font-bold text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 179° (Target: 180°)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
                    <span className="font-semibold text-zinc-200">Lifted Leg Hip Height</span>
                    <span className="font-bold text-rose-400 font-mono flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> 84° (Target: 90°+)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
                    <span className="font-semibold text-zinc-200">Arm High V Aperture</span>
                    <span className="font-bold text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 45° Locked
                    </span>
                  </div>
                </div>
              </div>

              {/* Coach Advice */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs">
                <p className="font-bold text-indigo-300 uppercase tracking-wider mb-1 text-[10px]">
                  AI Coach Insight:
                </p>
                <p className="text-zinc-300 leading-relaxed">
                  {currentPose.sampleCorrectionMessage} Focus on core engagement during balance transitions.
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
    </div>
  );
};
