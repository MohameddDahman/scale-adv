import { Suspense } from "react";
import { InviteScreen } from "@/components/admin/AuthScreens";

export const instant = false;
export const metadata = { title: "Accept invite" };

export default function InvitePage() {
  return (
    <Suspense>
      <InviteScreen />
    </Suspense>
  );
}
