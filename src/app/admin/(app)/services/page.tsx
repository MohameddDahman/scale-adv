import { ListPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Services" };

export default function Page() {
  return <ListPage resource="services" />;
}
