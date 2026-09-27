import React from 'react';
import { Activity } from 'lucide-react';

interface LoadingScreenProps {
  /**
   * @deprecated No longer used. The splash used to own a timer and call this
   * when its fake progress bar reached 100%; the parent now ends loading when
   * the startup auth request actually settles. Kept optional so the prop can be
   * dropped at the call site without a type error while it is removed.
   */
  onComplete?: () => void;
  message?: string;
}

/**
 * The one screen shown before the app knows who is signed in.
 *
 * This used to be a full fake boot sequence: a progress bar counting a random
 * number upwards on a 120 ms interval, narrating four stages of work
 * ("Connecting MediaPipe Pose ML", "Calibrating joint vector kinematics",
 * "Syncing ICU Competition Rubrics") that the app never performed, holding the
 * UI for over a second and a half on every launch. Because the increments were
 * random, the wait varied run to run, which is exactly what "the system is not
 * responsive" felt like from the outside.
 *
 * It is now a static splash with no timer of its own. The only thing being
 * waited on is the single startup auth request in `App.tsx`, and that is
 * described honestly. Nothing here animates on a loop, and nothing blurs, so it
 * costs essentially nothing to paint.
 *
 * Note there is no `useEffect` driving an interval: the parent decides when
 * loading is finished, so a slow network cannot be hidden behind a fake
 * progress bar that fills regardless.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => (  <div className="fixed inset-0 z-50 bg-[#050507] text-[#E0E0E6] flex flex-col items-center justify-center gap-6 p-6 select-none">
    <div className="flex flex-col items-center gap-5">
      <div
        className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center"
        aria-hidden="true"
      >
        <Activity className="w-6 h-6 text-indigo-300" />
      </div>

      <div className="text-center">
        <h1 className="text-sm font-black tracking-[0.25em] uppercase text-white mb-2">
          OptiStance
        </h1>
        <p className="text-xs text-zinc-400 font-medium">
          {message || 'Starting up'}
        </p>
      </div>
    </div>

    {/*
      A static, non-animated bar. It does not imply progress it cannot
      measure -- it just shows the app is busy on one request.
    */}
    <div
      className="w-40 h-0.5 rounded-full bg-white/10 overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={message || 'Starting up'}
    >
      <div className="w-1/3 h-full rounded-full bg-indigo-400/70" />
    </div>
  </div>
);
