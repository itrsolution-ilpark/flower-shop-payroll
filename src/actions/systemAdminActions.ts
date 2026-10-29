"use server";

import { getServiceSupabase } from "@/lib/supabase-server";
import { hashPin, isValidPinFormat } from "@/lib/hash";
import { createSession } from "@/lib/session";

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * 시스템 관리자 존재 여부 조회
 */
export async function getSystemAdminCountAction(): Promise<number> {
  const supabase = getServiceSupabase();
  const { count, error } = await supabase
    .from("system_admins")
    .select("id", { count: "exact", head: true });

  if (error) {
    return 0;
  }
  return count || 0;
}

/**
 * F-01: 시스템 관리자 최초 등록 (RLS 42501 차단 서버 액션)
 */
export async function registerSystemAdminAction(
  name: string,
  pin: string,
  confirmPin: string
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "관리자 이름을 입력해주세요." };
  }
  if (!isValidPinFormat(pin)) {
    return { success: false, error: "비밀은 숫자 4자리여야 합니다." };
  }
  if (pin !== confirmPin) {
    return { success: false, error: "비밀 확인이 일치하지 않습니다." };
  }

  const supabase = getServiceSupabase();

  // 관리자가 이미 있는지 확인 (한 명만 허용)
  const { data: existing } = await supabase.from("system_admins").select("id").limit(1);
  if (existing && existing.length > 0) {
    return { success: false, error: "이미 시스템 관리자가 존재합니다." };
  }

  const pinHash = hashPin(pin);
  const { data, error } = await supabase
    .from("system_admins")
    .insert([{ name: trimmedName, pin_hash: pinHash }])
    .select("id, name")
    .single();

  if (error || !data) {
    return { success: false, error: "시스템 관리자 등록에 실패했습니다." };
  }

  await createSession({
    role: "system_admin",
    userId: data.id,
    name: data.name,
  });

  return { success: true, data };
}

/**
 * F-01: 시스템 관리자 로그인
 */
export async function loginSystemAdminAction(
  name: string,
  pin: string
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName || !isValidPinFormat(pin)) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  const supabase = getServiceSupabase();
  const pinHash = hashPin(pin);

  const { data, error } = await supabase
    .from("system_admins")
    .select("id, name")
    .eq("name", trimmedName)
    .eq("pin_hash", pinHash)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  await createSession({
    role: "system_admin",
    userId: data.id,
    name: data.name,
  });

  return { success: true, data };
}
