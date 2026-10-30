"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Banner from "@/components/Banner";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import { getSystemAdminCountAction, registerInitialSystemAdminAction } from "@/actions/systemActions";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function SystemSetupPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [alreadyExists, setAlreadyExists] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    getSystemAdminCountAction()
      .then((count) => {
        if (count > 0) {
          setAlreadyExists(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("관리자 이름을 입력해주세요.");
      return;
    }
    if (pin.length !== 6) {
      setErrorMsg("비밀번호는 숫자 6자리여야 합니다.");
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerInitialSystemAdminAction(name, pin, confirmPin);
      if (!res.success) {
        setErrorMsg(res.error || "시스템 관리자 등록에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      router.push("/system/dashboard");
    } catch {
      setErrorMsg("처리 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          로딩 중...
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
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">시스템 관리자 최초 등록</h2>
            <p className="text-xs text-slate-500">
              최초 1인의 시스템 관리자 계정을 개설합니다. (숫자 6자리 비밀번호)
            </p>
          </div>

          {alreadyExists ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-center">
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                이미 시스템 관리자가 등록되어 있어 최초 등록 화면에 접근할 수 없습니다.
              </p>
              <Link
                href="/system/login"
                className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                시스템 관리자 로그인하기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="관리자 이름 입력"
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                  autoFocus
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
                <p className="text-xs text-rose-600 text-center font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {errorMsg}
                </p>
              )}

              <Button type="submit" variant="secondary" disabled={submitting}>
                {submitting ? "관리자 생성 중..." : "관리자 생성"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
