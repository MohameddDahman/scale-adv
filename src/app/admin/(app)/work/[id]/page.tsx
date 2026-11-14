import { Suspense } from "react";
import { EditorPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Edit" };

export default function Page({ params }: PageProps<"/admin/work/[id]">) {
  return (
    <Suspense>
      <EditorPage resource="reels" params={params} />
    </Suspense>
  );
}
