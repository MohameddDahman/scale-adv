import { ListPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Clients" };

export default function Page() {
  return <ListPage resource="clients" />;
}
