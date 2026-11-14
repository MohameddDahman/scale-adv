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

/** Uploads a file to a Convex upload URL with progress reporting. Resolves with the storage id. */
export function uploadWithProgress(url: string, file: File, onProgress?: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).storageId);
        } catch {
          reject(new Error("Unexpected upload response"));
        }
      } else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}
