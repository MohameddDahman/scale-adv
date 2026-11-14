import { ListPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Testimonials" };

export default function Page() {
  return <ListPage resource="testimonials" />;
}
