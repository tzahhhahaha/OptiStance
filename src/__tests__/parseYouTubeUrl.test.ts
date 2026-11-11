import { describe, expect, it } from 'vitest';
import {
  parseTimeStringToSeconds,
  formatSecondsToTime,
  extractYouTubeVideoId,
  extractUrlTimestamp,
  buildYouTubeEmbedUrl,
  parseYouTubeUrl,
} from '../app/utils/parseYouTubeUrl';

describe('parseYouTubeUrl utility', () => {
  describe('parseTimeStringToSeconds', () => {
    it('parses pure integers and seconds strings', () => {
      expect(parseTimeStringToSeconds(216)).toBe(216);
      expect(parseTimeStringToSeconds('216')).toBe(216);
      expect(parseTimeStringToSeconds('216s')).toBe(216);
      expect(parseTimeStringToSeconds('0')).toBe(0);
    });

    it('parses mm:ss and hh:mm:ss colon notation', () => {
      expect(parseTimeStringToSeconds('3:36')).toBe(216);
      expect(parseTimeStringToSeconds('03:36')).toBe(216);
      expect(parseTimeStringToSeconds('0:45')).toBe(45);
      expect(parseTimeStringToSeconds('1:02:03')).toBe(3723);
      expect(parseTimeStringToSeconds('01:00:00')).toBe(3600);
    });

    it('parses YouTube duration string notation (h, m, s)', () => {
      expect(parseTimeStringToSeconds('3m36s')).toBe(216);
      expect(parseTimeStringToSeconds('1h2m3s')).toBe(3723);
      expect(parseTimeStringToSeconds('45s')).toBe(45);
      expect(parseTimeStringToSeconds('2m')).toBe(120);
      expect(parseTimeStringToSeconds('1h')).toBe(3600);
    });

    it('returns null for invalid or negative time strings', () => {
      expect(parseTimeStringToSeconds(null)).toBeNull();
      expect(parseTimeStringToSeconds(undefined)).toBeNull();
      expect(parseTimeStringToSeconds('')).toBeNull();
      expect(parseTimeStringToSeconds('invalid')).toBeNull();
      expect(parseTimeStringToSeconds('-30')).toBeNull();
      expect(parseTimeStringToSeconds('3:65:99:12')).toBeNull();
    });
  });

  describe('formatSecondsToTime', () => {
    it('formats seconds into mm:ss strings', () => {
      expect(formatSecondsToTime(216)).toBe('3:36');
      expect(formatSecondsToTime(45)).toBe('0:45');
      expect(formatSecondsToTime(0)).toBe('0:00');
    });

    it('formats hours into hh:mm:ss strings', () => {
      expect(formatSecondsToTime(3600)).toBe('1:00:00');
      expect(formatSecondsToTime(3723)).toBe('1:02:03');
    });

    it('handles negative or invalid seconds gracefully', () => {
      expect(formatSecondsToTime(-10)).toBe('0:00');
      expect(formatSecondsToTime(NaN)).toBe('0:00');
    });
  });

  describe('extractYouTubeVideoId', () => {
    it('extracts ID from standard watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=216s';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from youtu.be short URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ?t=3m36s';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from shorts URL', () => {
      const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from mobile URL without scheme', () => {
      const url = 'm.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('accepts raw 11-character video ID', () => {
      expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for non-YouTube URLs or invalid strings', () => {
      expect(extractYouTubeVideoId('https://vimeo.com/123456')).toBeNull();
      expect(extractYouTubeVideoId('https://google.com')).toBeNull();
      expect(extractYouTubeVideoId('not-a-valid-id-too-long-or-short')).toBeNull();
      expect(extractYouTubeVideoId('')).toBeNull();
    });
  });

  describe('extractUrlTimestamp', () => {
    it('extracts timestamp from ?t= query param', () => {
      expect(extractUrlTimestamp('https://youtu.be/dQw4w9WgXcQ?t=3m36s')).toBe(216);
      expect(extractUrlTimestamp('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s')).toBe(90);
      expect(extractUrlTimestamp('https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=120')).toBe(120);
    });

    it('returns null when no timestamp query param exists', () => {
      expect(extractUrlTimestamp('https://youtu.be/dQw4w9WgXcQ')).toBeNull();
    });
  });

  describe('buildYouTubeEmbedUrl', () => {
    it('constructs an embed URL with start timestamp', () => {
      const embedUrl = buildYouTubeEmbedUrl('dQw4w9WgXcQ', 216);
      expect(embedUrl).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ?');
      expect(embedUrl).toContain('start=216');
      expect(embedUrl).toContain('autoplay=0');
    });

    it('constructs an embed URL with start and end timestamps', () => {
      const embedUrl = buildYouTubeEmbedUrl('dQw4w9WgXcQ', 90, 150);
      expect(embedUrl).toContain('start=90');
      expect(embedUrl).toContain('end=150');
    });
  });

  describe('parseYouTubeUrl', () => {
    it('parses valid YouTube URL and generates complete DemoVideoData', () => {
      const result = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=3m36s');
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.videoId).toBe('dQw4w9WgXcQ');
      expect(result.data?.startSeconds).toBe(216);
      expect(result.data?.embedUrl).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result.data?.embedUrl).toContain('start=216');
    });

    it('allows manual start and end times to override or complement URL params', () => {
      const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
        manualStartTime: '1:30',
        manualEndTime: '2:15',
      });
      expect(result.isValid).toBe(true);
      expect(result.data?.startSeconds).toBe(90);
      expect(result.data?.endSeconds).toBe(135);
      expect(result.data?.embedUrl).toContain('start=90');
      expect(result.data?.embedUrl).toContain('end=135');
    });

    it('returns error when URL is not a valid YouTube link', () => {
      const result = parseYouTubeUrl('https://not-youtube.com/video');
      expect(result.isValid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('handles empty strings cleanly', () => {
      const result = parseYouTubeUrl('');
      expect(result.isValid).toBe(false);
      expect(result.data).toBeNull();
    });
  });
});
