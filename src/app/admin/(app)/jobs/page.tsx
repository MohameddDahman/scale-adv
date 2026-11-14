import { ListPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Jobs" };

export default function Page() {
  return <ListPage resource="jobs" />;
}
