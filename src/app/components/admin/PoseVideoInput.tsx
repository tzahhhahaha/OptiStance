import React, { useState, useEffect, useCallback, useId, useRef } from 'react';
import { Video, Clock, AlertCircle, ExternalLink, X, Play, CheckCircle2, Film, UploadCloud, Loader2 } from 'lucide-react';
import {
  parseYouTubeUrl,
  formatSecondsToTime,
  type DemoVideoData,
} from '../../utils/parseYouTubeUrl';
import {
  validatePoseVideo,
  uploadPoseVideo,
} from '../../../services/poseImages';

export interface PoseVideoInputProps {
  /** Initial or controlled video URL string or DemoVideoData object */
  value?: string | DemoVideoData | null;
  /** Callback fired whenever valid video data changes or is cleared */
  onChange?: (data: DemoVideoData | null) => void;
  /** Optional container CSS class name */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Slug or identifier for storage bucket object naming */
  slug?: string;
}

const isDirectVideoUrl = (url: string) => {
  const trimmed = url.trim();
  return (
    /\.(mp4|webm|mov|ogv)($|\?)/i.test(trimmed) ||
    trimmed.includes('/pose-videos/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:video')
  );
};

export const PoseVideoInput: React.FC<PoseVideoInputProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
  slug = 'pose',
}) => {
  const urlInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Internal input state
  const [urlInput, setUrlInput] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize from value prop
  useEffect(() => {
    if (!value) {
      setUrlInput('');
      return;
    }

    if (typeof value === 'string') {
      setUrlInput(value);
    } else {
      setUrlInput(value.rawUrl || '');
    }
  }, [value]);

  const isDirect = isDirectVideoUrl(urlInput);

  // Compute parsed video data in real time from the URL
  const youtubeResult = isDirect ? null : parseYouTubeUrl(urlInput);
  const isInvalid = Boolean(urlInput.trim() && !isDirect && youtubeResult && !youtubeResult.isValid);
  const isValid = Boolean(
    urlInput.trim() && (isDirect || (youtubeResult?.isValid && youtubeResult.data))
  );

  const videoData: DemoVideoData | null = isDirect
    ? {
        rawUrl: urlInput.trim(),
        videoId: 'direct-video',
        startSeconds: 0,
        embedUrl: urlInput.trim(),
      }
    : youtubeResult?.data || null;

  // Propagate change to parent
  const emitChange = useCallback(
    (newData: DemoVideoData | null) => {
      onChange?.(newData);
    },
    [onChange]
  );

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasInteracted(true);
    setUploadError(null);
    const newUrl = e.target.value;
    setUrlInput(newUrl);

    if (isDirectVideoUrl(newUrl)) {
      emitChange({
        rawUrl: newUrl.trim(),
        videoId: 'direct-video',
        startSeconds: 0,
        embedUrl: newUrl.trim(),
      });
    } else {
      const result = parseYouTubeUrl(newUrl);
      emitChange(result.isValid ? result.data : null);
    }
  };

  const handleClear = () => {
    setUrlInput('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    emitChange(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHasInteracted(true);
    setUploadError(null);

    const validationMsg = validatePoseVideo(file);
    if (validationMsg) {
      setUploadError(validationMsg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      const publicUrl = await uploadPoseVideo(file, slug);
      setUrlInput(publicUrl);
      const data: DemoVideoData = {
        rawUrl: publicUrl,
        videoId: 'direct-video',
        startSeconds: 0,
        embedUrl: publicUrl,
      };
      emitChange(data);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Video upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={urlInputId}
          className="text-xs text-zinc-400 font-bold flex items-center gap-1.5"
        >
          <Video className="w-3.5 h-3.5 text-indigo-400" />
          <span>Reference / Demo Video</span>
          <span className="text-[10px] text-zinc-500 font-normal">(Optional)</span>
        </label>

        {isValid && (
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
            <CheckCircle2 className="w-3 h-3" /> {isDirect ? 'Direct Video Attached' : 'Video Linked'}
          </span>
        )}
      </div>

      {/* Main URL Input Field with Upload Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            id={urlInputId}
            type="text"
            value={urlInput}
            onChange={handleUrlChange}
            disabled={disabled || isUploading}
            placeholder="Paste YouTube link (e.g., https://youtu.be/xyz?t=3m36s or direct video URL)"
            className={`w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.04] border text-white text-xs placeholder-zinc-500 focus:outline-none transition-all ${
              isInvalid && hasInteracted
                ? 'border-rose-500/60 focus:border-rose-500 bg-rose-500/[0.03]'
                : isValid
                ? 'border-emerald-500/40 focus:border-emerald-500/60'
                : 'border-white/[0.08] focus:border-indigo-500/50'
            }`}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
            <Film className="w-3.5 h-3.5" />
          </div>

          {urlInput && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Clear video URL"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 50MB Direct Video File Upload Trigger */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/mp4,video/webm,video/quicktime,video/ogg"
          className="hidden"
          disabled={disabled || isUploading}
        />

        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50"
          title="Upload MP4 or WebM video file directly up to 50MB"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Uploading (50MB max)…</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
              <span>Upload Video</span>
            </>
          )}
        </button>
      </div>

      {/* Validation / Upload Error Banner */}
      {(uploadError || (isInvalid && hasInteracted)) && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{uploadError || youtubeResult?.error || 'Invalid YouTube link. Please check the URL format.'}</span>
        </div>
      )}

      {/* Real-Time Video Preview Card */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-0.5">
          <span>Live Video Preview</span>
          {videoData && (
            <div className="flex items-center gap-2">
              {!isDirect && videoData.startSeconds > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Starts at {formatSecondsToTime(videoData.startSeconds)}
                </span>
              )}
              {isDirect ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                  Direct Video Storage
                </span>
              ) : (
                <a
                  href={videoData.rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  title="Open original video in YouTube"
                >
                  <span>YouTube</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {isValid && videoData ? (
          /* Responsive 16:9 Player: HTML5 video for direct files or YouTube iFrame */
          <div className="aspect-video w-full rounded-xl overflow-hidden shadow-md border border-white/[0.1] bg-black relative group flex items-center justify-center">
            {isDirect ? (
              <video
                src={videoData.rawUrl}
                title="Pose Demo Video Preview"
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={videoData.embedUrl}
                title="Pose Demo Video Preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
                loading="lazy"
              />
            )}
          </div>
        ) : (
          /* Empty Skeleton / Placeholder State */
          <div className="aspect-video w-full rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] flex flex-col items-center justify-center p-4 text-center select-none">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500 mb-2">
              <Play className="w-4 h-4 ml-0.5 opacity-60" />
            </div>
            <p className="text-xs text-zinc-400 font-medium">No demo video attached</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 max-w-[280px]">
              Paste a YouTube link above (supports timestamps) or upload an MP4/WebM video (up to 50MB).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

