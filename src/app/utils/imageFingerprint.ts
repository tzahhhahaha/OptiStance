const FINGERPRINT_WIDTH = 9;
const FINGERPRINT_HEIGHT = 8;

export const MAX_IMAGE_FINGERPRINT_DISTANCE = 5;

export function differenceHashFromGrayscale(
  pixels: ArrayLike<number>,
  width: number,
  height: number
): string {
  if (width < FINGERPRINT_WIDTH || height < FINGERPRINT_HEIGHT || pixels.length < width * height) {
    throw new Error('Image is too small to fingerprint.');
  }

  let hash = 0n;
  for (let y = 0; y < FINGERPRINT_HEIGHT; y += 1) {
    for (let x = 0; x < FINGERPRINT_WIDTH - 1; x += 1) {
      const left = pixels[y * width + x];
      const right = pixels[y * width + x + 1];
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }

  return hash.toString(16).padStart(16, '0');
}

export function areImageFingerprintsSimilar(
  first: string,
  second: string,
  maxDistance = MAX_IMAGE_FINGERPRINT_DISTANCE
): boolean {
  if (!/^[\da-f]{16}$/i.test(first) || !/^[\da-f]{16}$/i.test(second)) {
    return false;
  }

  let differingBits = BigInt(`0x${first}`) ^ BigInt(`0x${second}`);
  let distance = 0;
  while (differingBits && distance <= maxDistance) {
    differingBits &= differingBits - 1n;
    distance += 1;
  }

  return distance <= maxDistance;
}

export function fingerprintUploadedImage(image: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = FINGERPRINT_WIDTH;
  canvas.height = FINGERPRINT_HEIGHT;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Could not prepare the uploaded image for duplicate checking.');
  }

  context.drawImage(image, 0, 0, FINGERPRINT_WIDTH, FINGERPRINT_HEIGHT);
  const { data } = context.getImageData(0, 0, FINGERPRINT_WIDTH, FINGERPRINT_HEIGHT);
  const grayscale = new Uint8Array(FINGERPRINT_WIDTH * FINGERPRINT_HEIGHT);
  for (let pixel = 0; pixel < grayscale.length; pixel += 1) {
    const offset = pixel * 4;
    grayscale[pixel] = Math.round(
      data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114
    );
  }

  return differenceHashFromGrayscale(grayscale, FINGERPRINT_WIDTH, FINGERPRINT_HEIGHT);
}
