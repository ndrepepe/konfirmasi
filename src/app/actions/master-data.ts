"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { customerDataSchema, salesSchema } from "@/lib/validators";

async function requireMasterAccess() {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");
  return profile;
}

export async function createSales(formData: FormData) {
  await requireMasterAccess();
  const parsed = salesSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();

  const { error } = await supabase.from("data_sales").insert(parsed);
  if (error) throw new Error(error.message);

  revalidatePath("/data-sales");
  redirect("/data-sales?created=1");
}

export async function createCustomerData(formData: FormData) {
  await requireMasterAccess();
  const parsed = customerDataSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();

  const { error } = await supabase.from("data_customers").insert(parsed);
  if (error) throw new Error(error.message);

  revalidatePath("/data-customer");
  redirect("/data-customer?created=1");
}
