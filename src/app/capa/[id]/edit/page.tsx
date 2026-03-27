import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCapaRecordDetails,
  getDepartmentOptions,
  getPriorityOptions,
  getRootCauseMethodOptions,
  getStatusOptions,
  getUserOptions,
  updateCapaRecord,
} from "@/services/capa-service";
import { getCurrentUserWithRoles } from "@/services/auth-service";

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function toIsoFromDateInput(value: string): string | null {
  if (!value) return null;
  const iso = new Date(`${value}T00:00:00Z`).toISOString();
  return iso;
}

export default async function EditCapaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user: currentUser, roles: currentRoles } = await getCurrentUserWithRoles();

  const [
    capa,
    statusOptions,
    priorityOptions,
    departmentOptions,
    rootCauseMethodOptions,
    userOptions,
  ] = await Promise.all([
    getCapaRecordDetails(id),
    getStatusOptions(),
    getPriorityOptions(),
    getDepartmentOptions(),
    getRootCauseMethodOptions(),
    getUserOptions(500),
  ]);

  if (!capa.record) {
    redirect("/capa");
  }

  const isQualityManager = currentRoles.some(
    (role) => role.code.toUpperCase() === "QUALITY_MANAGER",
  );
  const canEditCapa =
    isQualityManager ||
    (currentUser?.id !== undefined &&
      capa.record.owner_user_id !== null &&
      currentUser.id === capa.record.owner_user_id);

  if (!canEditCapa) {
    redirect(`/capa/${id}`);
  }

  async function update(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const descriptionRaw = String(formData.get("description") ?? "").trim();
    const description = descriptionRaw ? descriptionRaw : null;

    const status_id = String(formData.get("status_id") ?? "").trim();
    const priority_id_raw = String(formData.get("priority_id") ?? "").trim();
    const priority_id = priority_id_raw ? priority_id_raw : null;

    const root_cause_method_id_raw = String(
      formData.get("root_cause_method_id") ?? "",
    ).trim();
    const root_cause_method_id = root_cause_method_id_raw
      ? root_cause_method_id_raw
      : null;

    const root_cause_summary_raw = String(
      formData.get("root_cause_summary") ?? "",
    ).trim();
    const root_cause_summary = root_cause_summary_raw
      ? root_cause_summary_raw
      : null;

    const correction_description_raw = String(
      formData.get("correction_description") ?? "",
    ).trim();
    const correction_description = correction_description_raw
      ? correction_description_raw
      : null;

    const corrective_action_plan_raw = String(
      formData.get("corrective_action_plan") ?? "",
    ).trim();
    const corrective_action_plan = corrective_action_plan_raw
      ? corrective_action_plan_raw
      : null;

    const preventive_action_plan_raw = String(
      formData.get("preventive_action_plan") ?? "",
    ).trim();
    const preventive_action_plan = preventive_action_plan_raw
      ? preventive_action_plan_raw
      : null;

    const verification_required =
      formData.get("verification_required") === "on";
    const effectiveness_review_required =
      formData.get("effectiveness_review_required") === "on";

    const assigned_date = toIsoFromDateInput(
      String(formData.get("assigned_date") ?? ""),
    );
    const target_completion_date = toIsoFromDateInput(
      String(formData.get("target_completion_date") ?? ""),
    );
    const actual_completion_date = toIsoFromDateInput(
      String(formData.get("actual_completion_date") ?? ""),
    );

    const owner_user_id_raw = String(formData.get("owner_user_id") ?? "")
      .trim();
    const owner_user_id = owner_user_id_raw ? owner_user_id_raw : null;

    const department_id_raw = String(formData.get("department_id") ?? "").trim();
    const department_id = department_id_raw ? department_id_raw : null;

    if (!title || !status_id || !department_id) {
      redirect(`/capa/${id}/edit?error=Missing+required+fields`);
    }

    await updateCapaRecord(id, {
      title,
      description,
      status_id,
      priority_id,
      root_cause_method_id,
      root_cause_summary,
      correction_description,
      corrective_action_plan,
      preventive_action_plan,
      verification_required,
      effectiveness_review_required,
      assigned_date,
      target_completion_date,
      actual_completion_date,
      owner_user_id,
      department_id,
    });

    redirect(`/capa/${id}?tab=actions`);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit CAPA
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Update fields and save changes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/capa/${id}`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-800 bg-transparent px-4 text-sm font-medium text-slate-200 transition hover:bg-slate-900/40"
          >
            Back
          </Link>
        </div>
      </header>

      <form
        action={update}
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Basic info & analysis
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Title
            </label>
            <input
              name="title"
              required
              defaultValue={capa.record.title}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              defaultValue={capa.record.description ?? ""}
              className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Status
            </label>
            <select
              name="status_id"
              required
              defaultValue={capa.record.status_id}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              {statusOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Priority
            </label>
            <select
              name="priority_id"
              defaultValue={capa.record.priority_id ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">(none)</option>
              {priorityOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Root cause method
            </label>
            <select
              name="root_cause_method_id"
              defaultValue={capa.record.root_cause_method_id ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">(none)</option>
              {rootCauseMethodOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Verification required
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                name="verification_required"
                defaultChecked={capa.record.verification_required}
              />
              Enabled
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Root cause summary
            </label>
            <textarea
              name="root_cause_summary"
              rows={3}
              defaultValue={capa.record.root_cause_summary ?? ""}
              className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Correction description
            </label>
            <textarea
              name="correction_description"
              rows={3}
              defaultValue={capa.record.correction_description ?? ""}
              className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Effectiveness review required
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                name="effectiveness_review_required"
                defaultChecked={capa.record.effectiveness_review_required}
              />
              Enabled
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Department
            </label>
            <select
              name="department_id"
              required
              defaultValue={capa.record.department_id ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Select department</option>
              {departmentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Owner
            </label>
            <select
              name="owner_user_id"
              defaultValue={capa.record.owner_user_id ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">(unassigned)</option>
              {userOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Assigned date
            </label>
            <input
              name="assigned_date"
              type="date"
              defaultValue={toDateInputValue(capa.record.assigned_date)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Target completion date
            </label>
            <input
              name="target_completion_date"
              type="date"
              defaultValue={toDateInputValue(
                capa.record.target_completion_date,
              )}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Actual completion date
            </label>
            <input
              name="actual_completion_date"
              type="date"
              defaultValue={toDateInputValue(capa.record.actual_completion_date)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Corrective action plan
            </label>
            <textarea
              name="corrective_action_plan"
              rows={3}
              defaultValue={capa.record.corrective_action_plan ?? ""}
              className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Preventive action plan
            </label>
            <textarea
              name="preventive_action_plan"
              rows={3}
              defaultValue={capa.record.preventive_action_plan ?? ""}
              className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-400"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}

