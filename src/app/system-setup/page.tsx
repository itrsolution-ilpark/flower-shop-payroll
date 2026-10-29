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
      <div className="flex flex-col flex-1 p-6 justify-center text-center">
        로딩 중...
      </div>
    );
  }

  const isFormValid =
    name.trim().length > 0 &&
    /^[0-9]{4}$/.test(pinCode) &&
    pinCode === confirmPinCode;

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold text-primary mb-2">
          플라워샵 근무 관리 - 시스템 마스터 설정
        </h1>
        <p className="text-xs text-gray-600">
          시스템 관리자가 0명입니다. 최초 마스터 계정을 생성하세요.
        </p>
      </div>

      <form onSubmit={handleRegisterSystemAdmin} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            관리자 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="시스템 관리자 이름"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            PIN 번호(4자리 숫자)
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg font-bold bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            PIN 번호 확인(4자리 숫자)
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPinCode}
            onChange={(e) => setConfirmPinCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg font-bold bg-white"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={!isFormValid || loading}
        >
          [시스템 관리자 생성 및 시작]
        </Button>
      </form>
    </div>
  );
}
