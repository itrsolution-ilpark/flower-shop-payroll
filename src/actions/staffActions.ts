"use server";

import { getServiceSupabase } from "@/lib/supabase-server";
import { hashPin, isValidPinFormat } from "@/lib/hash";
import { createSession, getSession } from "@/lib/session";
import { ActionResult } from "./systemAdminActions";

export interface StaffListItem {
  id: string;
  shop_id: string;
  name: string;
  status: "pending" | "active" | "resigned";
  created_at: string;
  resigned_at?: string | null;
  compensation?: {
    pay_type: "hourly" | "monthly";
    amount_krw: number;
    effective_from: string;
  }[];
}

/**
 * F-05: 플라워샵 직원 가입 신청 (pending 상태 등록)
 */
export async function applyStaffAction(
  shopId: string,
  name: string,
  pin: string,
  confirmPin: string
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "직원 이름을 입력해주세요." };
  }
  if (!isValidPinFormat(pin)) {
    return { success: false, error: "비밀은 숫자 4자리여야 합니다." };
  }
  if (pin !== confirmPin) {
    return { success: false, error: "비밀 확인이 일치하지 않습니다." };
  }

  const supabase = getServiceSupabase();

  // 해당 플라워샵 내 이름 중복 체크
  const { data: existing } = await supabase
    .from("staff")
    .select("id")
    .eq("shop_id", shopId)
    .eq("name", trimmedName)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "이미 등록된 이름입니다." };
  }

  const pinHash = hashPin(pin);
  const { data, error } = await supabase
    .from("staff")
    .insert([
      {
        shop_id: shopId,
        name: trimmedName,
        pin_hash: pinHash,
        status: "pending",
      },
    ])
    .select("id, name")
    .single();

  if (error || !data) {
    return { success: false, error: "이미 등록된 이름입니다." };
  }

  return { success: true, data };
}

/**
 * F-07: 직원 로그인 목록 조회 (대표 관리자는 staff에 없으며 active 상태만 반환)
 */
export async function getActiveStaffListAction(shopId: string): Promise<{ id: string; name: string }[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("staff")
    .select("id, name")
    .eq("shop_id", shopId)
    .eq("status", "active")
    .order("name", { ascending: true });

  return data || [];
}

/**
 * F-07: 직원 로그인
 */
export async function loginStaffAction(
  shopId: string,
  name: string,
  pin: string
): Promise<ActionResult<{ id: string; name: string; shopId: string }>> {
  const trimmedName = name.trim();
  if (!trimmedName || !isValidPinFormat(pin)) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  const supabase = getServiceSupabase();
  const pinHash = hashPin(pin);

  const { data, error } = await supabase
    .from("staff")
    .select("id, name, status, shop_id")
    .eq("shop_id", shopId)
    .eq("name", trimmedName)
    .eq("pin_hash", pinHash)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  if (data.status !== "active") {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  await createSession({
    role: "employee",
    userId: data.id,
    name: data.name,
    shopId: data.shop_id,
  });

  return { success: true, data: { id: data.id, name: data.name, shopId: data.shop_id } };
}

/**
 * 직원 본인 비밀 변경
 */
export async function changeStaffSecretAction(
  currentPin: string,
  newPin: string,
  confirmNewPin: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "employee") {
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (!isValidPinFormat(currentPin)) {
    return { success: false, error: "현재 비밀을 확인해 주세요." };
  }
  if (!isValidPinFormat(newPin)) {
    return { success: false, error: "새 비밀은 숫자 4자리여야 합니다." };
  }
  if (newPin !== confirmNewPin) {
    return { success: false, error: "비밀 확인이 일치하지 않습니다." };
  }

  const supabase = getServiceSupabase();
  const currentHash = hashPin(currentPin);

  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("id", session.userId)
    .eq("pin_hash", currentHash)
    .maybeSingle();

  if (!staff) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  const newHash = hashPin(newPin);
  const { error } = await supabase
    .from("staff")
    .update({ pin_hash: newHash })
    .eq("id", session.userId);

  if (error) {
    return { success: false, error: "비밀 변경에 실패했습니다." };
  }

  return { success: true };
}

/**
 * F-06: 관리자 직원 승인 및 급여 조건 설정
 */
export async function approveStaffAction(
  staffId: string,
  payType: "hourly" | "monthly",
  amountKrw: number,
  effectiveFrom: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "shop_admin") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }

  if (!amountKrw || amountKrw <= 0) {
    return { success: false, error: "유효한 급여 금액을 입력해주세요." };
  }
  if (!effectiveFrom) {
    return { success: false, error: "적용 시작일을 선택해주세요." };
  }

  const supabase = getServiceSupabase();

  // 직원 active 상태로 변경
  const { error: staffErr } = await supabase
    .from("staff")
    .update({ status: "active" })
    .eq("id", staffId)
    .eq("shop_id", session.shopId);

  if (staffErr) {
    return { success: false, error: "직원 승인 처리에 실패했습니다." };
  }

  // 급여 조건 등록/업데이트
  const { error: compErr } = await supabase.from("compensation").upsert(
    [
      {
        staff_id: staffId,
        pay_type: payType,
        amount_krw: amountKrw,
        effective_from: effectiveFrom,
      },
    ],
    { onConflict: "staff_id,effective_from" }
  );

  if (compErr) {
    return { success: false, error: "급여 조건 저장 중 오류가 발생했습니다." };
  }

  return { success: true };
}

/**
 * F-06: 직원 재직/퇴사 상태 변경
 */
export async function updateStaffStatusAction(
  staffId: string,
  newStatus: "active" | "resigned"
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "shop_admin") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }

  const supabase = getServiceSupabase();
  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "resigned") {
    updateData.resigned_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("staff")
    .update(updateData)
    .eq("id", staffId)
    .eq("shop_id", session.shopId);

  if (error) {
    return { success: false, error: "직원 상태 변경에 실패했습니다." };
  }

  return { success: true };
}

/**
 * 관리자 대시보드용 직원 목록 및 급여 이력 조회
 */
export async function getShopStaffListAction(shopId: string): Promise<StaffListItem[]> {
  const supabase = getServiceSupabase();
  const { data: staffList } = await supabase
    .from("staff")
    .select("id, shop_id, name, status, created_at, resigned_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (!staffList || staffList.length === 0) return [];

  const staffIds = staffList.map((s) => s.id);
  const { data: compList } = await supabase
    .from("compensation")
    .select("staff_id, pay_type, amount_krw, effective_from")
    .in("staff_id", staffIds)
    .order("effective_from", { ascending: false });

  const compMap: Record<string, { pay_type: "hourly" | "monthly"; amount_krw: number; effective_from: string }[]> = {};
  (compList || []).forEach((c) => {
    if (!compMap[c.staff_id]) compMap[c.staff_id] = [];
    compMap[c.staff_id].push({
      pay_type: c.pay_type as "hourly" | "monthly",
      amount_krw: c.amount_krw,
      effective_from: c.effective_from,
    });
  });

  return staffList.map((st) => ({
    ...st,
    status: st.status as "pending" | "active" | "resigned",
    compensation: compMap[st.id] || [],
  }));
}
