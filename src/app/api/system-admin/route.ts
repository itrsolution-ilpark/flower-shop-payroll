import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPin, isValidPinFormat } from "@/lib/hash";

export async function POST(request: Request) {
  try {
    const { name, pin_code } = await request.json();
    if (!name || !pin_code || !isValidPinFormat(pin_code)) {
      return NextResponse.json(
        { error: "유효한 이름과 4자리 비밀을 입력해주세요." },
        { status: 400 }
      );
    }

    const checkRes = await query("SELECT id FROM system_admins LIMIT 1");
    if (checkRes.rows && checkRes.rows.length > 0) {
      return NextResponse.json(
        { error: "이미 시스템 관리자가 등록되어 있습니다." },
        { status: 400 }
      );
    }

    const pin_hash = hashPin(pin_code);
    const insertRes = await query(
      "INSERT INTO system_admins (name, pin_hash) VALUES ($1, $2) RETURNING id, name",
      [name.trim(), pin_hash]
    );

    return NextResponse.json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}
