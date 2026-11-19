/**
 * Africhat Image Compression & Processing Utilities
 * Enforces aggressive adaptive compression (WebP/JPEG) so avatars and media
 * consume minimal Supabase DB / storage / Realtime bandwidth.
 */

export interface ImageCompressionOptions {
  maxDimension?: number;
  minDimension?: number;
  maxBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  cropSquare?: boolean;
}

const DEFAULT_SVG_PLACEHOLDER_PREFIX = 'data:image/svg+xml';

/**
 * Returns true if an avatar URL is empty or a generic placeholder SVG/icon.
 */
export function isPlaceholderAvatar(url?: string | null): boolean {
  if (!url || !url.trim()) return true;
  const trimmed = url.trim();
  if (trimmed.startsWith(DEFAULT_SVG_PLACEHOLDER_PREFIX)) return true;
  if (trimmed.includes('api.dicebear.com/')) return true;
  return false;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function encodeCanvasSmallest(canvas: HTMLCanvasElement, quality: number): string {
  const jpegUrl = canvas.toDataURL('image/jpeg', quality);
  try {
    const webpUrl = canvas.toDataURL('image/webp', quality);
    if (webpUrl.startsWith('data:image/webp') && webpUrl.length < jpegUrl.length) {
      return webpUrl;
    }
  } catch (_) {}
  return jpegUrl;
}

/**
 * Adaptively compresses a File or image data URL until its encoded payload
 * fits comfortably inside `maxBytes` (using WebP when supported, else JPEG).
 */
export async function compressImageToBudget(
  source: File | string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const {
    maxDimension = 640,
    minDimension = 240,
    maxBytes = 55 * 1024,
    initialQuality = 0.65,
    minQuality = 0.28,
    cropSquare = false,
  } = options;

  // Max base64 string length for the target byte budget (~1.37x raw bytes + header)
  const maxCharLength = Math.round(maxBytes * 1.38) + 64;

  if (typeof source === 'string') {
    if (!source.startsWith('data:image')) return source;
    if (source.includes('image/gif') && source.length <= maxCharLength) return source;
    if (source.includes('image/svg+xml') && source.length <= 4096) return source;
    if (source.length <= maxCharLength && !cropSquare) return source;
  } else {
    if (source.type === 'image/gif' && source.size <= maxBytes) {
      return readFileAsDataUrl(source);
    }
    if (source.type === 'image/svg+xml' && source.size <= 3072) {
      return readFileAsDataUrl(source);
    }
  }

  let objectUrl: string | null = null;
  try {
    const src =
      typeof source === 'string'
        ? source
        : ((objectUrl = URL.createObjectURL(source)), objectUrl);

    const img = await loadImageElement(src);
    const naturalW = img.naturalWidth || img.width || maxDimension;
    const naturalH = img.naturalHeight || img.height || maxDimension;

    let currentMaxDim = maxDimension;
    let bestDataUrl = '';

    for (let dimPass = 0; dimPass < 5; dimPass++) {
      let sx = 0;
      let sy = 0;
      let sw = naturalW;
      let sh = naturalH;

      let targetW = naturalW;
      let targetH = naturalH;

      if (cropSquare) {
        const side = Math.min(naturalW, naturalH);
        sx = Math.floor((naturalW - side) / 2);
        sy = Math.floor((naturalH - side) / 2);
        sw = side;
        sh = side;
        const outSide = Math.min(side, currentMaxDim);
        targetW = outSide;
        targetH = outSide;
      } else if (naturalW > currentMaxDim || naturalH > currentMaxDim) {
        if (naturalW >= naturalH) {
          targetW = currentMaxDim;
          targetH = Math.max(1, Math.round((naturalH * currentMaxDim) / naturalW));
        } else {
          targetH = currentMaxDim;
          targetW = Math.max(1, Math.round((naturalW * currentMaxDim) / naturalH));
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, targetW);
      canvas.height = Math.max(1, targetH);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return typeof source === 'string' ? source : readFileAsDataUrl(source);
      }

      // Fill white background for transparent PNGs converted to JPEG/WebP
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      for (let q = initialQuality; q >= minQuality - 0.001; q -= 0.1) {
        const clampedQ = Math.max(minQuality, Number(q.toFixed(2)));
        const candidate = encodeCanvasSmallest(canvas, clampedQ);
        bestDataUrl = candidate;
        if (candidate.length <= maxCharLength) {
          return candidate;
        }
      }

      const nextDim = Math.round(currentMaxDim * 0.72);
      if (nextDim < minDimension || currentMaxDim <= minDimension) {
        break;
      }
      currentMaxDim = Math.max(minDimension, nextDim);
    }

    if (bestDataUrl) return bestDataUrl;
    return typeof source === 'string' ? source : readFileAsDataUrl(source);
  } catch (err) {
    if (typeof source === 'string') return source;
    return readFileAsDataUrl(source);
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

/**
 * Ultra-compact square avatar compressor (~3KB - 12KB max, 144x144px).
 * Small enough to persist cleanly inside Supabase DB columns and sync everywhere.
 */
export async function compressAvatarImage(source: File | string): Promise<string> {
  return compressImageToBudget(source, {
    maxDimension: 144,
    minDimension: 72,
    maxBytes: 12 * 1024,
    initialQuality: 0.68,
    minQuality: 0.3,
    cropSquare: true,
  });
}

/**
 * Strongly compressed chat/status/product photo (~18KB - 55KB max, 640px).
 */
export async function compressChatMediaImage(source: File | string): Promise<string> {
  return compressImageToBudget(source, {
    maxDimension: 640,
    minDimension: 260,
    maxBytes: 55 * 1024,
    initialQuality: 0.64,
    minQuality: 0.28,
    cropSquare: false,
  });
}

/**
 * Ultra-lean Data Saver image compression (~18KB max, 360px) for Instant Data Saver Mode.
 */
export async function compressLowDataMediaImage(source: File | string): Promise<string> {
  return compressImageToBudget(source, {
    maxDimension: 360,
    minDimension: 180,
    maxBytes: 18 * 1024,
    initialQuality: 0.44,
    minQuality: 0.2,
    cropSquare: false,
  });
}

/**
 * Compressed chat background wallpaper (~25KB - 65KB max, 720px).
 */
export async function compressWallpaperImage(source: File | string): Promise<string> {
  return compressImageToBudget(source, {
    maxDimension: 720,
    minDimension: 320,
    maxBytes: 65 * 1024,
    initialQuality: 0.6,
    minQuality: 0.28,
    cropSquare: false,
  });
}

export async function compressImageFile(
  file: File,
  maxDimension = 640,
  quality = 0.64
): Promise<string> {
  return compressImageToBudget(file, {
    maxDimension,
    minDimension: Math.min(240, maxDimension),
    maxBytes: 55 * 1024,
    initialQuality: quality,
    minQuality: 0.28,
  });
}

/**
 * Downsamples an existing data URL if it exceeds tight storage/payload limits (~55KB).
 */
export async function downsampleDataUrl(
  dataUrl: string,
  maxDimension = 640,
  quality = 0.64
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image') || dataUrl.includes('image/gif')) {
    return dataUrl;
  }
  if (dataUrl.length <= 72000) {
    return dataUrl;
  }
  return compressImageToBudget(dataUrl, {
    maxDimension,
    minDimension: Math.min(240, maxDimension),
    maxBytes: 55 * 1024,
    initialQuality: quality,
    minQuality: 0.28,
  });
}

/**
 * Extracts a compressed JPEG thumbnail frame from a video File, data URL, or remote URL.
 * Returns empty string gracefully if extraction fails or times out.
 */
export async function captureVideoThumbnail(source: File | string): Promise<string> {
  if (typeof document === 'undefined') return '';
  if (typeof source === 'string' && !source.trim()) return '';

  let objectUrl: string | null = null;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  const src =
    typeof source === 'string'
      ? source
      : ((objectUrl = URL.createObjectURL(source)), objectUrl);

  if (typeof source === 'string' && /^https?:\/\//i.test(source)) {
    video.crossOrigin = 'anonymous';
  }

  try {
    const dataUrl = await new Promise<string>((resolve) => {
      let settled = false;
      const finish = (result: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (_) {}
        resolve(result);
      };

      const captureFrame = () => {
        try {
          const vw = video.videoWidth || 480;
          const vh = video.videoHeight || 480;
          if (!vw || !vh) {
            finish('');
            return;
          }
          const maxDim = 480;
          let targetW = vw;
          let targetH = vh;
          if (vw > maxDim || vh > maxDim) {
            if (vw >= vh) {
              targetW = maxDim;
              targetH = Math.max(1, Math.round((vh * maxDim) / vw));
            } else {
              targetH = maxDim;
              targetW = Math.max(1, Math.round((vw * maxDim) / vh));
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            finish('');
            return;
          }
          ctx.drawImage(video, 0, 0, targetW, targetH);
          const rawUrl = encodeCanvasSmallest(canvas, 0.68);
          finish(rawUrl);
        } catch (_) {
          finish('');
        }
      };

      const onSeeked = () => captureFrame();
      const onLoadedData = () => {
        if (Number.isFinite(video.duration) && video.duration > 0.3) {
          try {
            video.currentTime = Math.min(0.25, video.duration / 4);
            return;
          } catch (_) {}
        }
        captureFrame();
      };
      const onError = () => finish('');

      const timeoutId = setTimeout(() => {
        if (video.readyState >= 2) {
          captureFrame();
        } else {
          finish('');
        }
      }, 2800);

      video.addEventListener('loadeddata', onLoadedData);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.src = src;
      video.load();
    });

    if (!dataUrl) return '';
    return await compressChatMediaImage(dataUrl);
  } catch (_) {
    return '';
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

