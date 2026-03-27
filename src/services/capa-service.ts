import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CapaRecord, CapaAction, CapaComment } from "@/domain/capa";
import { cache } from "react";

export type SelectOption = {
  id: string;
  label: string;
  code?: string;
  is_final?: boolean;
  sort_order?: number | null;
};

const ACTION_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["VERIFIED"],
};

export function getAllowedNextStatuses(currentStatusCode: string): string[] {
  const normalized = currentStatusCode.trim().toUpperCase();
  return ACTION_STATUS_TRANSITIONS[normalized] ?? [];
}

async function getCurrentActor(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ userId: string; roleCodes: string[]; organizationId: string | null } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: actorUserRow, error: actorUserError } = await supabase
    .from("core.users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (actorUserError) {
    console.error("Failed to load actor organization", actorUserError.message);
  }

  const { data: roleRows, error } = await supabase
    .from("core.user_roles")
    .select(
      `
      core_roles:core.roles (
        code
      )
    `,
    )
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load actor roles", error.message);
    return {
      userId: user.id,
      roleCodes: [],
      organizationId:
        (actorUserRow as { organization_id?: string | null } | null)
          ?.organization_id ?? null,
    };
  }

  const roleCodes =
    (
      (roleRows ?? []) as unknown as Array<{
        core_roles: { code: string } | null;
      }>
    )
      .map((row) => row.core_roles?.code)
      .filter((code): code is string => Boolean(code))
      .map((code) => code.toUpperCase()) ?? [];

  return {
    userId: user.id,
    roleCodes,
    organizationId:
      (actorUserRow as { organization_id?: string | null } | null)
        ?.organization_id ?? null,
  };
}

async function notifyUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: {
    user_id: string;
    title: string;
    message: string;
    event_type: string;
    event_key?: string;
  },
): Promise<void> {
  if (input.event_key) {
    const { data: existing } = await supabase
      .from("core.notifications")
      .select("id")
      .eq("event_key", input.event_key)
      .maybeSingle();
    if (existing) return;
  }

  const { error } = await supabase.from("core.notifications").insert({
    user_id: input.user_id,
    title: input.title,
    message: input.message,
    event_type: input.event_type,
    event_key: input.event_key ?? null,
  });

  if (error) {
    console.error("Failed to create notification", error.message);
  }
}

function toSelectOption(row: Record<string, unknown>): SelectOption | null {
  const rawId = row.id;
  if (rawId === null || rawId === undefined) return null;

  const id = String(rawId);
  const rawCode = row.code;
  const rawName = row.name;
  const code = typeof rawCode === "string" ? rawCode : undefined;
  const rawIsFinal = row.is_final;
  const is_final = typeof rawIsFinal === "boolean" ? rawIsFinal : undefined;
  const rawSortOrder = row.sort_order;
  const sort_order = typeof rawSortOrder === "number" ? rawSortOrder : null;

  const label =
    typeof rawCode === "string" && rawCode.trim()
      ? rawCode
      : typeof rawName === "string" && rawName.trim()
        ? rawName
        : id;

  return { id, label, code, is_final, sort_order };
}

async function fetchOptions(table: string): Promise<SelectOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.error(`Failed to load options from ${table}`, error.message);
    return [];
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map(toSelectOption).filter((o): o is SelectOption => Boolean(o));
}

const fetchOptionsCached = cache(async (table: string): Promise<SelectOption[]> => {
  return fetchOptions(table);
});

export function getStatusOptions(): Promise<SelectOption[]> {
  return fetchOptionsCached("ref.status_codes");
}

export function getPriorityOptions(): Promise<SelectOption[]> {
  return fetchOptionsCached("ref.priority_codes");
}

export function getDepartmentOptions(): Promise<SelectOption[]> {
  return getDepartmentOptionsForCurrentOrganization();
}

export function getCapaTypeOptions(): Promise<SelectOption[]> {
  return fetchOptionsCached("ref.capa_types");
}

export function getRootCauseMethodOptions(): Promise<SelectOption[]> {
  return fetchOptionsCached("ref.root_cause_methods");
}

const getUserOptionsCached = cache(
  async (organizationId: string, limit: number): Promise<SelectOption[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("core.users")
      .select("*")
      .eq("organization_id", organizationId)
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
  },
);

const getDepartmentOptionsCached = cache(
  async (organizationId: string): Promise<SelectOption[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("core.departments")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load departments for organization", error.message);
      return [];
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    return rows.map(toSelectOption).filter((o): o is SelectOption => Boolean(o));
  },
);

async function getDepartmentOptionsForCurrentOrganization(): Promise<SelectOption[]> {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor?.organizationId) {
    console.error("Missing organization context for department options");
    return [];
  }
  return getDepartmentOptionsCached(actor.organizationId);
}

export async function getUserOptions(limit = 200): Promise<SelectOption[]> {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor?.organizationId) {
    console.error("Missing organization context for user options");
    return [];
  }
  return getUserOptionsCached(actor.organizationId, limit);
}

export async function listCapaRecords(): Promise<CapaRecord[]> {
  return listCapaRecordsFiltered({});
}

export async function listCapaRecordsFiltered(filters: {
  status_id?: string;
  priority_id?: string;
  department_id?: string;
}): Promise<CapaRecord[]> {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor?.organizationId) {
    console.error("Missing organization context for CAPA list");
    return [];
  }

  let query = supabase
    .from("capa.capa_records")
    .select(`
      *,
      status:ref.status_codes(id,code,name),
      priority:ref.priority_codes(id,code,name),
      department:core.departments(id,code,name)
    `)
    .eq("organization_id", actor.organizationId)
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

  return (data ?? []) as unknown as CapaRecord[];
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
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor?.organizationId) {
    return {
      record: null,
      actions: [],
      comments: [],
      statusHistory: [],
      actionStatusHistory: [],
      verifications: [],
      effectivenessReviews: [],
    };
  }

  const [
    { data: recordData },
    { data: actionsData },
    { data: commentsData },
    { data: statusHistoryData },
    { data: verificationsData },
    { data: effectivenessReviewsData },
  ] = await Promise.all([
    supabase
      .from("capa.capa_records")
      .select("*")
      .eq("organization_id", actor.organizationId)
      .eq("id", id)
      .single(),
    supabase
      .from("capa.capa_actions")
      .select("*")
      .eq("organization_id", actor.organizationId)
      .eq("capa_record_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("capa.capa_comments")
      .select("*")
      .eq("organization_id", actor.organizationId)
      .eq("capa_record_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("capa.capa_status_history")
      .select("old_status_id,new_status_id,changed_by_user_id,changed_at,note")
      .eq("organization_id", actor.organizationId)
      .eq("capa_record_id", id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("capa.capa_verifications")
      .select(
        "id,verification_type,verification_summary,verified_by_user_id,verified_at,result,notes",
      )
      .eq("capa_record_id", id)
      .order("verified_at", { ascending: false }),
    supabase
      .from("capa.capa_effectiveness_reviews")
      .select(
        "id,review_due_date,reviewed_by_user_id,reviewed_at,effectiveness_result,evidence_summary,follow_up_required,follow_up_note",
      )
      .eq("capa_record_id", id)
      .order("reviewed_at", { ascending: false }),
  ]);

  const actions = (actionsData as CapaAction[]) ?? [];
  // Generate overdue notifications in batch (deduplicated by event_key).
  const overdueActions = actions.filter((action) => {
    if (!action.owner_user_id || !action.due_date) return false;
    if (action.completed_at) return false;
    return new Date(action.due_date) < new Date();
  });
  const overdueEventKeys = overdueActions.map((action) => `action-overdue-${action.id}`);
  if (overdueEventKeys.length > 0) {
    const { data: existingOverdueRows } = await supabase
      .from("core.notifications")
      .select("event_key")
      .in("event_key", overdueEventKeys);

    const existingOverdueKeys = new Set(
      ((existingOverdueRows ?? []) as Array<{ event_key: string | null }>)
        .map((row) => row.event_key)
        .filter((key): key is string => Boolean(key)),
    );

    const notificationsToInsert = overdueActions
      .filter((action) => !existingOverdueKeys.has(`action-overdue-${action.id}`))
      .map((action) => ({
        user_id: action.owner_user_id as string,
        title: "Action overdue",
        message: `Action "${action.title}" is overdue.`,
        event_type: "ACTION_OVERDUE",
        event_key: `action-overdue-${action.id}`,
      }));

    if (notificationsToInsert.length > 0) {
      const { error: overdueInsertError } = await supabase
        .from("core.notifications")
        .insert(notificationsToInsert);
      if (overdueInsertError) {
        console.error(
          "Failed to insert overdue notifications batch",
          overdueInsertError.message,
        );
      }
    }
  }

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
      .from("capa.capa_action_status_history")
      .select(
        "capa_action_id,old_status_id,new_status_id,changed_by_user_id,changed_at,note",
      )
      .eq("organization_id", actor.organizationId)
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
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor) return { ok: false, error: "Not authenticated" };
  if (!actor.organizationId) {
    return { ok: false, error: "Missing organization context" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("capa.capa_records")
    .insert({
      title: input.title,
      description: input.description ?? null,
      capa_type_id: input.capa_type_id ?? null,
      status_id: input.status_id ?? null,
      priority_id: input.priority_id ?? null,
      department_id: input.department_id ?? null,
      owner_user_id: user.id,
      initiator_user_id: user.id,
      organization_id: actor.organizationId,
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
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor) return { ok: false, error: "Not authenticated" };
  if (!actor.organizationId) {
    return { ok: false, error: "Missing organization context" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: scopedRecord, error: scopeError } = await supabase
    .from("capa.capa_records")
    .select("id")
    .eq("id", input.capa_record_id)
    .eq("organization_id", actor.organizationId)
    .maybeSingle();
  if (scopeError) return { ok: false, error: scopeError.message };
  if (!scopedRecord) return { ok: false, error: "CAPA record not found in organization" };

  const { error } = await supabase.from("capa.capa_comments").insert({
    capa_record_id: input.capa_record_id,
    comment_text: input.comment_text,
    created_by_user_id: user.id,
    organization_id: actor.organizationId,
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
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor) return { ok: false, error: "Not authenticated" };
  if (!actor.organizationId) {
    return { ok: false, error: "Missing organization context" };
  }

  const { data: scopedRecord, error: scopeError } = await supabase
    .from("capa.capa_records")
    .select("id")
    .eq("id", input.capa_record_id)
    .eq("organization_id", actor.organizationId)
    .maybeSingle();
  if (scopeError) return { ok: false, error: scopeError.message };
  if (!scopedRecord) return { ok: false, error: "CAPA record not found in organization" };

  const { data: insertedAction, error } = await supabase
    .from("capa.capa_actions")
    .insert({
      capa_record_id: input.capa_record_id,
      organization_id: actor.organizationId,
      title: input.title,
      description: input.description ?? null,
      owner_user_id: input.owner_user_id ?? null,
      priority_id: input.priority_id ?? null,
      planned_start_date: input.planned_start_date ?? null,
      due_date: input.due_date ?? null,
    })
    .select("id,owner_user_id,title")
    .single();

  if (error) {
    console.error("Failed to create CAPA action", error.message);
    return { ok: false, error: error.message };
  }

  const actionRow = insertedAction as {
    id: string;
    owner_user_id: string | null;
    title: string;
  };
  if (actionRow.owner_user_id) {
    await notifyUser(supabase, {
      user_id: actionRow.owner_user_id,
      title: "Action assigned",
      message: `You were assigned action "${actionRow.title}".`,
      event_type: "ACTION_ASSIGNED",
      event_key: `action-assigned-${actionRow.id}-${actionRow.owner_user_id}`,
    });
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
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor) return { ok: false, error: "Not authenticated" };
  if (!actor.organizationId) {
    return { ok: false, error: "Missing organization context" };
  }

  const { data: actionRow, error: actionReadError } = await supabase
    .from("capa.capa_actions")
    .select("owner_user_id,title,organization_id")
    .eq("id", id)
    .eq("organization_id", actor.organizationId)
    .single();

  if (actionReadError) {
    console.error("Failed to load CAPA action for permission check", actionReadError.message);
    return { ok: false, error: actionReadError.message };
  }

  const ownerUserId = (actionRow as { owner_user_id: string | null }).owner_user_id;
  const actionTitle = (actionRow as { title: string }).title;
  if (!ownerUserId || ownerUserId !== actor.userId) {
    return { ok: false, error: "Only assigned user can update action." };
  }

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
    .from("capa.capa_actions")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Failed to update CAPA action", error.message);
    return { ok: false, error: error.message };
  }

  if (
    input.owner_user_id !== undefined &&
    input.owner_user_id !== null &&
    input.owner_user_id !== ownerUserId
  ) {
    await notifyUser(supabase, {
      user_id: input.owner_user_id,
      title: "Action assigned",
      message: `You were assigned action "${actionTitle}".`,
      event_type: "ACTION_ASSIGNED",
      event_key: `action-assigned-${id}-${input.owner_user_id}`,
    });
  }

  return { ok: true };
}

export async function changeCapaActionStatus(input: {
  capa_action_id: string;
  new_status_id: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor) return { ok: false, error: "Not authenticated" };
  if (!actor.organizationId) {
    return { ok: false, error: "Missing organization context" };
  }

  const { data: action, error: fetchError } = await supabase
    .from("capa.capa_actions")
    .select("status_id,capa_record_id,owner_user_id,organization_id")
    .eq("id", input.capa_action_id)
    .eq("organization_id", actor.organizationId)
    .single();

  if (fetchError) {
    console.error("Failed to load CAPA action before status change", fetchError.message);
    return { ok: false, error: fetchError.message };
  }

  const typedAction = action as {
    status_id: string;
    capa_record_id: string;
    owner_user_id: string | null;
  };
  const oldStatusId = typedAction.status_id;
  const capaRecordId = typedAction.capa_record_id;
  const actionOwnerUserId = typedAction.owner_user_id;

  if (!actionOwnerUserId || actionOwnerUserId !== actor.userId) {
    return { ok: false, error: "Only assigned user can update action status." };
  }

  if (oldStatusId === input.new_status_id) {
    return { ok: true };
  }

  const { data: statusRows, error: statusError } = await supabase
    .from("ref.status_codes")
    .select("id,code,is_final")
    .in("id", [oldStatusId, input.new_status_id]);

  if (statusError) {
    console.error("Failed to load status workflow metadata", statusError.message);
    return { ok: false, error: statusError.message };
  }

  const statusCodeById = new Map(
    ((statusRows ?? []) as Array<{ id: string; code: string | null }>).map(
      (row) => [row.id, row.code],
    ),
  );
  const statusIsFinalById = new Map(
    (
      (statusRows ?? []) as Array<{
        id: string;
        is_final: boolean | null;
      }>
    ).map((row) => [row.id, row.is_final]),
  );

  const oldStatusCode = statusCodeById.get(oldStatusId);
  const newStatusCode = statusCodeById.get(input.new_status_id);
  const oldStatusIsFinal = statusIsFinalById.get(oldStatusId);

  if (oldStatusCode === undefined || newStatusCode === undefined) {
    throw new Error("Invalid status transition: unknown status code.");
  }

  if (oldStatusCode === null || newStatusCode === null) {
    throw new Error(
      "Invalid status transition: status code is not configured.",
    );
  }

  if (oldStatusIsFinal === true) {
    throw new Error(
      `Invalid status transition: current status ${oldStatusCode} is final.`,
    );
  }

  const allowedNextStatuses = getAllowedNextStatuses(oldStatusCode);
  if (!allowedNextStatuses.includes(newStatusCode)) {
    throw new Error(
      `Invalid status transition: ${oldStatusCode} -> ${newStatusCode} is not allowed.`,
    );
  }

  const { error: updateError } = await supabase
    .from("capa.capa_actions")
    .update({ status_id: input.new_status_id })
    .eq("id", input.capa_action_id)
    .eq("organization_id", actor.organizationId);

  if (updateError) {
    console.error("Failed to update CAPA action status", updateError.message);
    return { ok: false, error: updateError.message };
  }

  const { error: historyError } = await supabase
    .from("capa.capa_action_status_history")
    .insert({
      capa_action_id: input.capa_action_id,
      old_status_id: oldStatusId,
      new_status_id: input.new_status_id,
      changed_by_user_id: actor.userId,
      organization_id: actor.organizationId,
    });

  if (historyError) {
    console.error(
      "Failed to insert CAPA action status history",
      historyError.message,
    );
    return { ok: false, error: historyError.message };
  }

  if (actionOwnerUserId) {
    await notifyUser(supabase, {
      user_id: actionOwnerUserId,
      title: "Action status updated",
      message: `Action status changed: ${oldStatusCode} -> ${newStatusCode}.`,
      event_type: "ACTION_STATUS_CHANGED",
    });
  }

  const { data: allActionStatusesData, error: allActionsError } = await supabase
    .from("capa.capa_actions")
    .select("status_id")
    .eq("organization_id", actor.organizationId)
    .eq("capa_record_id", capaRecordId);

  if (allActionsError) {
    console.error(
      "Failed to load CAPA actions for auto status transition",
      allActionsError.message,
    );
    return { ok: false, error: allActionsError.message };
  }

  const allActionStatusIds = (
    (allActionStatusesData ?? []) as Array<{ status_id: string }>
  ).map((row) => row.status_id);

  if (allActionStatusIds.length === 0) {
    return { ok: true };
  }

  const uniqueActionStatusIds = Array.from(new Set(allActionStatusIds));
  const { data: actionStatusRows, error: actionStatusCodesError } = await supabase
    .from("ref.status_codes")
    .select("id,code")
    .in("id", uniqueActionStatusIds);

  if (actionStatusCodesError) {
    console.error(
      "Failed to load action status codes for auto transition",
      actionStatusCodesError.message,
    );
    return { ok: false, error: actionStatusCodesError.message };
  }

  const actionStatusCodeById = new Map(
    ((actionStatusRows ?? []) as Array<{ id: string; code: string | null }>).map(
      (row) => [row.id, row.code],
    ),
  );

  const allActionCodes = allActionStatusIds
    .map((id) => actionStatusCodeById.get(id))
    .filter((code): code is string => Boolean(code));

  if (allActionCodes.length !== allActionStatusIds.length) {
    return { ok: true };
  }

  const allCompleted = allActionCodes.every((code) => code === "COMPLETED");
  const allVerified = allActionCodes.every((code) => code === "VERIFIED");

  let targetCapaStatusCode: string | null = null;
  if (allVerified) {
    targetCapaStatusCode = "EFFECTIVENESS_REVIEW";
  } else if (allCompleted) {
    targetCapaStatusCode = "VERIFICATION";
  }

  if (!targetCapaStatusCode) {
    return { ok: true };
  }

  const { data: capaRecordData, error: capaRecordError } = await supabase
    .from("capa.capa_records")
    .select("status_id")
    .eq("organization_id", actor.organizationId)
    .eq("id", capaRecordId)
    .single();

  if (capaRecordError) {
    console.error("Failed to load CAPA record for auto transition", capaRecordError.message);
    return { ok: false, error: capaRecordError.message };
  }

  const capaCurrentStatusId = (capaRecordData as { status_id: string }).status_id;

  const [capaCurrentStatusResult, capaTargetStatusResult] = await Promise.all([
    supabase
      .from("ref.status_codes")
      .select("id,code,is_final")
      .eq("id", capaCurrentStatusId)
      .single(),
    supabase
      .from("ref.status_codes")
      .select("id,code,is_final")
      .eq("code", targetCapaStatusCode)
      .single(),
  ]);

  const capaStatusMetaError =
    capaCurrentStatusResult.error ?? capaTargetStatusResult.error;

  if (capaStatusMetaError) {
    console.error(
      "Failed to load CAPA status metadata for auto transition",
      capaStatusMetaError.message,
    );
    return { ok: false, error: capaStatusMetaError.message };
  }

  const currentCapaStatus = capaCurrentStatusResult.data as {
    id: string;
    code: string | null;
    is_final: boolean | null;
  };
  const targetCapaStatus = capaTargetStatusResult.data as {
    id: string;
    code: string | null;
    is_final: boolean | null;
  };

  if (!currentCapaStatus || !targetCapaStatus) {
    return { ok: true };
  }

  if (currentCapaStatus.id === targetCapaStatus.id) {
    return { ok: true };
  }

  if (currentCapaStatus.is_final === true) {
    return { ok: true };
  }

  const { error: capaUpdateError } = await supabase
    .from("capa.capa_records")
    .update({ status_id: targetCapaStatus.id })
    .eq("id", capaRecordId)
    .eq("organization_id", actor.organizationId);

  if (capaUpdateError) {
    console.error("Failed to auto-update CAPA status", capaUpdateError.message);
    return { ok: false, error: capaUpdateError.message };
  }

  const { error: capaHistoryError } = await supabase
    .from("capa.capa_status_history")
    .insert({
      capa_record_id: capaRecordId,
      old_status_id: currentCapaStatus.id,
      new_status_id: targetCapaStatus.id,
      changed_by_user_id: actor.userId,
      organization_id: actor.organizationId,
      note: `Auto-transitioned from actions: all actions ${allVerified ? "VERIFIED" : "COMPLETED"}.`,
    });

  if (capaHistoryError) {
    console.error(
      "Failed to insert CAPA status history for auto transition",
      capaHistoryError.message,
    );
    return { ok: false, error: capaHistoryError.message };
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
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor) return { ok: false, error: "Not authenticated" };
  if (!actor.organizationId) {
    return { ok: false, error: "Missing organization context" };
  }

  const { data: capaRow, error: capaReadError } = await supabase
    .from("capa.capa_records")
    .select("owner_user_id,closed_at,organization_id")
    .eq("id", id)
    .eq("organization_id", actor.organizationId)
    .single();

  if (capaReadError) {
    console.error("Failed to load CAPA for permission check", capaReadError.message);
    return { ok: false, error: capaReadError.message };
  }

  const ownerUserId = (capaRow as { owner_user_id: string | null }).owner_user_id;
  const existingClosedAt = (capaRow as { closed_at: string | null }).closed_at;
  const isQualityManager = actor.roleCodes.includes("QUALITY_MANAGER");
  const canEdit = isQualityManager || (ownerUserId !== null && ownerUserId === actor.userId);

  if (!canEdit) {
    return {
      ok: false,
      error: "Only CAPA owner or QUALITY_MANAGER can edit CAPA.",
    };
  }

  if (input.closed_at !== undefined) {
    const isClosingNow = input.closed_at !== null && existingClosedAt === null;
    if (isClosingNow && !isQualityManager) {
      return { ok: false, error: "Only QUALITY_MANAGER can close CAPA." };
    }
  }

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
    .from("capa.capa_records")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", actor.organizationId);

  if (error) {
    console.error("Failed to update CAPA record", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

