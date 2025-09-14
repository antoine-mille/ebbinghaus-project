"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect(
    `/login?message=${encodeURIComponent("Vérifie ton email pour confirmer.")}`
  );
}
