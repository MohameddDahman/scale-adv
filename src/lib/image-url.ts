/**
 * Uploaded images live in Convex file storage. On the free plan Convex
 * allows about 1 GB of file downloads a month, so visitors should never pull
 * images from Convex directly. Instead they go through Next's image
 * optimizer, which fetches each file once, resizes it and serves it from
 * its own cache (see `images` in next.config.ts).
 */

const CONVEX_FILE = /^https:\/\/[a-z0-9-]+\.convex\.cloud\/api\/storage\//i;

export const isConvexFile = (src: string) => CONVEX_FILE.test(src);

/**
 * True when next/image can resize and cache this source: files in /public
 * and Convex storage over https. Anything else (a pasted link to another
 * site, or the local development backend) is shown as-is.
 */
export const canOptimize = (src: string) => src.startsWith("/") || isConvexFile(src);

/** Widths allowed by images.deviceSizes / images.imageSizes in next.config.ts. */
export type ImageWidth = 256 | 384 | 640 | 750 | 828 | 1080 | 1200 | 1920;

/**
 * A single optimized URL, for places that can't use <Image>: a <video>
 * poster or a CSS background.
 */
export function optimizedSrc(src: string, width: ImageWidth): string {
  if (!canOptimize(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}
