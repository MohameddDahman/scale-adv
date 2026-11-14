import { ListPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Case studies" };

export default function Page() {
  return <ListPage resource="caseStudies" />;
}
