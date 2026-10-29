"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

function ShopRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("id");

  const [name, setName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);

  useEffect(() => {
    if (shopId) {
      setIsEdit(true);
      fetchShop(shopId);
    }
  }, [shopId]);

  const fetchShop = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("플라워샵 조회 오류:", error);
      } else {
        setName(data.name);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("플라워샵 이름을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      if (isEdit && shopId) {
        const { error } = await supabase
          .from("shops")
          .update({ name: name.trim() })
          .eq("id", shopId);

        if (error) {
          console.error("플라워샵 수정 오류:", error);
          setErrorMsg("플라워샵 수정 중 오류가 발생했습니다.");
          setLoading(false);
          return;
        }

        alert("플라워샵이 성공적으로 수정되었습니다.");
        router.push("/");
      } else {
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
      }
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          {isEdit ? "플라워샵 수정 화면" : "플라워샵 등록 및 수정 화면"}
        </h1>
        <p className="text-sm text-gray-600">
          {isEdit ? "플라워샵 정보를 수정합니다." : "새로운 플라워샵을 시스템에 등록합니다."}
        </p>
      </div>

      <form onSubmit={handleSaveShop} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            플라워샵명 입력 필드
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
          {loading ? "처리 중..." : isEdit ? "수정 완료" : "등록/수정 완료"}
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

export default function ShopRegisterPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-6 justify-center text-center">로딩 중...</div>}>
      <ShopRegisterContent />
    </Suspense>
  );
}
