import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { PoseVideoInput } from '../app/components/admin/PoseVideoInput';

// vitest runs without `globals: true`, so RTL's auto-cleanup never registers.
afterEach(cleanup);

describe('PoseVideoInput component', () => {
  it('renders section label and input field with placeholder', () => {
    render(<PoseVideoInput />);

    expect(screen.getByText('Reference / Demo Video')).toBeTruthy();
    expect(
      screen.getByPlaceholderText(/Paste YouTube link/i)
    ).toBeTruthy();
  });

  it('shows empty skeleton placeholder when no video is attached', () => {
    render(<PoseVideoInput />);

    expect(screen.getByText('No demo video attached')).toBeTruthy();
    expect(
      screen.getByText(/Paste a YouTube link above/i)
    ).toBeTruthy();
  });

  it('displays validation alert on invalid YouTube link', () => {
    render(<PoseVideoInput />);

    const input = screen.getByPlaceholderText(/Paste YouTube link/i);
    fireEvent.change(input, { target: { value: 'https://not-youtube.com/invalid' } });

    expect(
      screen.getByText(/Invalid YouTube link/i)
    ).toBeTruthy();
  });

  it('renders responsive iframe and emits DemoVideoData on valid YouTube link', () => {
    const handleChange = vi.fn();
    render(<PoseVideoInput onChange={handleChange} />);

    const input = screen.getByPlaceholderText(/Paste YouTube link/i);
    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    });

    // Check that iframe is rendered
    const iframe = screen.getByTitle('Pose Demo Video Preview') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.src).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');

    // Check that onChange was fired with structured data
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: 'dQw4w9WgXcQ',
        startSeconds: 0,
        embedUrl: expect.stringContaining('https://www.youtube.com/embed/dQw4w9WgXcQ'),
      })
    );
  });

  it('automatically extracts timestamp from copied YouTube URL and displays start badge', () => {
    const handleChange = vi.fn();
    render(
      <PoseVideoInput
        value="https://youtu.be/dQw4w9WgXcQ?t=2m15s"
        onChange={handleChange}
      />
    );

    // Live preview iframe has start parameter
    const iframe = screen.getByTitle('Pose Demo Video Preview') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.src).toContain('start=135');

    // Start badge is displayed
    expect(screen.getByText(/Starts at 2:15/i)).toBeTruthy();
  });

  it('clears input and emits null when clear button is clicked', () => {
    const handleChange = vi.fn();
    render(
      <PoseVideoInput
        value="https://youtu.be/dQw4w9WgXcQ"
        onChange={handleChange}
      />
    );

    const clearButton = screen.getByTitle('Clear video URL');
    fireEvent.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith(null);
    expect(screen.getByText('No demo video attached')).toBeTruthy();
  });
});
