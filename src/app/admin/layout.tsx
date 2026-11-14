import type { Metadata, Viewport } from "next";
import { AdminRoot } from "@/components/admin/AdminRoot";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "SCALE Studio", template: "%s — SCALE Studio" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0e0d0c" };

/** Applies the saved light/dark choice before first paint. */
const themeScript = `try{var t=localStorage.getItem('scale.admin.theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" dir="ltr" className={`${fontVariables} admin`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh text-[0.875rem]">
        <AdminRoot>{children}</AdminRoot>
      </body>
    </html>
  );
}
