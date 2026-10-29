"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

export default function AdminSetupPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [adminExists, setAdminExists] = useState<boolean>(false);

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id")
        .eq("is_admin", true)
        .limit(1);

      if (error) {
        console.error("관리자 확인 오류:", error);
      } else if (data && data.length > 0) {
        setAdminExists(true);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("관리자 이름을 입력해주세요.");
      return;
    }

    if (!pinCode || pinCode.length !== 4 || isNaN(Number(pinCode))) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("staff").insert([
        {
          name: name.trim(),
          pin_code: pinCode,
          hourly_wage: 0,
          is_admin: true,
          status: "active",
        },
      ]);

      if (error) {
        console.error("관리자 등록 오류:", error);
        setErrorMsg("관리자 등록 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      router.push("/");
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("관리자 등록 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center">로딩 중...</div>;
  }

  if (adminExists) {
    return (
      <div className="flex flex-col flex-1 p-6 justify-center items-center text-center">
        <h1 className="text-xl font-bold text-primary mb-2">관리자가 이미 존재합니다</h1>
        <p className="text-sm text-gray-600 mb-6">최초 관리자 설정은 이미 완료되었습니다.</p>
        <Button variant="primary" onClick={() => router.push("/")}>
          로그인 화면으로 이동
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          최초 관리자 등록
        </h1>
        <p className="text-sm text-gray-600">
          시스템 최초 접속을 위한 관리자 계정을 생성합니다.
        </p>
      </div>

      <form onSubmit={handleSetupAdmin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            관리자 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="점장님"
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
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary">
          관리자 등록 완료
        </Button>
      </form>
    </div>
  );
}
