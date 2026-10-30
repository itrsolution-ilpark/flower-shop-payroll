"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Banner from "@/components/Banner";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import { getActiveShopsAction, ActiveShopOption } from "@/actions/authActions";
import { registerInitialShopAdminAction } from "@/actions/shopAdminActions";
import { applyStaffAction } from "@/actions/staffActions";
import { ArrowLeft, UserPlus, ShieldPlus } from "lucide-react";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "admin" ? "admin" : "staff";
  const initialShopId = searchParams.get("shop_id") || "";

  const [activeTab, setActiveTab] = useState<"staff" | "admin">(initialType);
  const [shops, setShops] = useState<ActiveShopOption[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>(initialShopId);
  const [name, setName] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
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

  const selectedShop = shops.find((s) => s.id === selectedShopId);
  const hasAdmin = selectedShop ? selectedShop.adminCount > 0 : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedShopId) {
      setErrorMsg("플라워샵을 선택해주세요.");
      return;
    }
    if (!name.trim()) {
      setErrorMsg("이름을 입력해주세요.");
      return;
    }

    const expectedLength = activeTab === "admin" ? 6 : 4;
    if (pin.length !== expectedLength) {
      setErrorMsg(
        activeTab === "admin"
          ? "관리자 비밀번호는 숫자 6자리여야 합니다."
          : "직원 비밀번호는 숫자 4자리여야 합니다."
      );
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      if (activeTab === "staff") {
        if (!hasAdmin) {
          setErrorMsg("해당 플라워샵에 등록된 관리자가 없습니다. 관리자 개설이 먼저 필요합니다.");
          setSubmitting(false);
          return;
        }

        const res = await applyStaffAction(selectedShopId, name, pin, confirmPin);
        if (!res.success) {
          setErrorMsg(res.error || "가입 신청 중 오류가 발생했습니다.");
          setSubmitting(false);
          return;
        }

        setSuccessMsg("가입 신청이 완료되었습니다. 플라워샵 관리자의 승인을 기다려주세요.");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        const res = await registerInitialShopAdminAction(selectedShopId, name, pin, confirmPin);
        if (!res.success) {
          setErrorMsg(res.error || "관리자 개설에 실패했습니다.");
          setSubmitting(false);
          return;
        }

        setSuccessMsg("최초 관리자 개설이 완료되었습니다. 관리자 대시보드로 이동합니다.");
        setTimeout(() => router.push("/shop-admin/dashboard"), 1000);
      }
    } catch {
      setErrorMsg("처리 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  const switchTab = (tab: "staff" | "admin") => {
    setActiveTab(tab);
    setPin("");
    setConfirmPin("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  return (
    <div className="flex flex-col flex-1">
      <Banner
        rightElement={
          <Link
            href="/login"
            className="px-3 min-h-[38px] h-[38px] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            로그인으로
          </Link>
        }
      />

      <main className="max-w-md mx-auto w-full p-4 md:p-6 my-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-slate-900">신규 가입 신청 / 개설</h2>
            <p className="text-xs text-slate-500">원하시는 가입 유형을 선택하세요.</p>
          </div>

          {/* 신청 유형 선택 탭: '직원 가입 신청' / '플라워샵 최초 관리자 개설' */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => switchTab("staff")}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === "staff"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              직원 가입 신청 [4자리]
            </button>
            <button
              type="button"
              onClick={() => switchTab("admin")}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === "admin"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldPlus className="w-3.5 h-3.5" />
              최초 관리자 개설 [6자리]
            </button>
          </div>

          {/* 플라워샵 선택 드롭다운 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">플라워샵 선택</label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.adminCount > 0 ? `관리자 ${s.adminCount}명 등록됨` : "관리자 없음"})
                </option>
              ))}
            </select>
          </div>

          {/* 직원의 경우 관리자 미등록 안내 */}
          {activeTab === "staff" && selectedShop && !hasAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed font-medium">
              선택한 플라워샵에 등록된 관리자가 없습니다. 먼저 '최초 관리자 개설'을 진행해야 직원이 가입을 신청할 수 있습니다.
            </div>
          )}

          {/* 관리자의 경우 이미 관리자가 있는 경우 안내 */}
          {activeTab === "admin" && selectedShop && hasAdmin && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed font-medium">
              이미 해당 플라워샵에 관리자가 등록되어 있습니다. 추가 관리자는 기존 관리자가 로그인한 뒤 대시보드 내부에서만 등록할 수 있습니다.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                {activeTab === "admin" ? "관리자 이름" : "직원 이름"}
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
              label="비밀번호"
              value={pin}
              onChange={setPin}
              length={activeTab === "admin" ? 6 : 4}
            />

            <PinInput
              label="비밀번호 확인"
              value={confirmPin}
              onChange={setConfirmPin}
              length={activeTab === "admin" ? 6 : 4}
            />

            {errorMsg && (
              <p className="text-xs text-rose-600 text-center font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="text-xs text-emerald-700 text-center font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                {successMsg}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || (activeTab === "staff" && !hasAdmin) || (activeTab === "admin" && hasAdmin)}
            >
              {submitting
                ? "처리 중..."
                : activeTab === "admin"
                ? "최초 관리자 개설 완료"
                : "직원 가입 신청 완료"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
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
      <SignupContent />
    </Suspense>
  );
}
