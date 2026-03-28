import Link from "next/link";
import {
  getDepartmentOptions,
  getPriorityOptions,
  getStatusOptions,
  listCapaRecordsFiltered,
} from "@/services/capa-service";

type SearchParams = {
  status_id?: string | string[];
  priority_id?: string | string[];
  department_id?: string | string[];
  error?: string | string[];
};

function firstParam(value: SearchParams[keyof SearchParams]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function CapaDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolved = (await searchParams) ?? {};
  const status_id = firstParam(resolved.status_id);
  const priority_id = firstParam(resolved.priority_id);
  const department_id = firstParam(resolved.department_id);
  const error = firstParam(resolved.error);

  const [statusOptions, priorityOptions, departmentOptions] = await Promise.all([
    getStatusOptions(),
    getPriorityOptions(),
    getDepartmentOptions(),
  ]);

  const records = await listCapaRecordsFiltered({
    status_id: status_id || undefined,
    priority_id: priority_id || undefined,
    department_id: department_id || undefined,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CAPA Records</h1>
          <p className="mt-1 text-sm text-slate-400">
            Overview of corrective and preventive actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          <Link
            href="/capa/new"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-400"
          >
            Create CAPA
          </Link>
        </div>
      </header>

      <section className="space-y-4">
        <form
          method="GET"
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Filters
          </h2>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr,1fr,1fr,auto]">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Status
              </label>
              <select
                name="status_id"
                defaultValue={status_id ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">All</option>
                {statusOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Priority
              </label>
              <select
                name="priority_id"
                defaultValue={priority_id ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">All</option>
                {priorityOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Department
              </label>
              <select
                name="department_id"
                defaultValue={department_id ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">All</option>
                {departmentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-10 rounded-lg bg-slate-800 px-4 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
              >
                Apply
              </button>
              <Link
                href="/capa"
                className="h-10 rounded-lg border border-slate-800 bg-transparent px-4 text-sm font-medium text-slate-200 transition hover:bg-slate-900/50"
              >
                Clear
              </Link>
            </div>
          </div>
        </form>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Records
          </h2>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Record No
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Title
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Priority
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Department
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {records.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-slate-500"
                    >
                      No CAPA records match the current filters.
                    </td>
                  </tr>
                )}

                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-900/80">
                    <td className="px-3 py-2 align-top text-slate-200">
                      <Link
                        href={`/capa/${record.id}`}
                        className="font-medium text-sky-400 hover:text-sky-300"
                      >
                        {record.record_no || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top text-slate-100">
                      {record.title}
                      {record.description && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                          {record.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-400">
                      {record.status_id}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-400">
                      {record.priority_id ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-400">
                      {record.department_id ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-400">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

