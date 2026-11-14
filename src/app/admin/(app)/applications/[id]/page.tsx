import { Suspense } from "react";
import { ApplicationDetail } from "@/components/admin/pages/Applications";

export const instant = false;
export const metadata = { title: "Application" };

export default function Page({ params }: PageProps<"/admin/applications/[id]">) {
  return (
    <Suspense>
      <ApplicationDetail params={params} />
    </Suspense>
  );
}
