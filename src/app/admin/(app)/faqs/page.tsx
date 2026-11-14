import { ListPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Faqs" };

export default function Page() {
  return <ListPage resource="faqs" />;
}
