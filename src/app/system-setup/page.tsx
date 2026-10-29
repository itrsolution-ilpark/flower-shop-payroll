"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProgramBanner from "@/components/ProgramBanner";
import SecretField from "@/components/SecretField";
import Button from "@/components/ui/Button";
import {
  getSystemAdminCountAction,
  registerSystemAdminAction,
  loginSystemAdminAction,
} from "@/actions/systemAdminActions";

export default function SystemSetupPage() {
  const router = useRouter();
  const [isInitialSetup, setIsInitialSetup] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [confirmSecret, setConfirmSecret] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const count = await getSystemAdminCountAction();
      setIsInitialSetup(count === 0);
    } catch {
      setIsInitialSetup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("이름을 입력해주세요.");
      return;
    }

    if (secret.length !== 4) {
      setErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      if (isInitialSetup) {
        if (secret !== confirmSecret) {
          setErrorMsg("비밀 확인이 일치하지 않습니다.");
          setSubmitting(false);
          return;
        }

        const res = await registerSystemAdminAction(name, secret, confirmSecret);
        if (!res.success) {
          setErrorMsg(res.error || "시스템 관리자 등록에 실패했습니다.");
          setSubmitting(false);
          return;
        }

        router.push("/shop/register");
      } else {
        const res = await loginSystemAdminAction(name, secret);
        if (!res.success) {
          setErrorMsg(res.error || "이름 또는 비밀을 확인해 주세요.");
          setSubmitting(false);
          return;
        }

        router.push("/shop/register");
      }
    } catch {
      setErrorMsg("처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <ProgramBanner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-[#64748B]">
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* 최상단 공통 프로그램 배너 */}
      <ProgramBanner />

      <main className="max-w-md mx-auto w-full p-4 md:p-6 space-y-6 my-auto">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-[#0F172A]">시스템 관리자 등록 및 로그인</h2>
            <p className="text-xs text-[#64748B]">
              {isInitialSetup
                ? "시스템 관리자가 0명입니다. 최초 계정을 생성하세요."
                : "이미 등록된 관리자가 있습니다. 로그인하세요."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="관리자 이름"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white text-sm"
              />
            </div>

            <SecretField
              label="비밀"
              value={secret}
              onChange={setSecret}
            />

            {isInitialSetup && (
              <SecretField
                label="비밀 확인"
                value={confirmSecret}
                onChange={setConfirmSecret}
              />
            )}

            {errorMsg && (
              <p className="text-xs text-rose-500 text-center font-medium">
                {errorMsg}
              </p>
            )}

            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting
                  ? "처리 중..."
                  : isInitialSetup
                  ? "시스템 관리자 생성"
                  : "로그인"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
