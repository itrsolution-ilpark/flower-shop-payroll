"use server";

import { clearSession } from "@/lib/session";

export async function logoutAction(): Promise<void> {
  await clearSession();
}
