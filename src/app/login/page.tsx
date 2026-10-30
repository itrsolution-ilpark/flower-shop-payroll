"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Banner from "@/components/Banner";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import { getActiveShopsAction, loginUserAction, ActiveShopOption } from "@/actions/authActions";
import { ShieldCheck, User, Store, LogIn } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdFromQuery = searchParams.get("shop_id") || "";

  const [shops, setShops] = useState<ActiveShopOption[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>(shopIdFromQuery);
  const [userType, setUserType] = useState<"admin" | "staff">("admin");
  const [name, setName] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    getActiveShopsAction()
      .then((data) => {
        setShops(data);
        if (!selectedShopId && data.length > 0) {
          setSelectedShopId(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedShopId) {
      setErrorMsg("로그인할 플라워샵을 선택해주세요.");
      return;
    }
    if (!name.trim()) {
      setErrorMsg("이름을 입력해주세요.");
      return;
    }

    const expectedLength = userType === "admin" ? 6 : 4;
    if (pin.length !== expectedLength) {
      setErrorMsg(
        userType === "admin"
          ? "관리자 비밀번호는 숫자 6자리여야 합니다."
          : "직원 비밀번호는 숫자 4자리여야 합니다."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginUserAction({
        shopId: selectedShopId,
        userType,
        name,
        pin,
      });

      if (!res.success) {
        setErrorMsg(res.error || "로그인에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      router.push(res.data?.redirectUrl || "/");
    } catch {
      setErrorMsg("로그인 처리 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  const handleTypeChange = (type: "admin" | "staff") => {
    setUserType(type);
    setPin("");
    setErrorMsg("");
  };

  return (
    <div className="flex flex-col flex-1">
      <Banner />

      <main className="max-w-md mx-auto w-full p-4 md:p-6 my-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-slate-900">통합 로그인</h2>
            <p className="text-xs text-slate-500">소속 플라워샵과 권한을 선택하여 로그인하세요.</p>
          </div>

          {/* 로그인 대상 플라워샵 선택 드롭다운 (활성화된 샵만 노출) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              로그인 대상 플라워샵 선택
            </label>
            <div className="relative">
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                disabled={loading || shops.length === 0}
                className="w-full min-h-[46px] h-[46px] pl-3.5 pr-8 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
              >
                {shops.length === 0 ? (
                  <option value="">등록된 활성 플라워샵이 없습니다</option>
                ) : (
                  shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (관리자 {s.adminCount}명)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 사용자 구분 탭 ('플라워샵 관리자' [6자리] / '직원' [4자리]) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange("admin")}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                userType === "admin"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              플라워샵 관리자 [6자리]
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("staff")}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                userType === "staff"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              직원 [4자리]
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                autoFocus
              />
            </div>

            <PinInput
              label={userType === "admin" ? "관리자 비밀번호" : "직원 비밀번호"}
              value={pin}
              onChange={setPin}
              length={userType === "admin" ? 6 : 4}
            />

            {errorMsg && (
              <p className="text-xs text-rose-600 text-center font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {errorMsg}
              </p>
            )}

            <Button type="submit" variant="primary" disabled={submitting || shops.length === 0}>
              {submitting ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          {/* 하단 링크: '플라워샵 직원 가입 신청' 및 '플라워샵 최초 관리자 개설' */}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-center text-xs">
            <Link
              href={`/signup?type=staff${selectedShopId ? `&shop_id=${selectedShopId}` : ""}`}
              className="text-emerald-700 font-semibold hover:underline"
            >
              플라워샵 직원 가입 신청
            </Link>
            <Link
              href={`/signup?type=admin${selectedShopId ? `&shop_id=${selectedShopId}` : ""}`}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              플라워샵 최초 관리자 개설
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1">
          <Banner />
          <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
            로딩 중...
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
