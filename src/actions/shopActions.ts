"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ActionResult } from "./systemActions";

export interface ShopSummary {
  id: string;
  name: string;
  staffCount: number;
}

/**
 * 전체 플라워샵 목록 및 재직 직원 수 조회
 */
export async function getShopsAction(): Promise<ShopSummary[]> {
  try {
    const sql = `
      SELECT 
        s.id, 
        s.name, 
        COUNT(st.id) FILTER (WHERE st.status = 'active')::int AS "staffCount"
      FROM shops s
      LEFT JOIN staff st ON s.id = st.shop_id
      GROUP BY s.id, s.name
      ORDER BY s.name ASC
    `;
    const res = await query(sql);
    return (res.rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      staffCount: row.staffCount || 0,
    }));
  } catch {
    return [];
  }
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

  try {
    // 중복 검사
    const existing = await query("SELECT id FROM shops WHERE name = $1 LIMIT 1", [trimmed]);
    if (existing.rows && existing.rows.length > 0) {
      return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
    }

    const insertRes = await query(
      "INSERT INTO shops (name) VALUES ($1) RETURNING id, name",
      [trimmed]
    );

    const shop = insertRes.rows[0];
    if (!shop) {
      return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
    }

    return { success: true, data: shop };
  } catch {
    return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
  }
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

  try {
    // 이름 중복 검사 (본인 제외)
    const existing = await query(
      "SELECT id FROM shops WHERE name = $1 AND id <> $2 LIMIT 1",
      [trimmed, id]
    );

    if (existing.rows && existing.rows.length > 0) {
      return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
    }

    const updateRes = await query("UPDATE shops SET name = $1 WHERE id = $2", [trimmed, id]);
    if ((updateRes.rowCount ?? 0) === 0) {
      return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "이미 등록된 플라워샵 이름입니다." };
  }
}
