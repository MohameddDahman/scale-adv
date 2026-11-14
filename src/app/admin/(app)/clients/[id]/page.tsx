import { Suspense } from "react";
import { EditorPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Edit" };

export default function Page({ params }: PageProps<"/admin/clients/[id]">) {
  return (
    <Suspense>
      <EditorPage resource="clients" params={params} />
    </Suspense>
  );
}
