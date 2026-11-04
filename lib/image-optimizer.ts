/**
 * Client-Side Image Optimizer and WebP Converter
 * Converts JPEG, PNG, and BMP image assets into WebP format before upload,
 * substantially reducing file sizes, network bandwidth, and transfer times.
 */

// Supported image MIME types eligible for WebP conversion
export const CONVERTIBLE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/bmp',
] as const;

// Supported file extensions eligible for WebP conversion
export const CONVERTIBLE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'bmp',
] as const;

// Formats explicitly barred from conversion to preserve vector or multi-frame fidelity
export const EXCLUDED_EXTENSIONS = [
  'svg', // Vector graphics must remain XML/SVG
  'gif', // Animated GIFs lose multi-frame animation if drawn on static canvas
  'webp', // Already in WebP format
] as const;

/**
 * Checks if a given file or metadata object is eligible for WebP conversion.
 */
export function isConvertibleImage(file: { name: string; type?: string }): boolean {
  if (!file || !file.name) return false;

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Exclude explicit formats
  if (EXCLUDED_EXTENSIONS.includes(ext as any)) {
    return false;
  }

  // Check MIME type if present
  if (file.type && typeof file.type === 'string') {
    const mime = file.type.toLowerCase();
    if (mime === 'image/svg+xml' || mime === 'image/gif' || mime === 'image/webp') {
      return false;
    }
    if (CONVERTIBLE_MIME_TYPES.some((m) => mime === m || mime.startsWith(m))) {
      return true;
    }
  }

  // Fallback to extension check
  return CONVERTIBLE_EXTENSIONS.includes(ext as any);
}

/**
 * Replaces convertible image extension with .webp while preserving the base filename.
 */
export function changeExtensionToWebp(filename: string): string {
  if (!filename) return 'image.webp';

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return `${filename}.webp`;
  }

  const baseName = filename.substring(0, lastDotIndex);
  const ext = filename.substring(lastDotIndex + 1).toLowerCase();

  if (ext === 'webp') {
    return filename;
  }

  if (CONVERTIBLE_EXTENSIONS.includes(ext as any)) {
    return `${baseName}.webp`;
  }

  return `${filename}.webp`;
}

/**
 * Normalizes relative directory paths to update the extension to .webp.
 */
export function changePathToWebp(relativePath?: string): string | undefined {
  if (!relativePath) return undefined;
  const normalized = relativePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');

  if (lastSlash >= 0) {
    const dir = normalized.substring(0, lastSlash);
    const file = normalized.substring(lastSlash + 1);
    return `${dir}/${changeExtensionToWebp(file)}`;
  }

  return changeExtensionToWebp(normalized);
}

/**
 * Computes percentage of file size reduction.
 */
export function calculateSavingsPercentage(originalBytes: number, newBytes: number): number {
  if (originalBytes <= 0 || newBytes >= originalBytes) {
    return 0;
  }
  return Math.round(((originalBytes - newBytes) / originalBytes) * 100);
}

export interface OptimizationResult {
  file: File;
  originalSize: number;
  newSize: number;
  converted: boolean;
  savingsPercentage: number;
}

export interface OptimizeOptions {
  /** Compression quality between 0.1 and 1.0 (default: 0.85) */
  quality?: number;
  /** Maximum pixel dimension (width or height) to prevent canvas memory exhaustion */
  maxDimension?: number;
}

/**
 * Converts a convertible image File into a WebP File using HTML5 Canvas.
 * Gracefully falls back to the original file if execution fails or occurs outside a browser.
 */
export async function convertImageToWebp(
  file: File,
  options: OptimizeOptions = {}
): Promise<OptimizationResult> {
  const originalSize = file.size;

  // Verify eligibility
  if (!isConvertibleImage(file)) {
    return {
      file,
      originalSize,
      newSize: originalSize,
      converted: false,
      savingsPercentage: 0,
    };
  }

  // Verify browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      file,
      originalSize,
      newSize: originalSize,
      converted: false,
      savingsPercentage: 0,
    };
  }

  const quality = typeof options.quality === 'number'
    ? Math.max(0.1, Math.min(1.0, options.quality))
    : 0.85;

  const maxDimension = options.maxDimension || 8192; // 8K safety ceiling

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let imageSource: ImageBitmap | HTMLImageElement;

    if (typeof window.createImageBitmap === 'function') {
      imageSource = await createImageBitmap(file);
      sourceWidth = imageSource.width;
      sourceHeight = imageSource.height;
    } else {
      // Fallback for older browser engines
      imageSource = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image for WebP conversion'));
        };
        img.src = objectUrl;
      });
      sourceWidth = imageSource.naturalWidth || imageSource.width;
      sourceHeight = imageSource.naturalHeight || imageSource.height;
    }

    if (!sourceWidth || !sourceHeight) {
      throw new Error('Invalid image dimensions');
    }

    // Downscale if image exceeds max dimension to avoid browser crash
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (sourceWidth > maxDimension || sourceHeight > maxDimension) {
      if (sourceWidth > sourceHeight) {
        targetWidth = maxDimension;
        targetHeight = Math.round((sourceHeight / sourceWidth) * maxDimension);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((sourceWidth / sourceHeight) * maxDimension);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    // Render image
    ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

    // Clean up ImageBitmap if used
    if ('close' in imageSource && typeof (imageSource as any).close === 'function') {
      (imageSource as any).close();
    }

    // Export as WebP Blob
    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/webp',
        quality
      );
    });

    if (!webpBlob) {
      throw new Error('WebP blob creation returned null');
    }

    const newFileName = changeExtensionToWebp(file.name);
    const webpFile = new File([webpBlob], newFileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });

    const newSize = webpFile.size;
    const savings = calculateSavingsPercentage(originalSize, newSize);

    return {
      file: webpFile,
      originalSize,
      newSize,
      converted: true,
      savingsPercentage: savings,
    };
  } catch (err) {
    console.warn(`WebP conversion bypassed for ${file.name}:`, err);
    return {
      file,
      originalSize,
      newSize: originalSize,
      converted: false,
      savingsPercentage: 0,
    };
  }
}
