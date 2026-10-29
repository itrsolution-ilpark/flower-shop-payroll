import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionData {
  role: "system_admin" | "shop_admin" | "employee";
  userId: string;
  name: string;
  shopId?: string;
}

const COOKIE_NAME = "flower_shop_session";

function getSecretKey(): Buffer {
  const rawSecret = process.env.APP_SESSION_SECRET || "default-flower-shop-secret-key-32-chars-long";
  return crypto.createHash("sha256").update(rawSecret).digest();
}

/**
 * 세션 암호화 및 서명 쿠키 생성
 */
export async function createSession(data: SessionData): Promise<void> {
  const key = getSecretKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const payload = JSON.stringify({ ...data, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 }); // 7일 유효
  let encrypted = cipher.update(payload, "utf8", "hex");
  encrypted += cipher.final("hex");

  const hmac = crypto.createHmac("sha256", key).update(`${iv.toString("hex")}:${encrypted}`).digest("hex");
  const cookieValue = `${iv.toString("hex")}.${encrypted}.${hmac}`;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * 세션 쿠키 읽기 및 복호화
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie?.value) return null;

    const parts = cookie.value.split(".");
    if (parts.length !== 3) return null;
    const [ivHex, encrypted, signature] = parts;

    const key = getSecretKey();
    const expectedSig = crypto.createHmac("sha256", key).update(`${ivHex}:${encrypted}`).digest("hex");
    if (signature !== expectedSig) return null;

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    const parsed = JSON.parse(decrypted);
    if (parsed.exp && parsed.exp < Date.now()) {
      return null;
    }
    return {
      role: parsed.role,
      userId: parsed.userId,
      name: parsed.name,
      shopId: parsed.shopId,
    };
  } catch {
    return null;
  }
}

/**
 * 세션 쿠키 제거 (로그아웃)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
