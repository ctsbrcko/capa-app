import {
  getCapaTypeOptions,
  getDepartmentOptions,
  getPriorityOptions,
  getStatusOptions,
} from "@/services/capa-service";
import { NewCapaForm } from "./new-capa-form";

export default async function NewCapaPage() {
  const [capaTypeOptions, statusOptions, priorityOptions, departmentOptions] =
    await Promise.all([
      getCapaTypeOptions(),
      getStatusOptions(),
      getPriorityOptions(),
      getDepartmentOptions(),
    ]);

  return (
    <NewCapaForm
      capaTypeOptions={capaTypeOptions}
      statusOptions={statusOptions}
      priorityOptions={priorityOptions}
      departmentOptions={departmentOptions}
    />
  );
}
