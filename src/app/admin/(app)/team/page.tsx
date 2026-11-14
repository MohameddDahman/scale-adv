import { ListPage } from "@/components/admin/registry";

export const instant = false;
export const metadata = { title: "Team on site" };

export default function Page() {
  return <ListPage resource="team" />;
}
