"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

export default function ShopRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("플라워샵 이름을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("shops")
        .insert([{ name: name.trim() }])
        .select()
        .single();

      if (error || !data) {
        console.error("플라워샵 등록 오류:", error);
        setErrorMsg("플라워샵 등록 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      alert("플라워샵이 성공적으로 등록되었습니다. 해당 플라워샵의 관리자 계정을 설정해주세요.");
      router.push(`/admin/setup?shop_id=${data.id}`);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("플라워샵 등록 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">플라워샵 등록 화면</h1>
        <p className="text-sm text-gray-600">
          새로운 플라워샵을 시스템에 등록합니다.
        </p>
      </div>

      <form onSubmit={handleRegisterShop} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            플라워샵명
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="강남 플라워샵"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "등록 중..." : "등록 완료"}
        </Button>

        <div className="text-center pt-4">
          <a
            href="/"
            className="text-sm text-primary hover:underline font-medium"
          >
            돌아가기
          </a>
        </div>
      </form>
    </div>
  );
}
