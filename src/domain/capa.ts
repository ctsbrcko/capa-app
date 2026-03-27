export type Id = string;

export type Timestamp = string;

export interface CapaRecord {
  id: Id;
  record_no: string;
  title: string;
  description: string | null;
  capa_type_id: Id | null;
  source_nonconformity_id: Id | null;
  status_id: Id;
  priority_id: Id | null;
  department_id: Id | null;
  location_id: Id | null;
  owner_user_id: Id | null;
  initiator_user_id: Id | null;
  assigned_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  root_cause_method_id: Id | null;
  root_cause_summary: string | null;
  correction_description: string | null;
  corrective_action_plan: string | null;
  preventive_action_plan: string | null;
  verification_required: boolean;
  effectiveness_review_required: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  closed_at: Timestamp | null;
}

export interface CapaAction {
  id: Id;
  capa_record_id: Id;
  action_no: number;
  action_type: string | null;
  title: string;
  description: string | null;
  owner_user_id: Id | null;
  status_id: Id;
  priority_id: Id | null;
  planned_start_date: string | null;
  due_date: string | null;
  completed_at: Timestamp | null;
  completion_note: string | null;
  sort_order: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CapaComment {
  id: Id;
  capa_record_id: Id;
  comment_text: string;
  created_by_user_id: Id;
  created_at: Timestamp;
}

export interface CapaStatusHistory {
  capa_record_id: Id;
  old_status_id: Id | null;
  new_status_id: Id;
  changed_by_user_id: Id;
  changed_at: Timestamp;
  note: string | null;
}

