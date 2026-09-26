import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { PoseCard } from '../app/components/PoseCard';
import { Pose } from '../app/types';

// vitest runs without `globals: true`, so RTL's auto-cleanup never registers.
afterEach(cleanup);

const makePose = (difficulty: Pose['difficulty'], id = 'p1'): Pose =>
  ({
    id,
    name: 'High V',
    category: 'Pom Motion',
    difficulty,
    description: 'Arms in a high V.',
    practiceTips: [],
    masteryPercentage: 0,
    imageUrl: 'https://example.com/pose.jpg',
    points: 100,
    idealAngles: {},
    commonMistakes: [],
    icuStandardGuideline: '',
    defaultSkeleton: { joints: [], lines: [] },
    sampleCorrectionMessage: '',
  }) as Pose;

const renderCard = (overrides: Partial<Parameters<typeof PoseCard>[0]> = {}) => {
  const props = {
    pose: makePose('Intermediate'),
    isLocked: false,
    onSelect: vi.fn(),
    onStartPractice: vi.fn(),
    onLockedClick: vi.fn(),
    ...overrides,
  };
  render(<PoseCard {...props} />);
  return props;
};

describe('PoseCard', () => {
  it('renders the pose name and a Practice button when unlocked', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'High V' })).toBeTruthy();
    expect(screen.getByText('Practice')).toBeTruthy();
  });

  it('shows the lock overlay + "Verify to Unlock" when locked', () => {
    renderCard({ isLocked: true });
    expect(screen.getByText('Verify to Unlock')).toBeTruthy();
    // No practice action while locked.
    expect(screen.queryByText('Practice')).toBeNull();
  });

  it('selects the pose on click when unlocked', () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole('heading', { name: 'High V' }));
    expect(props.onSelect).toHaveBeenCalledTimes(1);
    expect(props.onLockedClick).not.toHaveBeenCalled();
  });

  it('routes clicks to onLockedClick instead of onSelect when locked', () => {
    const props = renderCard({ isLocked: true });
    fireEvent.click(screen.getByRole('heading', { name: 'High V' }));
    expect(props.onLockedClick).toHaveBeenCalledTimes(1);
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onStartPractice).not.toHaveBeenCalled();
  });

  it('passes the locked pose object through to onLockedClick', () => {
    const pose = makePose('Advanced');
    const props = renderCard({ isLocked: true, pose });
    fireEvent.click(screen.getByRole('heading', { name: 'High V' }));
    expect(props.onLockedClick).toHaveBeenCalledWith(pose);
  });
});