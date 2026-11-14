import { Suspense } from "react";
import { LeadsPage } from "@/components/admin/pages/Leads";

export const instant = false;
export const metadata = { title: "Leads" };

export default function Page() {
  return (
    <Suspense>
      <LeadsPage />
    </Suspense>
  );
}
