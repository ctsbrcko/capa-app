"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import type { SelectOption } from "@/services/capa-service";

type Props = {
  capaTypeOptions: SelectOption[];
  statusOptions: SelectOption[];
  priorityOptions: SelectOption[];
  departmentOptions: SelectOption[];
};

async function handleSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();

  const formData = new FormData(e.currentTarget);

  try {
    const res = await fetch("/api/capa", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      window.location.href = "/capa";
      return;
    }

    const errorText = await res.text();

    console.error("BACKEND ERROR:", errorText);
    alert("Error creating CAPA:\n" + errorText);

  } catch (err) {
    console.error("NETWORK ERROR:", err);
    alert("Network error while creating CAPA");
  }
}

export function NewCapaForm({
  capaTypeOptions,
  statusOptions,
  priorityOptions,
  departmentOptions,
}: Props) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create CAPA</h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter the initial CAPA information.
          </p>
        </div>
        <Link
          href="/capa"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-800 bg-transparent px-4 text-sm font-medium text-slate-200 transition hover:bg-slate-900/50"
        >
          Back to list
        </Link>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Title
            </label>
            <input
              name="title"
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="e.g., Prevent recurring nonconformity in supplier process"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-200">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="Add context, impact, and relevant background..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              CAPA Type
            </label>
            <select
              name="capa_type_id"
              required
              defaultValue=""
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="" disabled>
                Select type
              </option>
              {capaTypeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Status
            </label>
            <select
              name="status_id"
              required
              defaultValue=""
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="" disabled>
                Select status
              </option>
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
              defaultValue=""
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
              Department
            </label>
            <select
              name="department_id"
              required
              defaultValue=""
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="" disabled>
                Select department
              </option>
              {departmentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm">Due Date</label>
            <input
              type="date"
              name="due_date"
              className="border p-2 rounded"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-sky-400"
        >
          Create CAPA
        </button>
      </form>
    </div>
  );
}
