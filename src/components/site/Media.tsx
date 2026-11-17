import Image from "next/image";
import { cn } from "@/lib/format";
import { canOptimize } from "@/lib/image-url";

/**
 * Site images. Files in /public and uploads in Convex storage go through
 * next/image, so visitors get a resized copy from Next's cache instead of
 * downloading the original from Convex. Links to other sites load as-is.
 */
export function Media({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  /** Above the fold: load right away instead of lazily. */
  priority?: boolean;
}) {
  if (canOptimize(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("absolute inset-0 size-full", className)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
}
