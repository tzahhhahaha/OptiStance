/**
 * YouTube URL Parser and Embed Converter Utility
 *
 * Supports all standard YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID&t=216s
 * - https://youtu.be/VIDEO_ID?t=3m36s
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - Raw 11-character video IDs
 */

export interface DemoVideoData {
  rawUrl: string;
  videoId: string;
  startSeconds: number;
  endSeconds?: number;
  embedUrl: string;
}

export interface YouTubeParseResult {
  isValid: boolean;
  data: DemoVideoData | null;
  error?: string;
}

/**
 * Converts a time string or number into integer seconds.
 * Supports:
 * - Pure seconds: "216", "216s", 216
 * - Colon format: "3:36" (mm:ss), "01:02:03" (hh:mm:ss)
 * - YouTube notation: "3m36s", "1h2m3s", "45s", "2m", "1h"
 */
export function parseTimeStringToSeconds(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? Math.floor(input) : null;
  }

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Case 1: Pure number (e.g., "216" or "216s")
  if (/^\d+s?$/.test(trimmed)) {
    const val = parseInt(trimmed.replace('s', ''), 10);
    return Number.isFinite(val) && val >= 0 ? val : null;
  }

  // Case 2: Colon notation "mm:ss" or "hh:mm:ss" (e.g., "3:36" or "1:02:03")
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseInt(p, 10));
    if (parts.some((p) => Number.isNaN(p) || p < 0)) return null;

    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    }
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return null;
  }

  // Case 3: YouTube duration format like "3m36s", "1h2m3s", "45s", "2m", "1h"
  const hasUnits = /[hms]/.test(trimmed);
  if (hasUnits) {
    const hMatch = trimmed.match(/(\d+)\s*h/);
    const mMatch = trimmed.match(/(\d+)\s*m/);
    const sMatch = trimmed.match(/(\d+)\s*s/);

    if (hMatch || mMatch || sMatch) {
      const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
      const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
      const seconds = sMatch ? parseInt(sMatch[1], 10) : 0;
      const total = hours * 3600 + minutes * 60 + seconds;
      return Number.isFinite(total) && total >= 0 ? total : null;
    }
  }

  return null;
}

/**
 * Formats integer seconds into a human-readable mm:ss or hh:mm:ss string.
 */
export function formatSecondsToTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Extracts the 11-character YouTube video ID from various URL patterns.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Raw 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube host patterns
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
}

/**
 * Extracts start timestamp query parameter from a YouTube URL if present.
 */
export function extractUrlTimestamp(url: string): number | null {
  if (!url) return null;
  const trimmed = url.trim();

  try {
    const fullUrl = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(fullUrl);
    const tParam = parsed.searchParams.get('t') || parsed.searchParams.get('start');
    if (tParam) {
      return parseTimeStringToSeconds(tParam);
    }
  } catch {
    // Fallback regex matching
    const match = trimmed.match(/[?&](?:t|start)=([^&#\s]+)/i);
    if (match) {
      return parseTimeStringToSeconds(match[1]);
    }
  }

  return null;
}

/**
 * Builds an embeddable YouTube iframe URL with optional start and end seconds.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  startSeconds: number = 0,
  endSeconds?: number
): string {
  const params = new URLSearchParams();
  if (startSeconds > 0) {
    params.set('start', String(startSeconds));
  }
  if (endSeconds != null && endSeconds > startSeconds) {
    params.set('end', String(endSeconds));
  }
  params.set('autoplay', '0');
  params.set('rel', '0');
  params.set('modestbranding', '1');

  const query = params.toString();
  return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ''}`;
}

/**
 * Parses a YouTube URL and optional manual start/end times into a structured DemoVideoData payload.
 */
export function parseYouTubeUrl(
  url: string,
  options?: {
    manualStartTime?: string | number;
    manualEndTime?: string | number;
  }
): YouTubeParseResult {
  const trimmed = url?.trim() || '';
  if (!trimmed) {
    return {
      isValid: false,
      data: null,
    };
  }

  const videoId = extractYouTubeVideoId(trimmed);
  if (!videoId) {
    return {
      isValid: false,
      data: null,
      error: 'Invalid YouTube link. Please check the URL format.',
    };
  }

  // 1. Determine Start Seconds: manual input takes precedence if valid; else extract from URL parameter
  let startSeconds = 0;
  if (options?.manualStartTime != null && String(options.manualStartTime).trim() !== '') {
    const parsedManual = parseTimeStringToSeconds(options.manualStartTime);
    if (parsedManual !== null) {
      startSeconds = parsedManual;
    }
  } else {
    const urlTime = extractUrlTimestamp(trimmed);
    if (urlTime !== null) {
      startSeconds = urlTime;
    }
  }

  // 2. Determine End Seconds: manual input takes precedence
  let endSeconds: number | undefined;
  if (options?.manualEndTime != null && String(options.manualEndTime).trim() !== '') {
    const parsedEnd = parseTimeStringToSeconds(options.manualEndTime);
    if (parsedEnd !== null && parsedEnd > startSeconds) {
      endSeconds = parsedEnd;
    }
  } else {
    try {
      const fullUrl = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
      const parsed = new URL(fullUrl);
      const endParam = parsed.searchParams.get('end');
      if (endParam) {
        const parsedUrlEnd = parseTimeStringToSeconds(endParam);
        if (parsedUrlEnd !== null && parsedUrlEnd > startSeconds) {
          endSeconds = parsedUrlEnd;
        }
      }
    } catch {
      // Ignored
    }
  }

  const embedUrl = buildYouTubeEmbedUrl(videoId, startSeconds, endSeconds);

  return {
    isValid: true,
    data: {
      rawUrl: trimmed,
      videoId,
      startSeconds,
      endSeconds,
      embedUrl,
    },
  };
}
