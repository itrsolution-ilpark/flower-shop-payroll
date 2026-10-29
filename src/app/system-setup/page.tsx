"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

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
        // 이미 시스템 관리자가 존재하면 메인으로 이동
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
      setErrorMsg("시스템 관리자 이름을 입력해주세요.");
      return;
    }

    if (!pinCode || pinCode.length !== 4 || isNaN(Number(pinCode))) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    if (pinCode !== confirmPinCode) {
      setErrorMsg("PIN 번호가 일치하지 않습니다. (비밀번호 확인 불일치)");
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

      alert("시스템 관리자가 성공적으로 등록되었습니다. 플라워샵 등록 화면으로 이동합니다.");
      router.push("/shop/register");
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

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          시스템 관리자 최초 등록 화면
        </h1>
        <p className="text-sm text-gray-600">
          시스템에 등록된 관리자가 없습니다. 최초 1회 시스템 관리자를 등록하세요.
        </p>
      </div>

      <form onSubmit={handleRegisterSystemAdmin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            시스템 관리자 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="마스터 관리자"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            4자리 PIN 번호
          </label>
          <input
            type="password"
            maxLength={4}
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
            placeholder="••••"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            4자리 PIN 번호 확인 (재입력)
          </label>
          <input
            type="password"
            maxLength={4}
            value={confirmPinCode}
            onChange={(e) => setConfirmPinCode(e.target.value)}
            placeholder="••••"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg bg-white"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "등록 중..." : "등록 버튼"}
        </Button>
      </form>
    </div>
  );
}
