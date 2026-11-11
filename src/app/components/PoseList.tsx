import React from 'react';
import { Pose } from '../types';
import { isPoseLocked } from '../utils/access';
import { PoseCard } from './PoseCard';

interface PoseListProps {
  poses: Pose[];
  isVerified: boolean;
  onSelectPose: (pose: Pose) => void;
  onStartPractice: (pose: Pose) => void;
  onLockedPoseClick: (pose: Pose) => void;
}

export const PoseList: React.FC<PoseListProps> = ({
  poses,
  isVerified,
  onSelectPose,
  onStartPractice,
  onLockedPoseClick
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {poses.map((pose) => (
      <PoseCard
        key={pose.id}
        pose={pose}
        isLocked={isPoseLocked(pose, isVerified)}
        onSelect={onSelectPose}
        onStartPractice={onStartPractice}
        onLockedClick={onLockedPoseClick}
      />
    ))}
  </div>
);