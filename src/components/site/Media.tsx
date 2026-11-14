import Image from "next/image";
import { cn } from "@/lib/format";

/**
 * Local assets go through next/image; uploaded files (Convex storage URLs)
 * are already compressed by the dashboard and load as plain lazy images.
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
  priority?: boolean;
}) {
  if (src.startsWith("/")) {
    return <Image src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("absolute inset-0 size-full", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
