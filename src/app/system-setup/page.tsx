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
      setErrorMsg("PIN 번호는 4자리 숫자여야 합니다.");
      return;
    }

    if (pinCode !== confirmPinCode) {
      setErrorMsg("PIN 번호 확인이 일치하지 않습니다.");
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
      <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-subText">
        로딩 중...
      </div>
    );
  }

  const isFormValid =
    name.trim().length > 0 &&
    /^[0-9]{4}$/.test(pinCode) &&
    pinCode === confirmPinCode;

  return (
    <div className="flex flex-col flex-1 pt-6 px-4 pb-8 space-y-6">
      {/* 1. 상단 바: 시스템 마스터 설정 안내 배너 */}
      <div className="bg-[#1E293B] text-white p-5 rounded-xl shadow-sm text-center">
        <span className="inline-block px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-full mb-2">
          초기 설정
        </span>
        <h1 className="text-lg font-bold">
          플라워샵 근무 관리 - 시스템 마스터 설정
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          시스템 관리자가 0명입니다. 마스터 계정을 생성하여 시작하세요.
        </p>
      </div>

      {/* 2. 본문 카드: 관리자 이름 입력창, 4자리 PIN 입력창, 4자리 PIN 확인 입력창 */}
      <form onSubmit={handleRegisterSystemAdmin} className="bg-white p-6 rounded-xl border border-borderLine shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            관리자 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="시스템 관리자 이름"
            className="w-full min-h-[46px] h-[46px] px-3 border border-borderLine rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            4자리 PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
            className="w-full min-h-[46px] h-[46px] px-3 border border-borderLine rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] text-center tracking-widest text-lg font-bold bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            4자리 PIN 확인
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPinCode}
            onChange={(e) => setConfirmPinCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
            className="w-full min-h-[46px] h-[46px] px-3 border border-borderLine rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] text-center tracking-widest text-lg font-bold bg-white"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-500 text-center font-medium">
            {errorMsg}
          </p>
        )}

        {/* 3. 하단 액션: 시스템 관리자 생성 및 시작 버튼 */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!isFormValid || loading}
          >
            시스템 관리자 생성 및 시작
          </Button>
        </div>
      </form>
    </div>
  );
}
