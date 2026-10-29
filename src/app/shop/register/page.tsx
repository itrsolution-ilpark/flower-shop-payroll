"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";

interface Shop {
  id: string;
  name: string;
}

export default function ShopRegisterPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const auth = sessionStorage.getItem("system_admin_auth");
    if (!auth) {
      alert("시스템 관리자 인증이 필요합니다.");
      router.push("/");
      return;
    }
    fetchShops();
  }, [router]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("플라워샵 목록 조회 오류:", error);
      } else if (data) {
        setShops(data);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmed = newName.trim();
    if (!trimmed) {
      setErrorMsg("플라워샵명을 입력해주세요.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("shops")
        .insert([{ name: trimmed }])
        .select()
        .single();

      if (error || !data) {
        console.error("등록 오류:", error);
        setErrorMsg("이미 존재하는 플라워샵명이거나 등록 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg(`"${trimmed}" 플라워샵이 추가되었습니다.`);
      setNewName("");
      fetchShops();
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("플라워샵 추가 중 오류가 발생했습니다.");
    }
  };

  const handleStartEdit = (shop: Shop) => {
    setEditingShopId(shop.id);
    setEditingName(shop.name);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSaveEdit = async (shopId: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    const trimmed = editingName.trim();
    if (!trimmed) {
      setErrorMsg("수정할 플라워샵명을 입력해주세요.");
      return;
    }

    try {
      const { error } = await supabase
        .from("shops")
        .update({ name: trimmed })
        .eq("id", shopId);

      if (error) {
        console.error("수정 오류:", error);
        setErrorMsg("수정 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("플라워샵명이 수정되었습니다.");
      setEditingShopId(null);
      setEditingName("");
      fetchShops();
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("수정 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-primary">플라워샵 등록 및 관리</h1>
          <p className="text-xs text-gray-500">시스템 관리자 전용 플라워샵 개설 및 수정 화면</p>
        </div>
        <a
          href="/"
          className="text-xs text-primary font-semibold hover:underline"
        >
          메인으로
        </a>
      </div>

      <form onSubmit={handleAddShop} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 space-y-3">
        <label className="block text-xs font-semibold text-textColor">
          신규 플라워샵명
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="신규 플라워샵명 입력"
            className="flex-1 h-12 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          />
          <div className="w-24">
            <Button type="submit" variant="primary">
              [추가]
            </Button>
          </div>
        </div>
      </form>

      {errorMsg && (
        <p className="text-xs text-errorColor text-center font-medium mb-3">
          {errorMsg}
        </p>
      )}
      {successMsg && (
        <p className="text-xs text-emerald text-center font-medium mb-3">
          {successMsg}
        </p>
      )}

      <div className="flex-1">
        <h2 className="text-sm font-bold text-textColor mb-3">기등록된 플라워샵 리스트</h2>
        {loading ? (
          <p className="text-xs text-gray-500 text-center py-6">로딩 중...</p>
        ) : shops.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">등록된 플라워샵이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {shops.map((shop) => (
              <div
                key={shop.id}
                className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-2"
              >
                {editingShopId === shop.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 h-10 px-2 border border-gray-300 rounded-lg text-sm bg-white"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSaveEdit(shop.id)}
                        className="px-3 h-10 bg-emerald text-white text-xs font-semibold rounded-lg hover:bg-[#065F46]"
                      >
                        [수정 저장]
                      </button>
                      <button
                        onClick={() => setEditingShopId(null)}
                        className="px-2 h-10 bg-gray-200 text-textColor text-xs rounded-lg"
                      >
                        취소
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-sm text-textColor">{shop.name}</span>
                    <button
                      onClick={() => handleStartEdit(shop)}
                      className="px-3 h-9 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50"
                    >
                      수정
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
