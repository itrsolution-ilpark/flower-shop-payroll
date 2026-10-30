"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Banner from "@/components/Banner";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import {
  getShopAdminsPageDataAction,
  addShopAdminAction,
  ShopAdminInfo,
} from "@/actions/shopAdminActions";
import { logoutAction } from "@/actions/authActions";
import { UserCheck, UserPlus, ArrowLeft, LogOut, Shield } from "lucide-react";

export default function ShopAdminsPage() {
  const router = useRouter();

  const [shopName, setShopName] = useState<string>("");
  const [currentAdminName, setCurrentAdminName] = useState<string>("");
  const [admins, setAdmins] = useState<ShopAdminInfo[]>([]);

  const [newAdminName, setNewAdminName] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const res = await getShopAdminsPageDataAction();
    if (!res.success || !res.data) {
      router.replace("/login");
      return;
    }

    setShopName(res.data.shopName);
    setCurrentAdminName(res.data.currentAdminName);
    setAdmins(res.data.admins);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!newAdminName.trim()) {
      setErrorMsg("추가 관리자 이름을 입력해주세요.");
      return;
    }
    if (pin.length !== 6) {
      setErrorMsg("관리자 비밀번호는 숫자 6자리여야 합니다.");
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await addShopAdminAction(newAdminName, pin, confirmPin);
      if (!res.success) {
        setErrorMsg(res.error || "추가 관리자 등록에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      setSuccessMsg(`'${newAdminName.trim()}' 관리자가 성공적으로 추가 등록되었습니다.`);
      setNewAdminName("");
      setPin("");
      setConfirmPin("");
      await loadData();
    } catch {
      setErrorMsg("처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          관리자 정보 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* 최상단 고정 헤더 배너 */}
      <Banner
        rightElement={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {shopName} | {currentAdminName} 님
            </span>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[38px] h-[38px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-6 space-y-6 pb-20">
        {/* 상단 타이틀 카드 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-1">
              <Shield className="w-3.5 h-3.5" />
              추가 관리자 관리
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">{shopName} 관리자 명단</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              소속 플라워샵의 추가 관리자를 등록 및 관리할 수 있습니다. (비밀번호 숫자 6자리)
            </p>
          </div>

          <Link
            href="/shop-admin/dashboard"
            className="self-start sm:self-auto px-3.5 min-h-[40px] h-[40px] bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            대시보드로 돌아가기
          </Link>
        </div>

        {/* 신규 추가 관리자 등록 폼 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">신규 추가 관리자 등록</h3>
          </div>

          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                관리자 이름
              </label>
              <input
                type="text"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="새 관리자 이름"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <PinInput
              label="6자리 비밀번호"
              value={pin}
              onChange={setPin}
              length={6}
            />

            <PinInput
              label="6자리 비밀번호 확인"
              value={confirmPin}
              onChange={setConfirmPin}
              length={6}
            />

            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-center">
                {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-center">
                {successMsg}
              </p>
            )}

            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "등록 중..." : "추가 관리자 등록하기"}
            </Button>
          </form>
        </div>

        {/* 등록된 관리자 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">등록된 관리자 목록</h3>
            </div>
            <span className="text-xs text-slate-500">총 {admins.length}명</span>
          </div>

          <div className="space-y-2">
            {admins.map((adm) => (
              <div
                key={adm.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{adm.name}</span>
                  {adm.name === currentAdminName && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                      나 (본인)
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">등록일: {adm.created_at}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 대시보드 돌아가기 링크 */}
        <div className="text-center pt-2">
          <Link
            href="/shop-admin/dashboard"
            className="text-xs text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
