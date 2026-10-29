"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [hourlyWage, setHourlyWage] = useState<string>("10000");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("이름을 입력해주세요.");
      return;
    }

    if (!pinCode || pinCode.length !== 4 || isNaN(Number(pinCode))) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    const wageNum = parseInt(hourlyWage, 10);
    if (isNaN(wageNum) || wageNum <= 0) {
      setErrorMsg("올바른 시급을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("staff").insert([
        {
          name: name.trim(),
          pin_code: pinCode,
          hourly_wage: wageNum,
          is_admin: false,
        },
      ]);

      if (error) {
        console.error("회원가입 오류:", error);
        setErrorMsg("회원가입 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      router.push("/");
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("회원가입 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          직원 회원가입
        </h1>
        <p className="text-sm text-gray-600">
          정보를 입력하고 플라워샵 시스템에 가입하세요.
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
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

        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            시급 (원)
          </label>
          <input
            type="number"
            value={hourlyWage}
            onChange={(e) => setHourlyWage(e.target.value)}
            placeholder="10000"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "가입 중..." : "가입 완료"}
        </Button>

        <div className="text-center pt-4">
          <a
            href="/"
            className="text-sm text-primary hover:underline font-medium"
          >
            이미 계정이 있으신가요? 로그인하기
          </a>
        </div>
      </form>
    </div>
  );
}
