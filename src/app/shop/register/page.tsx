"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProgramBanner from "@/components/ProgramBanner";
import Button from "@/components/ui/Button";
import { getShopsAction, createShopAction, updateShopAction, ShopSummary } from "@/actions/shopActions";
import { ArrowLeft, Plus } from "lucide-react";

export default function ShopRegisterPage() {
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const data = await getShopsAction();
      setShops(data);
    } catch {
      // Build safe
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
      const res = await createShopAction(trimmed);
      if (!res.success) {
        setErrorMsg(res.error || "이미 등록된 플라워샵 이름입니다.");
        return;
      }
      setSuccessMsg(`"${trimmed}" 플라워샵이 추가되었습니다.`);
      setNewName("");
      fetchShops();
    } catch {
      setErrorMsg("이미 등록된 플라워샵 이름입니다.");
    }
  };

  const handleStartEdit = (shop: ShopSummary) => {
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
      const res = await updateShopAction(shopId, trimmed);
      if (!res.success) {
        setErrorMsg(res.error || "이미 등록된 플라워샵 이름입니다.");
        return;
      }
      setSuccessMsg("플라워샵명이 수정되었습니다.");
      setEditingShopId(null);
      setEditingName("");
      fetchShops();
    } catch {
      setErrorMsg("이미 등록된 플라워샵 이름입니다.");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* 최상단 공통 프로그램 배너 */}
      <ProgramBanner
        rightElement={
          <Link
            href="/"
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            메인으로 돌아가기
          </Link>
        }
      />

      <main className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* ‘플라워샵 등록 및 관리’ 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5">
          <h2 className="text-base font-bold text-[#0F172A]">플라워샵 등록 및 관리</h2>

          <form onSubmit={handleAddShop} className="space-y-3">
            <label className="block text-xs font-semibold text-[#0F172A]">
              새 플라워샵 이름 입력
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="플라워샵 이름 입력"
                className="flex-1 min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
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
            <p className="text-xs text-rose-500 font-medium text-center">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-xs text-[#059669] font-medium text-center">{successMsg}</p>
          )}
        </div>

        {/* 등록된 플라워샵 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#0F172A]">등록된 플라워샵 목록</h2>
          {loading ? (
            <p className="text-xs text-[#64748B] text-center py-6">로딩 중...</p>
          ) : shops.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">등록된 플라워샵이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3 shadow-sm"
                >
                  {editingShopId === shop.id ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-sm bg-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(shop.id)}
                          className="px-4 min-h-[42px] h-[42px] bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition"
                        >
                          수정 내용 저장
                        </button>
                        <button
                          onClick={() => setEditingShopId(null)}
                          className="px-4 min-h-[42px] h-[42px] bg-slate-200 text-[#0F172A] text-xs font-semibold rounded-xl hover:bg-slate-300 transition"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-sm text-[#0F172A]">{shop.name}</span>
                      <button
                        onClick={() => handleStartEdit(shop)}
                        className="px-4 min-h-[40px] h-[40px] border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-xl hover:bg-white transition"
                      >
                        이름 수정
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
