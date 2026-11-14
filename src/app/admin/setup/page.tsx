import { Suspense } from "react";
import { SetupScreen } from "@/components/admin/AuthScreens";

export const instant = false;
export const metadata = { title: "Set up" };

export default function SetupPage() {
  return (
    <Suspense>
      <SetupScreen />
    </Suspense>
  );
}
