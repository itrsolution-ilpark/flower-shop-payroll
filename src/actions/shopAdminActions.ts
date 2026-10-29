"use server";

import { getServiceSupabase } from "@/lib/supabase-server";
import { hashPin, isValidPinFormat } from "@/lib/hash";
import { createSession, getSession } from "@/lib/session";
import { ActionResult } from "./systemAdminActions";

export interface ShopAdminInfo {
  id: string;
  shop_id: string;
  name: string;
}

/**
 * 플라워샵별 관리자 조회
 */
export async function getShopAdminAction(shopId: string): Promise<ShopAdminInfo | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("shop_admins")
    .select("id, shop_id, name")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/**
 * F-04: 플라워샵별 관리자 최초 등록
 */
export async function registerShopAdminAction(
  shopId: string,
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

  // 이미 해당 플라워샵에 관리자가 있는지 확인
  const { data: existing } = await supabase
    .from("shop_admins")
    .select("id")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "이미 해당 플라워샵에 관리자가 존재합니다." };
  }

  const pinHash = hashPin(pin);
  const { data, error } = await supabase
    .from("shop_admins")
    .insert([
      {
        shop_id: shopId,
        name: trimmedName,
        pin_hash: pinHash,
      },
    ])
    .select("id, shop_id, name")
    .single();

  if (error || !data) {
    return { success: false, error: "관리자 등록 중 오류가 발생했습니다." };
  }

  await createSession({
    role: "shop_admin",
    userId: data.id,
    name: data.name,
    shopId: data.shop_id,
  });

  return { success: true, data };
}

/**
 * F-04: 플라워샵 관리자 로그인
 */
export async function loginShopAdminAction(
  shopId: string,
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
    .from("shop_admins")
    .select("id, shop_id, name")
    .eq("shop_id", shopId)
    .eq("name", trimmedName)
    .eq("pin_hash", pinHash)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  await createSession({
    role: "shop_admin",
    userId: data.id,
    name: data.name,
    shopId: data.shop_id,
  });

  return { success: true, data };
}

/**
 * F-04: 플라워샵 관리자 본인 정보 수정 (로그인 화면 또는 설정 화면에서 인증 후 이름, 비밀 수정)
 */
export async function updateShopAdminAction(
  shopId: string,
  currentPin: string,
  newName: string,
  newPin: string,
  confirmNewPin: string
): Promise<ActionResult> {
  if (!isValidPinFormat(currentPin)) {
    return { success: false, error: "현재 비밀을 올바르게 입력해주세요." };
  }
  const trimmedNewName = newName.trim();
  if (!trimmedNewName) {
    return { success: false, error: "새 관리자 이름을 입력해주세요." };
  }
  if (!isValidPinFormat(newPin)) {
    return { success: false, error: "새 비밀은 숫자 4자리여야 합니다." };
  }
  if (newPin !== confirmNewPin) {
    return { success: false, error: "비밀 확인이 일치하지 않습니다." };
  }

  const supabase = getServiceSupabase();
  const currentPinHash = hashPin(currentPin);

  // 현재 관리자 비밀 일치 확인
  const { data: admin, error: findError } = await supabase
    .from("shop_admins")
    .select("id")
    .eq("shop_id", shopId)
    .eq("pin_hash", currentPinHash)
    .maybeSingle();

  if (findError || !admin) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  const newPinHash = hashPin(newPin);
  const { error: updateError } = await supabase
    .from("shop_admins")
    .update({
      name: trimmedNewName,
      pin_hash: newPinHash,
    })
    .eq("id", admin.id);

  if (updateError) {
    return { success: false, error: "관리자 정보 수정 중 오류가 발생했습니다." };
  }

  // 세션 갱신
  await createSession({
    role: "shop_admin",
    userId: admin.id,
    name: trimmedNewName,
    shopId,
  });

  return { success: true };
}
