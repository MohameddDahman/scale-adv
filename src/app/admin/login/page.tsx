import { Suspense } from "react";
import { LoginScreen } from "@/components/admin/AuthScreens";

export const instant = false;
export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
