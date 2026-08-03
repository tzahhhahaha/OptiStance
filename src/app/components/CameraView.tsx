import { useEffect, useRef, useState } from 'react';
import { X, Upload, RotateCw, Timer, Zap, ZapOff, Camera, Volume2, VolumeX } from 'lucide-react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { analyzePomMotion } from './poseLibrary';

interface CameraViewProps {
  onClose: () => void;
  targetPoseName?: string | null;
}

export function CameraView({ onClose, targetPoseName }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [timerCount, setTimerCount] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [currentAccuracy, setCurrentAccuracy] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [detectedPose, setDetectedPose] = useState('Liberty');
  const [detectedFeedback, setDetectedFeedback] = useState<string[]>([]);
  const [poseConfidence, setPoseConfidence] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useSimulation, setUseSimulation] = useState(false);
  const [captureDelay, setCaptureDelay] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const poseRef = useRef<Pose | null>(null);
  const animationRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const lastSpokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!useSimulation) {
      startCamera();
    }
    if (useSimulation) {
      startSimulation();
    }

    return () => {
      stopCamera();
      if (poseRef.current) {
        poseRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
    };
  }, [facingMode, useSimulation]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      stopCamera();

      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });

      setStream(mediaStream);
      setUseSimulation(false);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadeddata = () => {
          initializePose();
        };
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Camera permission required. Please allow camera access in browser settings.');
        setUseSimulation(true);
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
        setUseSimulation(true);
      } else {
        setCameraError('Camera unavailable. Using demo mode.');
        setUseSimulation(true);
      }
    }
  };

  const startSimulation = () => {
    // Simulate pose detection with random accuracy changes
    const simulate = () => {
      const accuracy = Math.floor(Math.random() * 15) + 85;
      setCurrentAccuracy(accuracy);
      animationRef.current = requestAnimationFrame(simulate);
    };
    simulate();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const initializePose = () => {
    try {
      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onPoseResults);
      poseRef.current = pose;

      if (videoRef.current && videoRef.current.readyState >= 2) {
        const sendFrame = async () => {
          if (videoRef.current && poseRef.current && videoRef.current.readyState >= 2) {
            try {
              await poseRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.error('Pose detection error:', err);
            }
            requestAnimationFrame(sendFrame);
          }
        };
        sendFrame();
      }
    } catch (error) {
      console.error('Error initializing pose detection:', error);
      setUseSimulation(true);
    }
  };

  const speakCue = (message: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (lastSpokenRef.current === message) return;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = message;
  };

  const onPoseResults = (results: any) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current?.videoWidth || 640;
    canvas.height = videoRef.current?.videoHeight || 480;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      const poseColor = targetPoseName ? '#22c55e' : '#00FF00';
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: poseColor,
        lineWidth: 4,
      });
      drawLandmarks(ctx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 2,
        radius: 6,
      });

      const landmarkMap = results.poseLandmarks.reduce((acc: Record<number, { x: number; y: number; z?: number }>, landmark: any, index: number) => {
        acc[index] = { x: landmark.x, y: landmark.y, z: landmark.z };
        return acc;
      }, {});

      const analysis = analyzePomMotion(landmarkMap);
      if (analysis.pose) {
        const nextPose = analysis.pose.name;
        setDetectedPose(nextPose);
        setDetectedFeedback(analysis.feedback);
        setPoseConfidence(Math.round(analysis.confidence * 100));
        setCurrentAccuracy(Math.round(analysis.confidence * 100));
        if (targetPoseName) {
          speakCue(`Target pose ${targetPoseName}. ${analysis.feedback[0]}`);
        }
      } else {
        setDetectedPose(targetPoseName || 'Pose Pending');
        setDetectedFeedback(['Try to match a clear pom motion shape']);
        setPoseConfidence(0);
        setCurrentAccuracy(0);
        if (targetPoseName) {
          speakCue(`Align your body to ${targetPoseName}`);
        }
      }
    }

    ctx.restore();
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleTimer = () => {
    const nextDelay = captureDelay === 3 ? 5 : captureDelay === 5 ? 10 : 3;
    setCaptureDelay(nextDelay);
    setTimerCount(0);
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) {
      setShowResults(true);
      return;
    }

    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = videoRef.current.videoWidth || 640;
    snapshotCanvas.height = videoRef.current.videoHeight || 480;
    const snapshotCtx = snapshotCanvas.getContext('2d');

    if (snapshotCtx) {
      snapshotCtx.drawImage(videoRef.current, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
      setCapturedImageDataUrl(snapshotCanvas.toDataURL('image/png'));
    }

    setIsHolding(false);
    setShowResults(true);
  };

  const handleCapture = () => {
    if (isCountingDown) return;

    setIsHolding(true);
    setIsCountingDown(true);
    setTimerCount(captureDelay);

    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
    }

    countdownRef.current = window.setInterval(() => {
      setTimerCount((prev) => {
        if (prev <= 1) {
          window.clearInterval(countdownRef.current ?? undefined);
          countdownRef.current = null;
          setIsCountingDown(false);
          setTimerCount(0);
          captureSnapshot();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        (async () => {
          try {
            const { uploadImage } = await import('../../styles/services/storageService');
            const url = await uploadImage(file);
            console.log('Uploaded image URL:', url);
          } catch (err) {
            console.error('Upload failed:', err);
          }
        })();
      }
    };
    input.click();
  };

  if (showResults) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-semibold">Results</h2>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6 flex items-start gap-3">
            {capturedImageDataUrl ? (
              <img src={capturedImageDataUrl} alt="Captured pose" className="w-24 h-24 rounded-xl object-cover border" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">No image</div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{detectedPose}</h3>
              <p className="text-sm text-gray-500">{targetPoseName ? `Targeting ${targetPoseName}` : 'Free-form posture check'}</p>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-2xl mb-2">{detectedPose}</h3>
            <div className="text-5xl font-bold text-green-600 mb-2">
              {currentAccuracy}%
            </div>
            <p className="text-gray-500">Accuracy Score</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h4 className="font-medium mb-2">✓ Live Feedback</h4>
            <p className="text-sm text-gray-700">
              {detectedPose === 'Pose Pending'
                ? 'Try to match a clearer line with your arms or legs to improve the shape.'
                : `Your ${detectedPose} form is being read from the live pose landmarks. Keep practicing to improve your alignment and extension.`}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <h4 className="font-medium mb-3">Detailed Feedback</h4>
            <div className="space-y-3">
              {(detectedFeedback.length ? detectedFeedback : ['Keep your posture tall', 'Open your arms or legs into a clear shape']).map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center justify-between">
                  <span className="text-sm">{item}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${Math.max(55, poseConfidence)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{Math.max(55, poseConfidence)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="font-medium mb-3">Recommended Drills</h4>
            <div className="space-y-2">
              {[
                'Single-leg balance exercises',
                'Core strengthening planks',
                'Leg extension stretches',
                'Upper body flexibility',
              ].map((drill, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                    {idx + 1}
                  </div>
                  <span className="text-sm flex-1">{drill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <button
            onClick={() => {
              setShowResults(false);
              setCurrentAccuracy(0);
            }}
            className="w-full bg-blue-600 text-white rounded-xl p-4 hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTimer}
            className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center ${
              timerCount > 0 ? 'bg-blue-600 text-white' : 'bg-black/50 text-white'
            }`}
          >
            {timerCount > 0 ? (
              <span className="text-lg font-bold">{timerCount}</span>
            ) : (
              <span className="text-xs font-semibold">{captureDelay}s</span>
            )}
          </button>

          <button
            onClick={() => setAudioEnabled((prev) => !prev)}
            className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setFlashEnabled(!flashEnabled)}
            className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            {flashEnabled ? (
              <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ) : (
              <ZapOff className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {cameraError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm max-w-xs text-center">
            {cameraError}
          </div>
        )}

        {useSimulation ? (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center text-white p-8 max-w-md">
              <div className="text-6xl mb-4">📹</div>
              <p className="text-xl mb-3 font-semibold">Demo Mode</p>
              <p className="text-sm opacity-90 mb-6">Camera preview not available</p>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 text-left">
                <p className="text-sm font-medium mb-2">To enable camera:</p>
                <ol className="text-xs opacity-90 space-y-1 list-decimal list-inside">
                  <li>Click the camera icon in your browser's address bar</li>
                  <li>Select "Allow" for camera permissions</li>
                  <li>Refresh the page</li>
                </ol>
              </div>

              <p className="text-xs opacity-75">Pose detection will work in demo mode with simulated data</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
          </>
        )}

        {targetPoseName && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full max-w-[90%] text-center">
            <div className="text-sm font-semibold">Target pose: {targetPoseName}</div>
          </div>
        )}

        {currentAccuracy > 0 && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full">
            <div className="text-sm">
              {detectedPose} - <span className="font-bold">{currentAccuracy}%</span>
            </div>
          </div>
        )}

        {isHolding && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="text-4xl mb-2">📸</div>
              <p className="text-lg">Hold your pose...</p>
              {isCountingDown && <p className="text-sm opacity-90 mt-2">Capturing in {timerCount}s</p>}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-12 px-8">
        <button
          onClick={handleUpload}
          className="w-14 h-14 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <Upload className="w-6 h-6" />
        </button>

        <button
          onClick={handleCapture}
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-gray-300"
        >
          <Camera className="w-8 h-8 text-gray-700" />
        </button>

        <button
          onClick={handleFlipCamera}
          className="w-14 h-14 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <RotateCw className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
