// Web Worker to run MediaPipe Pose in a worker thread.
// Main thread should initialize by posting {type: 'init'} and then send frames as ImageBitmap via {type: 'frame', bitmap}.

let pose: any = null;

self.onmessage = async (evt: MessageEvent) => {
  const data = evt.data || {};
  try {
    if (data.type === 'init') {
      const { Pose } = await import('@mediapipe/pose');
      pose = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      pose.onResults((results: any) => {
        // send back results to main thread
        // Note: results can be large; consider pruning if necessary
        (self as any).postMessage({ type: 'results', results });
      });
      (self as any).postMessage({ type: 'ready' });
    }

    if (data.type === 'frame' && pose) {
      // data.bitmap expected to be an ImageBitmap
      try {
        await pose.send({ image: data.bitmap });
      } catch (e) {
        (self as any).postMessage({ type: 'error', error: String(e) });
      }
    }
  } catch (err) {
    (self as any).postMessage({ type: 'error', error: String(err) });
  }
};
