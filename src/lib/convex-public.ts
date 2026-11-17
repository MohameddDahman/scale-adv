"use client";

import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";

let client: ConvexHttpClient | null = null;

/** HTTP client for public form submissions (no websocket needed on the marketing site). */
export function publicConvex(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  client ??= new ConvexHttpClient(url);
  return client;
}

export type ServerError = { code?: string; field?: string; message: string };

export function readError(error: unknown): ServerError {
  if (error instanceof ConvexError) {
    const data = error.data as unknown;
    if (typeof data === "string") return { message: data };
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      return {
        code: typeof d.code === "string" ? d.code : undefined,
        field: typeof d.field === "string" ? d.field : undefined,
        message: typeof d.message === "string" ? d.message : "Something went wrong.",
      };
    }
  }
  return { code: "NETWORK", message: error instanceof Error ? error.message : "Something went wrong." };
}

/**
 * The CV upload endpoint (convex/http.ts). HTTP routes live on the
 * deployment's ".convex.site" address; it's derived from the Convex URL when
 * NEXT_PUBLIC_CONVEX_SITE_URL isn't set.
 */
export function cvUploadEndpoint(): string | null {
  const explicit = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  const base = explicit || siteUrlFrom(process.env.NEXT_PUBLIC_CONVEX_URL);
  return base ? `${base.replace(/\/+$/, "")}/cv` : null;
}

function siteUrlFrom(convexUrl: string | undefined): string | null {
  if (!convexUrl) return null;
  try {
    const u = new URL(convexUrl);
    if (u.hostname.endsWith(".convex.cloud")) {
      u.hostname = u.hostname.replace(/\.convex\.cloud$/, ".convex.site");
      return u.origin;
    }
    // Local backend: HTTP routes are served on the next port (3210 → 3211).
    if (u.port) {
      u.port = String(Number(u.port) + 1);
      return u.origin;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Uploads a file with progress reporting and resolves with the storage id.
 * Works with Convex upload URLs and with the CV endpoint, whose refusals
 * (too big, wrong type, too many uploads) come back as a ConvexError code.
 */
export function uploadWithProgress(url: string, file: File, onProgress?: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: { storageId?: string; code?: string; message?: string } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.storageId) return resolve(body.storageId);
      if (body?.code) return reject(new ConvexError({ code: body.code, message: body.message ?? "Upload failed." }));
      reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.send(file);
  });
}
