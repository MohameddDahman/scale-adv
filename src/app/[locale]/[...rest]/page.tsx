import { notFound } from "next/navigation";

/** Unknown paths inside a locale render the branded 404 within the site layout. */
export default function CatchAll() {
  notFound();
}
