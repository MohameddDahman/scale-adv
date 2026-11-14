import { Suspense } from "react";
import { ApplicationsPage } from "@/components/admin/pages/Applications";

export const instant = false;
export const metadata = { title: "Applications" };

export default function Page() {
  return (
    <Suspense>
      <ApplicationsPage />
    </Suspense>
  );
}
