// Global test setup for Vitest / JSDOM environment

// 1. Suppress React 18/19 act() deprecation warning emitted by testing-library internals
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('ReactDOMTestUtils.act` is deprecated in favor of `React.act`')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// 2. Comprehensive canvas 2D mock for JSDOM
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === '2d') {
      return {
        canvas: this,
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
        resetTransform: () => {},
        scale: () => {},
        rotate: () => {},
        translate: () => {},
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  };
}
