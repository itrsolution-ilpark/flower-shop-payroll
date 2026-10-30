"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Banner from "@/components/Banner";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import { getSystemAdminCountAction } from "@/actions/systemActions";
import { loginSystemAdminAction } from "@/actions/authActions";
import { ShieldCheck, UserPlus, ArrowLeft } from "lucide-react";

export default function SystemLoginPage() {
  const router = useRouter();
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [name, setName] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    getSystemAdminCountAction()
      .then((count) => {
        setAdminCount(count);
        if (count === 0) {
          router.replace("/system/setup");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("관리자 이름을 입력해주세요.");
      return;
    }
    if (pin.length !== 6) {
      setErrorMsg("시스템 관리자 비밀번호는 숫자 6자리여야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginSystemAdminAction(name, pin);
      if (!res.success) {
        setErrorMsg(res.error || "이름 또는 비밀번호를 확인해 주세요.");
        setSubmitting(false);
        return;
      }
      router.push("/system/dashboard");
    } catch {
      setErrorMsg("로그인 처리 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          시스템 관리자 계정 확인 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Banner
        rightElement={
          <Link
            href="/"
            className="px-3 min-h-[38px] h-[38px] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            메인으로
          </Link>
        }
      />

      <main className="max-w-md mx-auto w-full p-4 md:p-6 my-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">시스템 관리자 로그인</h2>
            <p className="text-xs text-slate-500">전체 플라워샵 및 시스템 관리를 위해 로그인하세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                관리자 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                autoFocus
              />
            </div>

            <PinInput
              label="비밀번호"
              value={pin}
              onChange={setPin}
              length={6}
            />

            {errorMsg && (
              <p className="text-xs text-rose-600 text-center font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {errorMsg}
              </p>
            )}

            <Button type="submit" variant="secondary" disabled={submitting}>
              {submitting ? "인증 중..." : "로그인"}
            </Button>
          </form>

          {/* 등록된 관리자가 0명일 경우 자동으로 최초 등록 화면 링크 표시 */}
          {adminCount === 0 && (
            <div className="pt-2 text-center">
              <Link
                href="/system/setup"
                className="text-xs text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                등록된 시스템 관리자가 없습니다. 최초 등록 바로가기
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
