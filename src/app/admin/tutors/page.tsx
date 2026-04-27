import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminTutorsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = params.status;
  if (typeof status === "string" && status.length > 0) {
    redirect(`/admin/verifications?status=${status}`);
  }
  redirect("/admin/verifications");
}
