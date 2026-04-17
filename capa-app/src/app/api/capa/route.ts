import { createCapaRecord } from "@/services/capa-service";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    const capa_type_id = String(formData.get("capa_type_id") ?? "");
    const status_id = String(formData.get("status_id") ?? "");
    const priority_id_raw = String(formData.get("priority_id") ?? "");
    const department_id = String(formData.get("department_id") ?? "");
    const due_date_raw = String(formData.get("due_date") ?? "");

    const priority_id = priority_id_raw.trim() || undefined;
    const due_date = due_date_raw.trim() || undefined;

    console.log("CREATE CAPA INPUT:", {
      title,
      description,
      capa_type_id,
      status_id,
      priority_id,
      department_id,
      due_date,
    });

    const result = await createCapaRecord({
      title,
      description: description || "",
      capa_type_id,
      status_id,
      priority_id,
      department_id,
      due_date,
    });

    if (!result.ok) {
      console.error("CREATE CAPA FAILED:", result.error);

      return new Response(
        JSON.stringify({
          error: result.error || "Unknown error",
        }),
        { status: 500 }
      );
    }

    console.log("CREATE CAPA SUCCESS");

    return new Response("OK");
  } catch (e: any) {
    console.error("UNEXPECTED ERROR FULL:", e);

    return new Response(
      JSON.stringify({
        error: e?.message || e,
        details: e,
      }),
      { status: 500 }
    );
  }
}