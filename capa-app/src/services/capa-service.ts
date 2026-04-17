import type { CapaRecord, CapaAction, CapaComment } from "@/domain/capa";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createServerClient } from "@/lib/supabase/server";

export async function getCurrentActor(): Promise<{
  userId: number;
  organizationId: string | null;
  roleCodes: string[];
  permissionCodes: string[];
} | null> {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: user, error: userError } = await supabase
    .schema("core")
    .from("users")
    .select("id, organization_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (userError || !user) return null;

  const { data: roleRows, error: rolesError } = await supabase
    .schema("core")
    .from("user_roles")
    .select(`
      user_id,
      core_roles:roles(code)
    `)
    .eq("user_id", user.id);

  const roleCodes =
    rolesError
      ? []
      : (roleRows ?? [])
          .map((row: { core_roles?: { code?: string } | { code?: string }[] | null }) => {
            const rel = row.core_roles;
            if (Array.isArray(rel)) return rel[0]?.code;
            return rel?.code;
          })
          .filter((code: string | undefined): code is string => Boolean(code))
          .map((code: string) => code.toUpperCase());

  let permissionCodes: string[] = [];
  if (roleCodes.length > 0) {
    const { data: permRows, error: permError } = await supabase
      .schema("core")
      .from("role_permissions")
      .select("permission_code")
      .in("role_code", roleCodes);

    if (!permError && permRows) {
      permissionCodes = [
        ...new Set(
          permRows.map((p: { permission_code: string }) => p.permission_code),
        ),
      ];
    }
  }

  return {
    userId: Number(user.id),
    organizationId: user.organization_id ?? null,
    roleCodes,
    permissionCodes,
  };
}

export type SelectOption = {
  id: string;
  label: string;
  sort_order?: number | null;
};

function toSelectOption(row: Record<string, unknown>): SelectOption | null {
  const rawId = row.id;
  if (rawId === null || rawId === undefined) return null;

  const id = String(rawId);
  const rawCode = row.code;
  const rawName = row.name;
  const rawSortOrder = row.sort_order;
  const sort_order = typeof rawSortOrder === "number" ? rawSortOrder : null;

  const label =
    typeof rawCode === "string" && rawCode.trim()
      ? rawCode
      : typeof rawName === "string" && rawName.trim()
        ? rawName
        : id;

  return { id, label, sort_order };
}

async function fetchOptions(
  schema: string,
  table: string,
): Promise<SelectOption[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .schema(schema)
    .from(table)
    .select("*");
  if (error) {
    console.error(`Failed to load options from ${schema}.${table}`, error.message);
    return [];
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map(toSelectOption).filter((o): o is SelectOption => Boolean(o));
}

export function getStatusOptions(): Promise<SelectOption[]> {
  return fetchOptions("ref", "status_codes");
}

export function getPriorityOptions(): Promise<SelectOption[]> {
  return fetchOptions("ref", "priority_codes");
}

export function getDepartmentOptions(): Promise<SelectOption[]> {
  return fetchOptions("core", "departments");
}

export function getCapaTypeOptions(): Promise<SelectOption[]> {
  return fetchOptions("ref", "capa_types");
}

export function getRootCauseMethodOptions(): Promise<SelectOption[]> {
  return fetchOptions("ref", "root_cause_methods");
}

export async function getUserOptions(limit = 200): Promise<SelectOption[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .schema("core")
    .from("users")
    .select("*")
    .order("email", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to load user options", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  // Prefer email; fallback to id.
  return rows
    .map((row) => {
      const rawId = row.id;
      if (rawId === null || rawId === undefined) return null;
      const id = String(rawId);
      const rawEmail = row.email;
      const rawFullName = row.full_name;
      const email = typeof rawEmail === "string" ? rawEmail : "";
      const fullName = typeof rawFullName === "string" ? rawFullName : "";
      const label = email.trim() ? email : fullName.trim() ? fullName : id;
      return { id, label };
    })
    .filter((o): o is SelectOption => Boolean(o));
}

export async function listCapaRecords(): Promise<CapaRecord[]> {
  return listCapaRecordsFiltered({});
}

export async function listCapaRecordsFiltered(filters: {
  status_id?: string;
  priority_id?: string;
  department_id?: string;
}): Promise<CapaRecord[]> {
  const supabase = await createServerClient();

  let query = supabase
    .schema("capa")
    .from("capa_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status_id) query = query.eq("status_id", filters.status_id);
  if (filters.priority_id)
    query = query.eq("priority_id", filters.priority_id);
  if (filters.department_id)
    query = query.eq("department_id", filters.department_id);

  const { data, error } = await query;

  if (error) {
    console.error("Error loading CAPA records", error.message);
    return [];
  }

  return (data ?? []) as CapaRecord[];
}

export async function getCapaRecordWithDetails(id: string): Promise<{
  record: CapaRecord | null;
  actions: CapaAction[];
  comments: CapaComment[];
}> {
  const { record, actions, comments } = await getCapaRecordDetails(id);
  return { record, actions, comments };
}

export async function getCapaRecordDetails(id: string): Promise<{
  record: CapaRecord | null;
  actions: CapaAction[];
  comments: CapaComment[];
  statusHistory: Array<{
    old_status_id: string | null;
    new_status_id: string;
    changed_by_user_id: string;
    changed_at: string;
    note: string | null;
  }>;
  actionStatusHistory: Array<{
    capa_action_id: string;
    old_status_id: string | null;
    new_status_id: string;
    changed_by_user_id: string;
    changed_at: string;
    note: string | null;
  }>;
  verifications: Array<{
    id: string;
    verification_type: string | null;
    verification_summary: string | null;
    verified_by_user_id: string | null;
    verified_at: string | null;
    result: string | null;
    notes: string | null;
  }>;
  effectivenessReviews: Array<{
    id: string;
    review_due_date: string | null;
    reviewed_by_user_id: string | null;
    reviewed_at: string | null;
    effectiveness_result: string | null;
    evidence_summary: string | null;
    follow_up_required: boolean | null;
    follow_up_note: string | null;
  }>;
}> {
  const supabase = await createServerClient();

  const [
    { data: recordData },
    { data: actionsData },
    { data: commentsData },
    { data: statusHistoryData },
    { data: verificationsData },
    { data: effectivenessReviewsData },
  ] = await Promise.all([
    supabase
      .schema("capa")
      .from("capa_records")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .schema("capa")
      .from("capa_actions")
      .select("*")
      .eq("capa_record_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .schema("capa")
      .from("capa_comments")
      .select("*")
      .eq("capa_record_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .schema("capa")
      .from("capa_status_history")
      .select("old_status_id,new_status_id,changed_by_user_id,changed_at,note")
      .eq("capa_record_id", id)
      .order("changed_at", { ascending: false }),
    supabase
      .schema("capa")
      .from("capa_verifications")
      .select(
        "id,verification_type,verification_summary,verified_by_user_id,verified_at,result,notes",
      )
      .eq("capa_record_id", id)
      .order("verified_at", { ascending: false }),
    supabase
      .schema("capa")
      .from("capa_effectiveness_reviews")
      .select(
        "id,review_due_date,reviewed_by_user_id,reviewed_at,effectiveness_result,evidence_summary,follow_up_required,follow_up_note",
      )
      .eq("capa_record_id", id)
      .order("reviewed_at", { ascending: false }),
  ]);

  const actions = (actionsData as CapaAction[]) ?? [];
  const actionsIds = actions.map((a) => a.id);

  let actionStatusHistory: Array<{
    capa_action_id: string;
    old_status_id: string | null;
    new_status_id: string;
    changed_by_user_id: string;
    changed_at: string;
    note: string | null;
  }> = [];

  if (actionsIds.length > 0) {
    const { data: actionStatusHistoryData } = await supabase
      .schema("capa")
      .from("capa_action_status_history")
      .select(
        "capa_action_id,old_status_id,new_status_id,changed_by_user_id,changed_at,note",
      )
      .in("capa_action_id", actionsIds)
      .order("changed_at", { ascending: false });

    actionStatusHistory =
      (actionStatusHistoryData as unknown as Array<{
        capa_action_id: string;
        old_status_id: string | null;
        new_status_id: string;
        changed_by_user_id: string;
        changed_at: string;
        note: string | null;
      }>) ?? [];
  }

  return {
    record: (recordData as CapaRecord) ?? null,
    actions,
    comments: (commentsData as CapaComment[]) ?? [],
    statusHistory:
      (statusHistoryData as unknown as Array<{
        old_status_id: string | null;
        new_status_id: string;
        changed_by_user_id: string;
        changed_at: string;
        note: string | null;
      }>) ?? [],
    actionStatusHistory,
    verifications:
      (verificationsData as unknown as Array<{
        id: string;
        verification_type: string | null;
        verification_summary: string | null;
        verified_by_user_id: string | null;
        verified_at: string | null;
        result: string | null;
        notes: string | null;
      }>) ?? [],
    effectivenessReviews:
      (effectivenessReviewsData as unknown as Array<{
        id: string;
        review_due_date: string | null;
        reviewed_by_user_id: string | null;
        reviewed_at: string | null;
        effectiveness_result: string | null;
        evidence_summary: string | null;
        follow_up_required: boolean | null;
        follow_up_note: string | null;
      }>) ?? [],
  };
}

export async function createCapaRecord(input: {
  title: string;
  description?: string;
  capa_type_id?: string;
  status_id?: string;
  priority_id?: string;
  department_id?: string;
  due_date?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createServerClient();

  const actor = await getCurrentActor();
  if (!actor) return { ok: false, error: "Not authenticated" };

  const coreUserId = String(actor.userId);

  const recordNo = "CAPA-" + Date.now();

  const { data, error } = await supabase
    .schema("capa")
    .from("capa_records")
    .insert({
      record_no: recordNo,
      title: input.title,
      description: input.description || "",
      capa_type_id: input.capa_type_id ?? null,
      status_id: input.status_id ?? null,
      priority_id: input.priority_id ?? null,
      department_id: input.department_id ?? null,
      due_date: input.due_date || null,
      owner_user_id: coreUserId,
      initiator_user_id: coreUserId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create CAPA record", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: (data as { id: string }).id };
}

export async function addCapaComment(input: {
  capa_record_id: string;
  comment_text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.schema("capa").from("capa_comments").insert({
    capa_record_id: input.capa_record_id,
    comment_text: input.comment_text,
    created_by_user_id: user.id,
  });

  if (error) {
    console.error("Failed to add comment", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function createCapaAction(input: {
  capa_record_id: string;
  title: string;
  description?: string;
  owner_user_id?: string;
  priority_id?: string;
  planned_start_date?: string;
  due_date?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase.schema("capa").from("capa_actions").insert({
    capa_record_id: input.capa_record_id,
    title: input.title,
    description: input.description ?? null,
    owner_user_id: input.owner_user_id ?? null,
    priority_id: input.priority_id ?? null,
    planned_start_date: input.planned_start_date ?? null,
    due_date: input.due_date ?? null,
  });

  if (error) {
    console.error("Failed to create CAPA action", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function updateCapaAction(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    owner_user_id: string | null;
    priority_id: string | null;
    planned_start_date: string | null;
    due_date: string | null;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClient();

  const payload: Record<string, unknown> = {};

  const assign = <K extends keyof typeof input>(key: K) => {
    const value = input[key];
    if (value !== undefined) payload[key] = value;
  };

  assign("title");
  assign("description");
  assign("owner_user_id");
  assign("priority_id");
  assign("planned_start_date");
  assign("due_date");

  const { error } = await supabase
    .schema("capa")
    .from("capa_actions")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Failed to update CAPA action", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function changeCapaActionStatus(input: {
  capa_action_id: string;
  new_status_id: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: action, error: fetchError } = await supabase
    .schema("capa")
    .from("capa_actions")
    .select("status_id")
    .eq("id", input.capa_action_id)
    .single();

  if (fetchError) {
    console.error("Failed to load CAPA action before status change", fetchError.message);
    return { ok: false, error: fetchError.message };
  }

  const oldStatusId = (action as { status_id: string }).status_id;

  const { data: statusRows, error: statusError } = await supabase
    .schema("ref")
    .from("status_codes")
    .select("id,sort_order")
    .in("id", [oldStatusId, input.new_status_id]);

  if (statusError) {
    console.error("Failed to load status workflow metadata", statusError.message);
    return { ok: false, error: statusError.message };
  }

  const statusOrderById = new Map(
    ((statusRows ?? []) as Array<{ id: string; sort_order: number | null }>).map(
      (row) => [row.id, row.sort_order],
    ),
  );

  const oldSortOrder = statusOrderById.get(oldStatusId);
  const newSortOrder = statusOrderById.get(input.new_status_id);

  if (oldSortOrder === undefined || newSortOrder === undefined) {
    throw new Error("Invalid status transition: unknown status code.");
  }

  if (oldSortOrder === null || newSortOrder === null) {
    throw new Error(
      "Invalid status transition: status sort_order is not configured.",
    );
  }

  if (newSortOrder < oldSortOrder) {
    throw new Error(
      "Invalid status transition: cannot move to an earlier workflow status.",
    );
  }

  const { error: updateError } = await supabase
    .schema("capa")
    .from("capa_actions")
    .update({ status_id: input.new_status_id })
    .eq("id", input.capa_action_id);

  if (updateError) {
    console.error("Failed to update CAPA action status", updateError.message);
    return { ok: false, error: updateError.message };
  }

  const { error: historyError } = await supabase
    .schema("capa")
    .from("capa_action_status_history")
    .insert({
      capa_action_id: input.capa_action_id,
      old_status_id: oldStatusId,
      new_status_id: input.new_status_id,
      changed_by_user_id: user.id,
    });

  if (historyError) {
    console.error(
      "Failed to insert CAPA action status history",
      historyError.message,
    );
    return { ok: false, error: historyError.message };
  }

  return { ok: true };
}

export async function updateCapaRecord(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    status_id: string;
    priority_id: string | null;
    root_cause_method_id: string | null;
    root_cause_summary: string | null;
    correction_description: string | null;
    corrective_action_plan: string | null;
    preventive_action_plan: string | null;
    verification_required: boolean;
    effectiveness_review_required: boolean;
    assigned_date: string | null;
    target_completion_date: string | null;
    actual_completion_date: string | null;
    owner_user_id: string | null;
    department_id: string | null;
    closed_at: string | null;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClient();

  const payload: Record<string, unknown> = {};

  const assign = <K extends keyof typeof input>(key: K) => {
    const value = input[key];
    if (value !== undefined) payload[key] = value;
  };

  assign("title");
  assign("description");
  assign("status_id");
  assign("priority_id");
  assign("root_cause_method_id");
  assign("root_cause_summary");
  assign("correction_description");
  assign("corrective_action_plan");
  assign("preventive_action_plan");
  assign("verification_required");
  assign("effectiveness_review_required");
  assign("assigned_date");
  assign("target_completion_date");
  assign("actual_completion_date");
  assign("owner_user_id");
  assign("department_id");
  assign("closed_at");

  const { error } = await supabase
    .schema("capa")
    .from("capa_records")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Failed to update CAPA record", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

