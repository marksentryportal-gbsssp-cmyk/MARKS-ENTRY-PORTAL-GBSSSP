import { SchoolLogoData, LogoPrintSettings } from '../types';

export const DEFAULT_LOGO_URL = '/school-logo.png';

export const DEFAULT_LOGO_PRINT_SETTINGS: LogoPrintSettings = {
  position: 'left',
  size: 'medium',
  showLogoInPrint: true,
  bwPrintMode: false,
  showWatermark: true,
  watermarkOpacity: 0.07, // 7% opacity
};

/**
 * Trims transparent or near-empty border pixels from a canvas
 */
export function trimCanvasTransparentEdges(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      // Pixel is considered visible if alpha > 15
      if (alpha > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no visible pixels found or full canvas
  if (maxX < minX || maxY < minY) {
    return canvas;
  }

  // Add 2% padding so tight anti-aliasing isn't clipped
  const pad = Math.max(2, Math.round(Math.max(width, height) * 0.015));
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = cropW;
  trimmedCanvas.height = cropH;
  const trimmedCtx = trimmedCanvas.getContext('2d');
  if (!trimmedCtx) return canvas;

  trimmedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return trimmedCanvas;
}

/**
 * Resizes a canvas into target square dimensions preserving aspect ratio with centering
 */
export function resizeToSquareCanvas(
  sourceCanvas: HTMLCanvasElement,
  targetSize: number,
  paddingPercent = 0.02
): HTMLCanvasElement {
  const destCanvas = document.createElement('canvas');
  destCanvas.width = targetSize;
  destCanvas.height = targetSize;
  const ctx = destCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const sW = sourceCanvas.width;
  const sH = sourceCanvas.height;

  const maxDimension = targetSize * (1 - paddingPercent * 2);
  const scale = Math.min(maxDimension / sW, maxDimension / sH);

  const dW = Math.round(sW * scale);
  const dH = Math.round(sH * scale);
  const dX = Math.round((targetSize - dW) / 2);
  const dY = Math.round((targetSize - dH) / 2);

  ctx.drawImage(sourceCanvas, 0, 0, sW, sH, dX, dY, dW, dH);
  return destCanvas;
}

/**
 * Analyzes image luminance to detect if image is dark (needs subtle white glow/ring on navy backgrounds)
 */
export function checkIsDarkImage(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const w = canvas.width;
  const h = canvas.height;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 40));
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  let totalLuminance = 0;
  let sampleCount = 0;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      const alpha = d[idx + 3];
      if (alpha > 40) {
        // ITU-R BT.709 formula
        const lum = 0.2126 * d[idx] + 0.7152 * d[idx + 1] + 0.0722 * d[idx + 2];
        totalLuminance += lum;
        sampleCount++;
      }
    }
  }

  if (sampleCount === 0) return false;
  const avg = totalLuminance / sampleCount;
  // If average luminance is below 120, consider it a dark/navy logo
  return avg < 120;
}

/**
 * Loads an image from a URL or File into an HTMLImageElement
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + src));
    img.src = src;
  });
}

/**
 * Pure function to extract variants from an image source
 */
export function getLogoVariants(sourceCanvas: HTMLCanvasElement): SchoolLogoData {
  const trimmed = trimCanvasTransparentEdges(sourceCanvas);

  const fullCanvas = resizeToSquareCanvas(trimmed, 512, 0.02);
  const mediumCanvas = resizeToSquareCanvas(trimmed, 192, 0.02);
  const iconCanvas = resizeToSquareCanvas(trimmed, 64, 0.02);

  return {
    full: fullCanvas.toDataURL('image/png'),
    medium: mediumCanvas.toDataURL('image/png'),
    icon: iconCanvas.toDataURL('image/png'),
    updatedAt: new Date().toISOString(),
    source: 'upload',
  };
}

/**
 * Processes an uploaded logo File, trims whitespace, creates 512, 192, and 64px versions
 */
export async function processLogoFile(
  file: File,
  options?: { autoPadSquare?: boolean }
): Promise<{ logoData: SchoolLogoData; warnings: string[] }> {
  // 1. Validate file size (max 2MB)
  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 2 MB.`);
  }

  // 2. Validate format
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error('Unsupported image format. Please upload a PNG, JPG, SVG, or WebP file.');
  }

  // 3. Load file into Image
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image file. The file may be corrupt.'));
    reader.readAsDataURL(file);
  });

  const img = await loadImageElement(dataUrl);

  const warnings: string[] = [];

  // Check resolution
  if (img.width < 200 || img.height < 200) {
    warnings.push(`Image resolution (${img.width}x${img.height}px) is low. For crisp prints and marksheets, a resolution of 400px+ is recommended.`);
  }

  // Check aspect ratio
  const ratioDiff = Math.abs(img.width - img.height) / Math.max(img.width, img.height);
  if (ratioDiff > 0.08) {
    warnings.push(`Image is not square (${img.width}x${img.height}px). Auto-centered padding has been applied to prevent distortion.`);
  }

  // Draw into source canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not supported by your browser.');
  }
  ctx.drawImage(img, 0, 0);

  const logoData = getLogoVariants(canvas);
  return { logoData, warnings };
}

/**
 * Loads default school logo from public asset and creates logoData object
 */
export async function loadDefaultSchoolLogoData(): Promise<SchoolLogoData | null> {
  try {
    const img = await loadImageElement(DEFAULT_LOGO_URL);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const variants = getLogoVariants(canvas);
    variants.source = 'default';
    return variants;
  } catch (e) {
    console.warn('Could not load default school logo asset:', e);
    return null;
  }
}

/**
 * Dynamically updates the browser favicon and page title
 */
export function updateBrowserFaviconAndTitle(
  schoolLogo: SchoolLogoData | null,
  schoolName: string
): void {
  try {
    const iconUrl = schoolLogo?.icon || schoolLogo?.medium || DEFAULT_LOGO_URL;

    // Update <link rel="icon">
    let linkIcon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!linkIcon) {
      linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      document.head.appendChild(linkIcon);
    }
    linkIcon.href = iconUrl;

    // Update <link rel="apple-touch-icon">
    let appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = schoolLogo?.medium || iconUrl;

    // Update document title
    const shortName = schoolName
      ? schoolName.replace('GOPINATH BORDOLOI SENIOR SECONDARY SCHOOL, PAGLAHAT', 'GBSSS Paglahat')
      : 'GBSSS Paglahat';
    document.title = `${shortName} - Marks Entry Portal`;
  } catch (err) {
    console.warn('Could not update favicon or title', err);
  }
}

/**
 * Dynamically updates or injects the Web App Manifest with the school logo icons
 */
export function updateDynamicManifest(
  schoolLogo: SchoolLogoData | null,
  schoolInfo: { name: string; code: string }
): void {
  try {
    const icon192 = schoolLogo?.medium || '/icon-192.png';
    const icon512 = schoolLogo?.full || '/icon-512.png';

    const manifestObj = {
      name: schoolInfo.name || 'Gopinath Bordoloi Senior Secondary School',
      short_name: 'GBSSS Portal',
      description: 'School Internal Examination & Marks Entry Portal',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#0f766e',
      icons: [
        {
          src: icon192,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: icon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    };

    const manifestBlob = new Blob([JSON.stringify(manifestObj, null, 2)], {
      type: 'application/json',
    });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    let manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestUrl;
  } catch (err) {
    console.warn('Could not update dynamic manifest', err);
  }
}
