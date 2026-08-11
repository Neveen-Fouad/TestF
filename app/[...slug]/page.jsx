import { redirect } from "next/navigation";

export default async function VamoraRoute({ params }) {
  const { slug } = await params;
  const target = encodeURIComponent(`/${slug.join("/")}`);
  redirect(`/voyago.html?route=${target}`);
}
