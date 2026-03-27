import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addCapaComment,
  changeCapaActionStatus,
  createCapaAction,
  getAllowedNextStatuses,
  getCapaRecordDetails,
  getDepartmentOptions,
  getPriorityOptions,
  getRootCauseMethodOptions,
  getStatusOptions,
  getUserOptions,
  updateCapaAction,
  updateCapaRecord,
} from "@/services/capa-service";
import { revalidatePath } from "next/cache";
import { getCurrentUserWithRoles } from "@/services/auth-service";

async function addComment(formData: FormData) {
  "use server";

  const capaRecordId = String(formData.get("capa_record_id") ?? "");
  const commentText = String(formData.get("comment_text") ?? "");

  if (!capaRecordId || !commentText.trim()) return;

  await addCapaComment({
    capa_record_id: capaRecordId,
    comment_text: commentText,
  });

  revalidatePath(`/capa/${capaRecordId}`);
}

async function createAction(formData: FormData) {
  "use server";

  const capaRecordId = String(formData.get("capa_record_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const owner_user_id = String(formData.get("owner_user_id") ?? "").trim();
  const priority_id = String(formData.get("priority_id") ?? "").trim();
  const planned_start_date = String(
    formData.get("planned_start_date") ?? "",
  ).trim();
  const due_date = String(formData.get("due_date") ?? "").trim();

  if (!capaRecordId || !title) return;

  await createCapaAction({
    capa_record_id: capaRecordId,
    title,
    description: description || undefined,
    owner_user_id: owner_user_id || undefined,
    priority_id: priority_id || undefined,
    planned_start_date: planned_start_date || undefined,
    due_date: due_date || undefined,
  });

  revalidatePath(`/capa/${capaRecordId}?tab=actions`);
}

async function updateAction(formData: FormData) {
  "use server";

  const actionId = String(formData.get("action_id") ?? "");
  const capaRecordId = String(formData.get("capa_record_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw || null;
  const owner_user_id_raw = String(formData.get("owner_user_id") ?? "").trim();
  const owner_user_id = owner_user_id_raw || null;
  const priority_id_raw = String(formData.get("priority_id") ?? "").trim();
  const priority_id = priority_id_raw || null;
  const planned_start_date_raw = String(
    formData.get("planned_start_date") ?? "",
  ).trim();
  const planned_start_date = planned_start_date_raw || null;
  const due_date_raw = String(formData.get("due_date") ?? "").trim();
  const due_date = due_date_raw || null;

  if (!actionId || !capaRecordId || !title) return;

  await updateCapaAction(actionId, {
    title,
    description,
    owner_user_id,
    priority_id,
    planned_start_date,
    due_date,
  });

  revalidatePath(`/capa/${capaRecordId}?tab=actions`);
}

async function changeActionStatus(formData: FormData) {
  "use server";

  const actionId = String(formData.get("action_id") ?? "");
  const capaRecordId = String(formData.get("capa_record_id") ?? "");
  const statusId = String(formData.get("status_id") ?? "").trim();

  if (!actionId || !capaRecordId || !statusId) return;

  await changeCapaActionStatus({
    capa_action_id: actionId,
    new_status_id: statusId,
  });

  revalidatePath(`/capa/${capaRecordId}?tab=actions`);
}

async function closeCapa(formData: FormData) {
  "use server";

  const capaRecordId = String(formData.get("capa_record_id") ?? "");
  if (!capaRecordId) return;

  await updateCapaRecord(capaRecordId, {
    closed_at: new Date().toISOString(),
  });

  revalidatePath(`/capa/${capaRecordId}`);
}

export default async function CapaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: { tab?: string | string[] };
}) {
  const firstParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const { id } = await params;
  const tab = firstParam(searchParams?.tab) ?? "actions";
  const { user: currentUser, roles: currentRoles } = await getCurrentUserWithRoles();

  const {
    record,
    actions,
    comments,
    statusHistory,
    actionStatusHistory,
    verifications,
    effectivenessReviews,
  } = await getCapaRecordDetails(id);

  if (!record) {
    notFound();
  }

  const [
    statusOptions,
    priorityOptions,
    departmentOptions,
    rootCauseMethodOptions,
    userOptions,
  ] = await Promise.all([
    getStatusOptions(),
    getPriorityOptions(),
    getDepartmentOptions(),
    getRootCauseMethodOptions(),
    getUserOptions(500),
  ]);

  const statusById = new Map(statusOptions.map((o) => [o.id, o.label]));
  const statusCodeById = new Map(statusOptions.map((o) => [o.id, o.code ?? ""]));
  const statusIsFinalById = new Map(
    statusOptions.map((o) => [o.id, o.is_final ?? false]),
  );
  const priorityById = new Map(priorityOptions.map((o) => [o.id, o.label]));
  const departmentById = new Map(
    departmentOptions.map((o) => [o.id, o.label]),
  );
  const rootCauseById = new Map(
    rootCauseMethodOptions.map((o) => [o.id, o.label]),
  );
  const userById = new Map(userOptions.map((o) => [o.id, o.label]));

  const toDateOnly = (value: string | null) =>
    value ? value.slice(0, 10) : "";

  const ownerLabel = record.owner_user_id
    ? userById.get(record.owner_user_id) ?? record.owner_user_id
    : "—";
  const departmentLabel = record.department_id
    ? departmentById.get(record.department_id) ?? record.department_id
    : "—";

  const canTransitionStatus = (fromStatusId: string, toStatusId: string) => {
    if (statusIsFinalById.get(fromStatusId)) return false;
    if (fromStatusId === toStatusId) return true;
    const fromCode = statusCodeById.get(fromStatusId);
    const toCode = statusCodeById.get(toStatusId);
    if (!fromCode || !toCode) return false;
    const allowedNextStatuses = getAllowedNextStatuses(fromCode);
    return allowedNextStatuses.includes(toCode);
  };

  type TimelineEvent = {
    id: string;
    occurredAt: string;
    eventType: "CAPA_STATUS" | "ACTION_STATUS" | "COMMENT";
    userLabel: string;
    description: string;
  };

  const timelineEvents: TimelineEvent[] = [
    ...statusHistory.map((h, idx) => ({
      id: `status-${idx}-${h.changed_at}`,
      occurredAt: h.changed_at,
      eventType: "CAPA_STATUS" as const,
      userLabel: userById.get(h.changed_by_user_id) ?? h.changed_by_user_id,
      description: `CAPA status changed: ${
        statusById.get(h.old_status_id ?? "") ?? h.old_status_id ?? "—"
      } -> ${statusById.get(h.new_status_id) ?? h.new_status_id}${
        h.note ? ` (${h.note})` : ""
      }`,
    })),
    ...actionStatusHistory.map((h, idx) => {
      const action = actions.find((a) => a.id === h.capa_action_id);
      return {
        id: `action-status-${idx}-${h.changed_at}`,
        occurredAt: h.changed_at,
        eventType: "ACTION_STATUS" as const,
        userLabel: userById.get(h.changed_by_user_id) ?? h.changed_by_user_id,
        description: `${
          action ? `Action ${action.action_no}: ${action.title}` : "Action"
        } status changed: ${
          statusById.get(h.old_status_id ?? "") ?? h.old_status_id ?? "—"
        } -> ${statusById.get(h.new_status_id) ?? h.new_status_id}${
          h.note ? ` (${h.note})` : ""
        }`,
      };
    }),
    ...comments.map((c) => ({
      id: `comment-${c.id}`,
      occurredAt: c.created_at,
      eventType: "COMMENT" as const,
      userLabel: userById.get(c.created_by_user_id) ?? c.created_by_user_id,
      description: `Comment: ${c.comment_text}`,
    })),
  ].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const timelineByDate = timelineEvents.reduce<Record<string, TimelineEvent[]>>(
    (acc, event) => {
      const dateKey = event.occurredAt.slice(0, 10);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    },
    {},
  );

  const timelineDateKeys = Object.keys(timelineByDate).sort((a, b) =>
    b.localeCompare(a),
  );

  const isQualityManager = currentRoles.some(
    (role) => role.code.toUpperCase() === "QUALITY_MANAGER",
  );
  const canEditCapa =
    isQualityManager ||
    (currentUser?.id !== undefined &&
      record.owner_user_id !== null &&
      currentUser.id === record.owner_user_id);
  const canCloseCapa = isQualityManager && !record.closed_at;
  const canUpdateActionForUser = (actionOwnerUserId: string | null) =>
    currentUser?.id !== undefined &&
    actionOwnerUserId !== null &&
    currentUser.id === actionOwnerUserId;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            CAPA {record.record_no || record.id}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {record.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/capa"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-800 bg-transparent px-4 text-sm font-medium text-slate-200 transition hover:bg-slate-900/40"
          >
            Back
          </Link>
          {canEditCapa && (
            <Link
              href={`/capa/${id}/edit`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              Edit
            </Link>
          )}
          {canCloseCapa && (
            <form action={closeCapa}>
              <input type="hidden" name="capa_record_id" value={record.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-emerald-400"
              >
                Close CAPA
              </button>
            </form>
          )}
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Basic info
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Title
                </div>
                <div className="text-sm text-slate-100">{record.title}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Status
                </div>
                <div className="text-sm text-slate-100">
                  {statusById.get(record.status_id) ?? record.status_id}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="text-xs font-medium text-slate-400">
                  Description
                </div>
                <div className="text-sm text-slate-200">
                  {record.description || "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Priority
                </div>
                <div className="text-sm text-slate-100">
                  {record.priority_id
                    ? priorityById.get(record.priority_id) ?? record.priority_id
                    : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Verification required
                </div>
                <div className="text-sm text-slate-100">
                  {record.verification_required ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Root cause analysis
            </h2>
            <div className="mt-4 grid gap-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Root cause method
                </div>
                <div className="text-sm text-slate-100">
                  {record.root_cause_method_id
                    ? rootCauseById.get(record.root_cause_method_id) ??
                      record.root_cause_method_id
                    : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Root cause summary
                </div>
                <div className="text-sm text-slate-200">
                  {record.root_cause_summary || "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Correction description
                </div>
                <div className="text-sm text-slate-200">
                  {record.correction_description || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Action plans
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Corrective action plan
                </div>
                <div className="text-sm text-slate-200">
                  {record.corrective_action_plan || "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Preventive action plan
                </div>
                <div className="text-sm text-slate-200">
                  {record.preventive_action_plan || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Dates
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Assigned date
                </div>
                <div className="text-sm text-slate-100">
                  {toDateOnly(record.assigned_date)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Target completion date
                </div>
                <div className="text-sm text-slate-100">
                  {toDateOnly(record.target_completion_date)}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="text-xs font-medium text-slate-400">
                  Actual completion date
                </div>
                <div className="text-sm text-slate-100">
                  {toDateOnly(record.actual_completion_date)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Owner and department
            </h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">Owner</div>
                <div className="text-sm text-slate-100">{ownerLabel}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Department
                </div>
                <div className="text-sm text-slate-100">
                  {departmentLabel}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  Effectiveness review required
                </div>
                <div className="text-sm text-slate-100">
                  {record.effectiveness_review_required ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Tabs
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/capa/${id}?tab=actions`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === "actions"
                    ? "bg-slate-800 text-slate-100"
                    : "border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                Actions
              </Link>
              <Link
                href={`/capa/${id}?tab=comments`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === "comments"
                    ? "bg-slate-800 text-slate-100"
                    : "border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                Comments
              </Link>
              <Link
                href={`/capa/${id}?tab=history`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === "history"
                    ? "bg-slate-800 text-slate-100"
                    : "border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                History
              </Link>
              <Link
                href={`/capa/${id}?tab=verification`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === "verification"
                    ? "bg-slate-800 text-slate-100"
                    : "border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                Verification
              </Link>
              <Link
                href={`/capa/${id}?tab=effectiveness`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === "effectiveness"
                    ? "bg-slate-800 text-slate-100"
                    : "border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                Effectiveness Review
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {tab === "actions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Actions
              </h2>
              {record.closed_at && (
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  CAPA is closed – actions read-only
                </span>
              )}
            </div>

            {!record.closed_at && canEditCapa && (
              <form
                action={createAction}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm"
              >
                <input type="hidden" name="capa_record_id" value={record.id} />
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  New action
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Title
                    </label>
                    <input
                      name="title"
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Owner
                    </label>
                    <select
                      name="owner_user_id"
                      defaultValue=""
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">(unassigned)</option>
                      {userOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Priority
                    </label>
                    <select
                      name="priority_id"
                      defaultValue=""
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">(none)</option>
                      {priorityOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Planned start
                    </label>
                    <input
                      type="date"
                      name="planned_start_date"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Due date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-xs font-medium text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Add action
                </button>
              </form>
            )}

            {actions.length === 0 ? (
              <p className="text-slate-400">No actions yet.</p>
            ) : (
              <div className="space-y-3">
                {actions.map((action) => {
                  const isOverdue =
                    action.due_date &&
                    new Date(action.due_date) < new Date() &&
                    !record.closed_at;
                  const isCurrentStatusFinal =
                    statusIsFinalById.get(action.status_id) === true;

                  const ownerLabelForAction = action.owner_user_id
                    ? userById.get(action.owner_user_id) ??
                      action.owner_user_id
                    : "—";
                  const canUpdateThisAction = canUpdateActionForUser(
                    action.owner_user_id,
                  );

                  return (
                    <div
                      key={action.id}
                      className={`rounded-lg border bg-slate-950/60 p-3 ${
                        isOverdue
                          ? "border-red-900/70"
                          : "border-slate-800"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <span>Action {action.action_no}</span>
                        <div className="flex items-center gap-2">
                          {isOverdue && (
                            <span className="rounded-full bg-red-950/80 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                              Overdue
                            </span>
                          )}
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-100">
                            {statusById.get(action.status_id) ??
                              action.status_id}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-100">
                        {action.title}
                      </p>
                      {action.description && (
                        <p className="mt-1 text-xs text-slate-300">
                          {action.description}
                        </p>
                      )}
                      <div className="mt-2 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                        <div>
                          Owner:{" "}
                          <span className="text-slate-100">
                            {ownerLabelForAction}
                          </span>
                        </div>
                        <div>
                          Priority:{" "}
                          <span className="text-slate-100">
                            {action.priority_id
                              ? priorityById.get(action.priority_id) ??
                                action.priority_id
                              : "—"}
                          </span>
                        </div>
                        <div>
                          Due:{" "}
                          <span className="text-slate-100">
                            {toDateOnly(action.due_date)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.4fr),minmax(0,1.6fr)]">
                        <form
                          action={changeActionStatus}
                          className="flex flex-wrap items-end gap-2 text-xs"
                        >
                          <input
                            type="hidden"
                            name="capa_record_id"
                            value={record.id}
                          />
                          <input
                            type="hidden"
                            name="action_id"
                            value={action.id}
                          />
                          <div className="flex-1 space-y-1">
                            <label className="block text-[11px] font-medium text-slate-300">
                              Status
                            </label>
                            <select
                              name="status_id"
                              defaultValue={action.status_id}
                              disabled={
                                Boolean(record.closed_at) ||
                                isCurrentStatusFinal ||
                                !canUpdateThisAction
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
                            >
                              {statusOptions.map((o) => {
                                const allowed = canTransitionStatus(
                                  action.status_id,
                                  o.id,
                                );
                                return (
                                  <option
                                    key={o.id}
                                    value={o.id}
                                    disabled={o.id !== action.status_id && !allowed}
                                  >
                                    {o.label}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <button
                            type="submit"
                            disabled={
                              Boolean(record.closed_at) ||
                              isCurrentStatusFinal ||
                              !canUpdateThisAction
                            }
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-50 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Update status
                          </button>
                        </form>

                        {!record.closed_at && canUpdateThisAction && (
                          <form
                            action={updateAction}
                            className="space-y-2 text-xs"
                          >
                            <input
                              type="hidden"
                              name="capa_record_id"
                              value={record.id}
                            />
                            <input
                              type="hidden"
                              name="action_id"
                              value={action.id}
                            />
                            <div className="grid gap-2 md:grid-cols-2">
                              <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">
                                  Title
                                </label>
                                <input
                                  name="title"
                                  defaultValue={action.title}
                                  required
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">
                                  Owner
                                </label>
                                <select
                                  name="owner_user_id"
                                  defaultValue={action.owner_user_id ?? ""}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                >
                                  <option value="">(unassigned)</option>
                                  {userOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <label className="block text-[11px] font-medium text-slate-300">
                                  Description
                                </label>
                                <textarea
                                  name="description"
                                  rows={2}
                                  defaultValue={action.description ?? ""}
                                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">
                                  Priority
                                </label>
                                <select
                                  name="priority_id"
                                  defaultValue={action.priority_id ?? ""}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                >
                                  <option value="">(none)</option>
                                  {priorityOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">
                                  Planned start
                                </label>
                                <input
                                  type="date"
                                  name="planned_start_date"
                                  defaultValue={toDateOnly(
                                    action.planned_start_date,
                                  )}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">
                                  Due date
                                </label>
                                <input
                                  type="date"
                                  name="due_date"
                                  defaultValue={toDateOnly(action.due_date)}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                />
                              </div>
                            </div>
                            <button
                              type="submit"
                              className="mt-2 inline-flex items-center justify-center rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-50 transition hover:bg-slate-700"
                            >
                              Save action
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "comments" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Comments
            </h2>
            {comments.length === 0 ? (
              <p className="text-slate-400">No comments yet.</p>
            ) : (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <p className="text-xs text-slate-400">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-slate-100">
                      {comment.comment_text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form action={addComment} className="space-y-2 pt-2 text-sm">
              <input type="hidden" name="capa_record_id" value={record.id} />
              <label className="block text-xs font-medium text-slate-300">
                Add comment
              </label>
              <textarea
                name="comment_text"
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Post comment
              </button>
            </form>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Activity timeline
            </h2>
            {timelineEvents.length === 0 ? (
              <p className="text-slate-400">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {timelineDateKeys.map((dateKey) => (
                  <div key={dateKey} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {new Date(dateKey).toLocaleDateString()}
                    </div>
                    <div className="space-y-2">
                      {timelineByDate[dateKey].map((event) => {
                        const icon =
                          event.eventType === "CAPA_STATUS"
                            ? "S"
                            : event.eventType === "ACTION_STATUS"
                              ? "A"
                              : "C";
                        return (
                          <div
                            key={event.id}
                            className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-100">
                                {icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-slate-100">
                                  {event.description}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {event.userLabel} ·{" "}
                                  {new Date(event.occurredAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "verification" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Verification
            </h2>
            {verifications.length === 0 ? (
              <p className="text-slate-400">No verifications recorded.</p>
            ) : (
              <div className="space-y-2">
                {verifications.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>{v.verification_type ?? "Verification"}</span>
                      <span>
                        {v.verified_at ? new Date(v.verified_at).toLocaleString() : "—"}
                      </span>
                    </div>
                    {v.verification_summary && (
                      <div className="mt-2 text-sm text-slate-200">
                        {v.verification_summary}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-slate-400">
                      Result: {v.result ?? "—"}
                    </div>
                    {v.notes && <div className="mt-2 text-sm text-slate-200">{v.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "effectiveness" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Effectiveness Review
            </h2>
            {effectivenessReviews.length === 0 ? (
              <p className="text-slate-400">No effectiveness reviews recorded.</p>
            ) : (
              <div className="space-y-2">
                {effectivenessReviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>
                        Due: {r.review_due_date ? toDateOnly(r.review_due_date) : "—"}
                      </span>
                      <span>
                        {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Result: {r.effectiveness_result ?? "—"}
                    </div>
                    {r.evidence_summary && (
                      <div className="mt-2 text-sm text-slate-200">
                        {r.evidence_summary}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-slate-400">
                      Follow-up required: {r.follow_up_required ? "Yes" : "No"}
                    </div>
                    {r.follow_up_note && (
                      <div className="mt-2 text-sm text-slate-200">{r.follow_up_note}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

