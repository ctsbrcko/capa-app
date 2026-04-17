import Link from "next/link";
import CapaChart from "@/components/dashboard/CapaChart";
import type { CapaRecord } from "@/domain/capa";
import {
  getStatusOptions,
  listCapaRecords,
} from "@/services/capa-service";

function bucketByStatusIndex(
  statusId: string,
  sortedStatusIds: string[],
): "open" | "inProgress" | "closed" {
  const n = sortedStatusIds.length;
  if (n === 0) return "open";
  const idx = sortedStatusIds.indexOf(statusId);
  if (idx === -1) return "open";
  if (n === 1) return "open";
  if (idx === 0) return "open";
  if (idx === n - 1) return "closed";
  return "inProgress";
}

function aggregateCapaStats(
  records: CapaRecord[],
  statusOptions: Awaited<ReturnType<typeof getStatusOptions>>,
) {
  const ordered = [...statusOptions].sort((a, b) => {
    const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.label.localeCompare(b.label);
  });
  const sortedStatusIds = ordered.map((s) => s.id);

  let open = 0;
  let inProgress = 0;
  let closed = 0;

  for (const r of records) {
    if (r.closed_at) {
      closed++;
      continue;
    }
    const bucket = bucketByStatusIndex(r.status_id, sortedStatusIds);
    if (bucket === "open") open++;
    else if (bucket === "closed") closed++;
    else inProgress++;
  }

  const total = records.length;
  return { total, open, inProgress, closed };
}

export default async function DashboardPage() {
  const [records, statusOptions] = await Promise.all([
    listCapaRecords(),
    getStatusOptions(),
  ]);

  const { total, open, inProgress, closed } = aggregateCapaStats(
    records,
    statusOptions,
  );

  const chartData = [
    { name: "Open", value: open },
    { name: "In Progress", value: inProgress },
    { name: "Closed", value: closed },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            CAPA volume by workflow state (from status order and closure).
          </p>
        </div>
        <Link
          href="/capa"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-4 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
        >
          View records
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-50">
            {total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Open
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-sky-400">
            {open}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            In progress
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-violet-400">
            {inProgress}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Closed
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-400">
            {closed}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          CAPA by status
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Open = earliest workflow status; closed = final status or{" "}
          <span className="text-slate-400">closed_at</span> set; in progress =
          statuses in between.
        </p>
        <div className="mt-6">
          <CapaChart data={chartData} />
        </div>
      </section>
    </div>
  );
}
