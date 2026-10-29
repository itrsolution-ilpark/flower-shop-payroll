"use server";

import { getServiceSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { ActionResult } from "./systemAdminActions";

export interface ShopSummary {
  id: string;
  name: string;
  staffCount: number;
}

/**
 * 전체 플라워샵 목록 및 재직 직원 수 조회
 */
export async function getShopsAction(): Promise<ShopSummary[]> {
  const supabase = getServiceSupabase();
  const { data: shops, error: shopsErr } = await supabase
    .from("shops")
    .select("id, name")
    .order("name", { ascending: true });

  if (shopsErr || !shops) {
    return [];
  }

  // 각 플라워샵의 재직(active) 직원 수 조회 (대표 관리자는 staff에 없음)
  const { data: staffData } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("status", "active");

  const countMap: Record<string, number> = {};
  (staffData || []).forEach((row) => {
    countMap[row.shop_id] = (countMap[row.shop_id] || 0) + 1;
  });

  return shops.map((s) => ({
    id: s.id,
    name: s.name,
    staffCount: countMap[s.id] || 0,
  }));
}

/**
 * F-02: 신규 플라워샵 등록 (시스템 관리자 권한)
 */
export async function createShopAction(name: string): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await getSession();
  if (!session || session.role !== "system_admin") {
    return { success: false, error: "시스템 관리자 인증이 필요합니다." };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "플라워샵 이름을 입력해주세요." };
  }

  const supabase = getServiceSupabase();

  // 중복 검사
  const { data: existing } = await supabase
    .from("shops")
    .select("id")
    .eq("name", trimmed)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
  }

  const { data, error } = await supabase
    .from("shops")
    .insert([{ name: trimmed }])
    .select("id, name")
    .single();

  if (error || !data) {
    return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
  }

  return { success: true, data };
}

/**
 * F-02: 플라워샵 이름 수정
 */
export async function updateShopAction(id: string, newName: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "system_admin") {
    return { success: false, error: "시스템 관리자 인증이 필요합니다." };
  }

  const trimmed = newName.trim();
  if (!trimmed) {
    return { success: false, error: "플라워샵 이름을 입력해주세요." };
  }

  const supabase = getServiceSupabase();

  // 이름 중복 검사 (본인 제외)
  const { data: existing } = await supabase
    .from("shops")
    .select("id")
    .eq("name", trimmed)
    .neq("id", id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
  }

  const { error } = await supabase
    .from("shops")
    .update({ name: trimmed })
    .eq("id", id);

  if (error) {
    return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
  }

  return { success: true };
}
