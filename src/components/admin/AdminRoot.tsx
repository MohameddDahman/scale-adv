"use client";

import type { ReactNode } from "react";
import { Wordmark } from "@/components/site/Wordmark";
import { AdminProviders } from "./session";

export function AdminRoot({ children }: { children: ReactNode }) {
  return <AdminProviders fallback={<NotConnected />}>{children}</AdminProviders>;
}

/** Shown until NEXT_PUBLIC_CONVEX_URL exists, so a fresh clone explains itself. */
function NotConnected() {
  return (
    <div className="grid min-h-dvh place-items-center bg-a-bg p-6">
      <div className="w-full max-w-lg rounded-[8px] border border-a-line bg-a-surface p-8">
        <span className="text-[1.8rem]">
          <Wordmark />
        </span>
        <h1 className="a-heading mt-6 text-[1.3rem]">Connect the database to use the dashboard</h1>
        <p className="mt-2 text-[0.9rem] text-a-muted">
          The website works with starter content, but the dashboard needs Convex. In the project folder, run:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-[6px] bg-ink-950 p-4 font-mono text-[0.8rem] leading-relaxed text-chalk">
          npx convex dev
        </pre>
        <p className="mt-4 text-[0.85rem] text-a-muted">
          Sign in to Convex when asked, then restart <code className="font-mono">npm run dev</code>. The first person to open
          /admin/setup becomes the owner. Full steps are in the README.
        </p>
      </div>
    </div>
  );
}
