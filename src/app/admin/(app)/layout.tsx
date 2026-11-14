import type { ReactNode } from "react";
import { AdminGate } from "@/components/admin/Shell";

/**
 * Dashboard screens render on the client after the session is checked, so
 * they're opted out of instant-navigation validation.
 */
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
