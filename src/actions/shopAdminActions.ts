"use server";

import { query } from "@/lib/db";
import { hashPin, isValidPinFormat } from "@/lib/hash";
import { createSession } from "@/lib/session";
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
  try {
    const res = await query(
      "SELECT id, shop_id, name FROM shop_admins WHERE shop_id = $1 LIMIT 1",
      [shopId]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return res.rows[0];
  } catch {
    return null;
  }
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

  try {
    // 이미 해당 플라워샵에 관리자가 있는지 확인
    const existing = await query(
      "SELECT id FROM shop_admins WHERE shop_id = $1 LIMIT 1",
      [shopId]
    );
    if (existing.rows && existing.rows.length > 0) {
      return { success: false, error: "이미 해당 플라워샵에 관리자가 존재합니다." };
    }

    const pinHash = hashPin(pin);
    const insertRes = await query(
      "INSERT INTO shop_admins (shop_id, name, pin_hash) VALUES ($1, $2, $3) RETURNING id, shop_id, name",
      [shopId, trimmedName, pinHash]
    );

    const admin = insertRes.rows[0];
    if (!admin) {
      return { success: false, error: "관리자 등록 중 오류가 발생했습니다." };
    }

    await createSession({
      role: "shop_admin",
      userId: admin.id,
      name: admin.name,
      shopId: admin.shop_id,
    });

    return { success: true, data: admin };
  } catch {
    return { success: false, error: "관리자 등록 중 오류가 발생했습니다." };
  }
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

  try {
    const pinHash = hashPin(pin);
    const res = await query(
      "SELECT id, shop_id, name FROM shop_admins WHERE shop_id = $1 AND name = $2 AND pin_hash = $3 LIMIT 1",
      [shopId, trimmedName, pinHash]
    );

    const admin = res.rows[0];
    if (!admin) {
      return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
    }

    await createSession({
      role: "shop_admin",
      userId: admin.id,
      name: admin.name,
      shopId: admin.shop_id,
    });

    return { success: true, data: admin };
  } catch {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }
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

  try {
    const currentPinHash = hashPin(currentPin);
    const findRes = await query(
      "SELECT id FROM shop_admins WHERE shop_id = $1 AND pin_hash = $2 LIMIT 1",
      [shopId, currentPinHash]
    );

    const admin = findRes.rows[0];
    if (!admin) {
      return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
    }

    const newPinHash = hashPin(newPin);
    await query(
      "UPDATE shop_admins SET name = $1, pin_hash = $2 WHERE id = $3",
      [trimmedNewName, newPinHash, admin.id]
    );

    // 세션 갱신
    await createSession({
      role: "shop_admin",
      userId: admin.id,
      name: trimmedNewName,
      shopId,
    });

    return { success: true };
  } catch {
    return { success: false, error: "관리자 정보 수정 중 오류가 발생했습니다." };
  }
}
