"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";

export default function SystemSetupPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [confirmPinCode, setConfirmPinCode] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkSystemAdmin();
  }, []);

  const checkSystemAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from("system_admins")
        .select("id");

      if (error) {
        console.error("시스템 관리자 조회 오류:", error);
      }

      if (data && data.length > 0) {
        router.push("/");
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("예외 발생:", err);
      setLoading(false);
    }
  };

  const handleRegisterSystemAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("관리자 이름을 입력해주세요.");
      return;
    }

    if (!pinCode || pinCode.length !== 4 || isNaN(Number(pinCode))) {
      setErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    if (pinCode !== confirmPinCode) {
      setErrorMsg("비밀 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("system_admins").insert([
        {
          name: name.trim(),
          pin_code: pinCode,
        },
      ]);

      if (error) {
        console.error("시스템 관리자 등록 오류:", error);
        setErrorMsg("시스템 관리자 등록 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("system_admin_auth", JSON.stringify({ name: name.trim() }));
      alert("시스템 관리자 생성이 완료되었습니다.");
      router.push("/");
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">
        로딩 중...
      </div>
    );
  }

  const isFormValid =
    name.trim().length > 0 &&
    /^[0-9]{4}$/.test(pinCode) &&
    pinCode === confirmPinCode;

  return (
    <div className="flex flex-col flex-1">
      {/* 1. 상단 배너: '플라워샵 근무 관리' 프로그램 배너 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
      </header>

      <div className="max-w-md mx-auto w-full p-4 md:p-6 space-y-6 my-auto">
        {/* ‘시스템 관리자 등록 및 로그인’ 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-[#0F172A]">시스템 관리자 등록 및 로그인</h2>
            <p className="text-xs text-[#64748B]">
              시스템 관리자가 0명입니다. 최초 계정을 생성하세요.
            </p>
          </div>

          <form onSubmit={handleRegisterSystemAdmin} className="space-y-4">
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

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                비밀
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="••••"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] text-center tracking-widest text-lg font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                비밀 확인
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPinCode}
                onChange={(e) => setConfirmPinCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="••••"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] text-center tracking-widest text-lg font-bold bg-white"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 text-center font-medium">
                {errorMsg}
              </p>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={!isFormValid || loading}
              >
                시스템 관리자 생성
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
