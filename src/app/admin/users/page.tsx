import { auth } from "@/lib/auth";
import { listAdminUsers } from "@/lib/admin";
import { UsersTable } from "./users-table";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const params = await searchParams;
  const search = (params.search as string | undefined) ?? "";
  const role = (params.role as string | undefined) ?? "";
  const users = await listAdminUsers({
    search: search || null,
    role: role || null,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
          Users
        </p>
        <h1 className="text-2xl font-semibold text-white">
          {users.length} accounts
        </h1>
        <p className="text-sm text-slate-400">
          Search, suspend, delete, or promote accounts to admin.
        </p>
      </header>

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_200px_120px]">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search email or name"
          className="h-10 rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300"
        />
        <select
          name="role"
          defaultValue={role}
          className="h-10 rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white focus:border-cyan-300"
        >
          <option value="">All roles</option>
          <option value="TUTOR">Tutor</option>
          <option value="TUTEE">Tutee</option>
          <option value="BOTH">Both</option>
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-cyan-300 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
        >
          Search
        </button>
      </form>

      <UsersTable users={users} currentAdminId={session!.user!.id} />
    </div>
  );
}
