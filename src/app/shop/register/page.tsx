"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import { ArrowLeft, Plus } from "lucide-react";

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
      setErrorMsg("신규 플라워샵명을 입력해주세요.");
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
    <div className="flex flex-col flex-1 pt-6 px-4 pb-8 space-y-5">
      {/* 1. 상단 헤더: 플라워샵 등록 및 관리 뒤로가기 네비게이션 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-borderLine shadow-sm">
        <div>
          <h1 className="text-base font-bold text-textColor">플라워샵 등록 및 관리</h1>
          <p className="text-xs text-subText">시스템 관리자 전용 매장 개설 및 수정</p>
        </div>
        <Link
          href="/"
          className="px-3 min-h-[46px] h-[46px] border border-borderLine rounded-xl text-xs text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          메인으로 이동
        </Link>
      </div>

      {/* 2. 신규 등록 카드: 신규 플라워샵명 입력 인풋, 플라워샵 추가 버튼 */}
      <form onSubmit={handleAddShop} className="bg-white p-5 rounded-xl border border-borderLine shadow-sm space-y-3">
        <label className="block text-xs font-semibold text-textColor">
          신규 플라워샵명
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="신규 플라워샵명을 입력하세요"
            className="flex-1 min-h-[46px] h-[46px] px-3.5 border border-borderLine rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
          />
          <div className="sm:w-36">
            <Button type="submit" variant="primary" className="flex items-center gap-1">
              <Plus className="w-4 h-4" />
              플라워샵 추가
            </Button>
          </div>
        </div>
      </form>

      {errorMsg && (
        <p className="text-xs text-rose-500 text-center font-medium">
          {errorMsg}
        </p>
      )}
      {successMsg && (
        <p className="text-xs text-[#059669] text-center font-medium">
          {successMsg}
        </p>
      )}

      {/* 3. 등록 매장 목록 카드: 매장명 수정 인라인 인풋 및 수정 내용 저장 버튼 */}
      <div className="bg-white p-5 rounded-xl border border-borderLine shadow-sm flex-1 space-y-3">
        <h2 className="text-sm font-bold text-textColor">등록 매장 목록</h2>
        {loading ? (
          <p className="text-xs text-subText text-center py-6">로딩 중...</p>
        ) : shops.length === 0 ? (
          <p className="text-xs text-subText text-center py-6">등록된 플라워샵이 없습니다.</p>
        ) : (
          <div className="space-y-2.5">
            {shops.map((shop) => (
              <div
                key={shop.id}
                className="p-3.5 bg-slate-50/70 border border-borderLine rounded-xl flex items-center justify-between gap-2"
              >
                {editingShopId === shop.id ? (
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 min-h-[40px] h-[40px] px-3 border border-borderLine rounded-lg text-sm bg-white"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleSaveEdit(shop.id)}
                        className="px-3 min-h-[40px] h-[40px] bg-[#059669] text-white text-xs font-semibold rounded-lg hover:bg-[#047857] transition"
                      >
                        수정 내용 저장
                      </button>
                      <button
                        onClick={() => setEditingShopId(null)}
                        className="px-3 min-h-[40px] h-[40px] bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300 transition"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-sm text-textColor">{shop.name}</span>
                    <button
                      onClick={() => handleStartEdit(shop)}
                      className="px-3 min-h-[38px] h-[38px] border border-borderLine text-slate-700 text-xs rounded-lg hover:bg-white transition"
                    >
                      매장명 수정
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
