import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionPayload {
  userId: string;
  role: "system_admin" | "shop_admin" | "staff";
  shopId?: string;
  name: string;
}

const COOKIE_NAME = "flower_shop_session";
const SECRET = process.env.APP_SESSION_SECRET || "flower-shop-payroll-default-secure-secret-key-32chars";

function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(value);
  return `${value}.${hmac.digest("hex")}`;
}

function verify(signedValue: string): string | null {
  const lastDot = signedValue.lastIndexOf(".");
  if (lastDot === -1) return null;
  const val = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);

  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(val);
  const expectedSignature = hmac.digest("hex");

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return val;
  }
  return null;
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  const raw = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const signed = sign(raw);

  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie?.value) return null;

    const raw = verify(cookie.value);
    if (!raw) return null;

    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(decoded) as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
