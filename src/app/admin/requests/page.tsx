import { listAdminRequests } from "@/lib/admin";
import { RequestsTable } from "./requests-table";

export default async function AdminRequestsPage() {
  const requests = await listAdminRequests();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
          Requests
        </p>
        <h1 className="text-2xl font-semibold text-white">
          {requests.length} tutoring requests
        </h1>
        <p className="text-sm text-slate-400">
          Change status, close spam, or mark a request as matched.
        </p>
      </header>
      <RequestsTable requests={requests} />
    </div>
  );
}
