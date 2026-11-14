import { Suspense } from "react";
import { ResetScreen } from "@/components/admin/AuthScreens";

export const instant = false;
export const metadata = { title: "Reset password" };

export default function ResetPage() {
  return (
    <Suspense>
      <ResetScreen />
    </Suspense>
  );
}
