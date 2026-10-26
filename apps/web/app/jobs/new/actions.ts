"use server";
// Creates a job from the /jobs/new form, following the server entry ritual
// in docs/specs/web.md.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUserId } from "@project/auth";
import { CreateJob, createJob } from "@project/domain";
import { mapError, type ErrorBody } from "../../../lib/errors";

// fieldErrors and values ride beside the error shape; values refill the form,
// which React resets after every action.
export type CreateState =
  | (ErrorBody & {
      fieldErrors?: Record<string, string[] | undefined>;
      values?: Record<string, string>;
    })
  | null;

export async function createJobAction(_: CreateState, form: FormData): Promise<CreateState> {
  // Identity first: a signed-out submit returns 401 UNAUTHENTICATED and writes nothing.
  let userId: string;
  try {
    userId = await currentUserId();
  } catch (e) {
    return mapError(e).body;
  }
  const values = {
    company: String(form.get("company") ?? ""),
    title: String(form.get("title") ?? ""),
    status: String(form.get("status") ?? ""),
    dateApplied: String(form.get("dateApplied") ?? ""),
  };
  const parsed = CreateJob.safeParse({
    company: values.company,
    title: values.title,
    status: values.status || undefined,
    dateApplied: values.dateApplied || undefined,
  });
  if (!parsed.success)
    return { ...mapError(parsed.error).body, fieldErrors: parsed.error.flatten().fieldErrors, values };
  try {
    await createJob(userId, parsed.data);
  } catch (e) {
    return { ...mapError(e).body, values };
  }
  revalidatePath("/jobs");
  redirect("/jobs"); // outside try — redirect throws
}
